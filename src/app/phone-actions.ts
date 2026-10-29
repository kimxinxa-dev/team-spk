'use server';

// 가상 휴대폰 안 '안심 지킴이' 앱이 부르는 서버 기능. 결과를 돌려줄 뿐 다른 화면으로 보내지 않는다.
// 순서: 로그인 확인 → 입력 검증 → 내 자료인지(userId 조건) 확인. 화면이 보낸 채점 결과는 믿지 않고 서버에서 다시 채점한다.
import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated_prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { signInCore, signOutCore, signUpCore } from '@/lib/auth-core';
import { getDb } from '@/lib/db';
import { getPersonalExamples, listContacts, listScans } from '@/lib/queries';
import { analyzeScan } from '@/lib/scan/analyze';
import {
  contactSchema,
  idSchema,
  messageScanSchema,
  qrScanSchema,
  verdictSchema,
} from '@/lib/validation';
import {
  FAILED_RESULT,
  invalidResult,
  type ActionResult,
} from '@/lib/action-result';
import type {
  AuthResult,
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
