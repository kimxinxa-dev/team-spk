'use server';

// 가상 휴대폰 안 '안심 지킴이' 앱이 부르는 서버 기능. 결과를 돌려줄 뿐 다른 화면으로 보내지 않는다.
// 순서: 로그인 확인 → 입력 검증 → 내 자료인지(userId 조건) 확인. 화면이 보낸 채점 결과는 믿지 않고 서버에서 다시 채점한다.
import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated_prisma/client';
import { explainMessage, getAiEnv } from '@/lib/ai/explain';
import { getCurrentUser } from '@/lib/auth';
import { signInCore, signOutCore, signUpCore } from '@/lib/auth-core';
import { getDb } from '@/lib/db';
import { getPersonalExamples, listContacts, listScans } from '@/lib/queries';
import { analyzeScan } from '@/lib/scan/analyze';
import { analyzeMessageWithAi } from '@/lib/scan/llm';
import {
  contactSchema,
  idSchema,
  messageScanSchema,
  parseAiSummary,
  qrScanSchema,
  verdictSchema,
} from '@/lib/validation';
import {
  FAILED_RESULT,
  invalidResult,
  type ActionResult,
} from '@/lib/action-result';
import type { Analysis } from '@/lib/phone/engine';
import type {
  AuthResult,
  ExplainResult,
  GuardianContact,
  ScanSource,
  StoredScan,
} from '@/lib/phone/guardian-app';

function revalidateScanPages() {
  revalidatePath('/check');
  revalidatePath('/home');
}

export async function phoneSession(): Promise<string | null> {
  return (await getCurrentUser())?.email ?? null;
}

export async function phoneSignIn(input: unknown): Promise<AuthResult> {
  return signInCore(input);
}

export async function phoneSignUp(input: unknown): Promise<AuthResult> {
  return signUpCore(input);
}

export async function phoneSignOut() {
  await signOutCore();
}

export async function phoneListScans(): Promise<StoredScan[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await listScans(user.id);
  return rows.map((r) => ({
    id: r.id,
    source: r.source as ScanSource,
    content: r.content,
    result: { riskLevel: r.riskLevel, score: r.score, reasons: r.reasons },
    verdict:
      r.userVerdict === 'SCAM' || r.userVerdict === 'SAFE'
        ? r.userVerdict
        : null,
    ai: parseAiSummary(r.aiSummary),
  }));
}

/** 휴대폰에 온 문자·찍은 QR·붙여 넣은 문자를 서버에서 다시 채점해 저장하고 기록 id를 돌려준다. */
export async function phoneSaveScan(input: unknown): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const isQr =
    typeof input === 'object' &&
    input !== null &&
    (input as { source?: unknown }).source === 'QR';
  const parsed = isQr
    ? qrScanSchema
        .transform((d) => ({ ...d, source: 'QR' as const }))
        .safeParse(input)
    : messageScanSchema.safeParse(input);
  if (!parsed.success) return null;
  const { content, source } = parsed.data;

  try {
    const result = analyzeScan(
      isQr ? 'QR' : 'MESSAGE',
      content,
      await getPersonalExamples(user.id),
    );
    const row = await getDb().scanRecord.create({
      data: {
        userId: user.id,
        kind: isQr ? 'QR' : 'MESSAGE',
        source,
        content,
        riskLevel: result.riskLevel,
        score: result.score,
        reasons: result.reasons,
      },
      select: { id: true },
    });
    revalidateScanPages();
    return row.id;
  } catch {
    console.error('[phoneSaveScan] insert failed');
    return null;
  }
}

/**
 * 붙여 넣은 문자(주요 기능 3): 기존 판정에 외부 AI 판단을 더해 저장하고, 화면에 띄울 결과와 기록 id를 돌려준다.
 * 로그인한 사람만 AI를 부른다(API 사용량 보호). 실패하면 null — 화면이 기존 판정으로 보여 준다.
 */
export async function phoneAiScan(
  input: unknown,
): Promise<{ id: string | null; result: Analysis } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const parsed = messageScanSchema.safeParse({
    content: (input as { content?: unknown } | null)?.content,
    source: 'OTHER',
  });
  if (!parsed.success) return null;
  const { content } = parsed.data;

  try {
    const { aiUsed, ...result } = await analyzeMessageWithAi(
      content,
      await getPersonalExamples(user.id),
    );
    if (!aiUsed) return null;
    const row = await getDb()
      .scanRecord.create({
        data: {
          userId: user.id,
          kind: 'MESSAGE',
          source: 'OTHER',
          content,
          riskLevel: result.riskLevel,
          score: result.score,
          reasons: result.reasons,
        },
        select: { id: true },
      })
      .catch(() => {
        console.error('[phoneAiScan] insert failed');
        return null;
      });
    if (row) revalidateScanPages();
    return { id: row?.id ?? null, result };
  } catch {
    console.error('[phoneAiScan] failed');
    return null;
  }
}

/** 한 사람이 하루(24시간)에 받을 수 있는 Claude 설명 수 */
const AI_DAILY_LIMIT = 20;

/**
 * 붙여 넣은 문자 기록에 Claude 설명을 붙인다. 이미 설명이 있으면 다시 부르지 않고 저장된 것을 돌려준다.
 * 내 기록(userId 조건)·문자 기록만, 하루 횟수 제한, 응답 모양 검증 뒤 저장. 실패해도 앱 안 학습 AI 결과는 그대로 남는다.
 */
export async function phoneExplainScan(input: unknown): Promise<ExplainResult> {
  const user = await getCurrentUser();
  if (!user)
    return { ok: false, message: '로그인하면 AI 설명을 볼 수 있어요.' };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: '잘못된 요청이에요.' };
  if (!getAiEnv())
    return { ok: false, message: 'AI 설명 기능이 아직 설정되지 않았어요.' };

  try {
    const db = getDb();
    const scan = await db.scanRecord.findFirst({
      where: { id: parsed.data.id, userId: user.id, kind: 'MESSAGE' },
      select: {
        content: true,
        riskLevel: true,
        score: true,
        reasons: true,
        aiSummary: true,
      },
    });
    if (!scan) return { ok: false, message: '기록을 찾을 수 없어요.' };
    const saved = parseAiSummary(scan.aiSummary);
    if (saved) return { ok: true, explanation: saved };

    const usedToday = await db.scanRecord.count({
      where: {
        userId: user.id,
        aiSummary: { not: null },
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (usedToday >= AI_DAILY_LIMIT)
      return {
        ok: false,
        message: `AI 설명은 하루 ${AI_DAILY_LIMIT}번까지예요. 내일 다시 써 주세요.`,
      };

    const explanation = await explainMessage({
      ...scan,
      personal: await getPersonalExamples(user.id),
    });
    if (!explanation)
      return {
        ok: false,
        message:
          'AI 설명을 받지 못했어요. 위 판단 결과는 그대로 믿으셔도 돼요.',
      };

    // 설명이 비어 있을 때만 저장해 같은 기록에 두 번 저장하지 않는다.
    await db.scanRecord.updateMany({
      where: { id: parsed.data.id, userId: user.id, aiSummary: null },
      data: { aiSummary: JSON.stringify(explanation) },
    });
    revalidateScanPages();
    return { ok: true, explanation };
  } catch {
    console.error('[phoneExplainScan] failed');
    return {
      ok: false,
      message: 'AI 설명을 받지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    };
  }
}

/** "사기 맞아요/아니에요"(null이면 취소). 이 사람의 다음 검사를 맞춤 판단하는 학습 데이터가 된다. */
export async function phoneSetVerdict(input: {
  id: unknown;
  verdict: unknown;
}): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const parsed = verdictSchema.safeParse({
    id: input?.id,
    verdict: input?.verdict ?? 'NONE',
  });
  if (!parsed.success) return false;
  try {
    const { count } = await getDb().scanRecord.updateMany({
      where: { id: parsed.data.id, userId: user.id },
      data: {
        userVerdict:
          parsed.data.verdict === 'NONE' ? null : parsed.data.verdict,
      },
    });
    revalidateScanPages();
    return count > 0;
  } catch {
    console.error('[phoneSetVerdict] update failed');
    return false;
  }
}

export async function phoneDeleteScan(input: unknown): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return false;
  try {
    // userId 조건이 함께 있어 남의 기록은 0건으로 끝난다.
    const { count } = await getDb().scanRecord.deleteMany({
      where: { id: parsed.data.id, userId: user.id },
    });
    revalidateScanPages();
    return count > 0;
  } catch {
    console.error('[phoneDeleteScan] delete failed');
    return false;
  }
}

/** 내 검사 기록을 모두 지운다. userId 조건으로 내 기록만 지운다. */
export async function phoneDeleteAllScans(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  try {
    await getDb().scanRecord.deleteMany({ where: { userId: user.id } });
    revalidateScanPages();
    return true;
  } catch {
    console.error('[phoneDeleteAllScans] delete failed');
    return false;
  }
}

export async function phoneListContacts(): Promise<GuardianContact[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return listContacts(user.id);
}

export async function phoneAddContact(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: '먼저 로그인해 주세요.' };
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  try {
    await getDb().contact.create({
      data: { userId: user.id, ...parsed.data },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      return {
        ok: false,
        message: '이미 등록한 전화번호입니다.',
        fieldErrors: { phone: '이미 등록한 전화번호입니다.' },
      };
    console.error('[phoneAddContact] insert failed');
    return FAILED_RESULT;
  }
  revalidatePath('/contacts');
  return { ok: true };
}

export async function phoneDeleteContact(input: unknown): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return false;
  try {
    const { count } = await getDb().contact.deleteMany({
      where: { id: parsed.data.id, userId: user.id },
    });
    revalidatePath('/contacts');
    return count > 0;
  } catch {
    console.error('[phoneDeleteContact] delete failed');
    return false;
  }
}
