'use server';

// 문자 지킴이(주요 기능 1): 메시지·QR·체험 문자 검사 저장, 정답 알려 주기, 메모 수정, 삭제.
// 순서: 로그인 확인 → 입력 검증 → 내 자료인지(userId 조건) 확인.
import { revalidatePath } from 'next/cache';
import { DEMO_SAMPLES } from '@/app/(app)/check/samples';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPersonalExamples } from '@/lib/queries';
import { analyzeScan } from '@/lib/scan/analyze';
import type { Risk } from '@/lib/scan/rules';
import {
  demoScanSchema,
  idSchema,
  memoSchema,
  messageScanSchema,
  qrScanSchema,
  verdictSchema,
} from '@/lib/validation';
import {
  FAILED_RESULT,
  invalidResult,
  type ActionResult,
} from '@/lib/action-result';

function revalidateScanPages() {
  revalidatePath('/check');
  revalidatePath('/home');
}

export async function createMessageScan(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = messageScanSchema.safeParse({
    content: formData.get('content'),
    source: formData.get('source'),
  });
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    const result = analyzeScan(
      'MESSAGE',
      parsed.data.content,
      await getPersonalExamples(user.id),
    );
    await getDb().scanRecord.create({
      data: {
        userId: user.id,
        kind: 'MESSAGE',
        source: parsed.data.source,
        content: parsed.data.content,
        riskLevel: result.riskLevel,
        score: result.score,
        reasons: result.reasons,
      },
    });
  } catch {
    console.error('[createMessageScan] insert failed');
    return FAILED_RESULT;
  }
  revalidateScanPages();
  return {
    ok: true,
    message: '검사를 마쳤습니다. 아래 기록에서 결과를 보세요.',
  };
}

/** 바로 결과 창에 띄우는 QR 검사의 결과 */
export type CheckResult =
  | { ok: true; riskLevel: Risk; reasons: string[] }
  | { ok: false; message: string };

/**
 * QR 검사(카메라·체험용 QR·직접 입력 공통): 주소는 열지 않고 판별해 내 기록으로 저장하고, 결과 창에 띄울 결과를 돌려준다.
 * 화면에서 보낸 내용도 서버에서 다시 검증한다.
 */
export async function createQrScan(input: unknown): Promise<CheckResult> {
  const user = await requireUser();
  const parsed = qrScanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? 'QR 코드를 검사하지 못했습니다.',
    };
  }

  try {
    const result = analyzeScan(
      'QR',
      parsed.data.content,
      await getPersonalExamples(user.id),
    );
    await getDb().scanRecord.create({
      data: {
        userId: user.id,
        kind: 'QR',
        source: 'QR',
        content: parsed.data.content,
        riskLevel: result.riskLevel,
        score: result.score,
        reasons: result.reasons,
      },
    });
    revalidateScanPages();
    return { ok: true, riskLevel: result.riskLevel, reasons: result.reasons };
  } catch {
    console.error('[createQrScan] insert failed');
    return {
      ok: false,
      message: '검사하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
    };
  }
}

export type DemoScanResult =
  | { ok: true; riskLevel: Risk; score: number; reasons: string[] }
  | { ok: false; message: string };

/**
 * 체험 문자: 가상 휴대폰에 도착한 체험용 문자를 채점해 경고 팝업에 쓸 결과를 돌려주고 기록에 저장한다.
 * 문자 내용은 서버의 체험 문자 목록에서 고르므로 화면이 보낸 글을 그대로 믿지 않는다.
 */
export async function createDemoScan(input: unknown): Promise<DemoScanResult> {
  const user = await requireUser();
  const parsed = demoScanSchema.safeParse(input);
  const sample = parsed.success
    ? DEMO_SAMPLES.find((s) => s.id === parsed.data.sampleId)
    : undefined;
  if (!sample) return { ok: false, message: '체험 문자를 다시 골라 주세요.' };

  try {
    const result = analyzeScan(
      'MESSAGE',
      sample.content,
      await getPersonalExamples(user.id),
    );
    await getDb().scanRecord.create({
      data: {
        userId: user.id,
        kind: 'MESSAGE',
        source: sample.app === '문자' ? 'SMS' : 'KAKAO',
        content: sample.content,
        riskLevel: result.riskLevel,
        score: result.score,
        reasons: result.reasons,
      },
    });
    revalidateScanPages();
    return { ok: true, ...result };
  } catch {
    console.error('[createDemoScan] insert failed');
    return { ok: false, message: FAILED_RESULT.message ?? '' };
  }
}

/** "사기 맞아요/아니에요"를 저장한다. 이 기록이 그 사람의 다음 검사를 맞춤 판단하는 학습 데이터가 된다. */
export async function updateScanVerdict(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = verdictSchema.safeParse({
    id: formData.get('id'),
    verdict: formData.get('verdict'),
  });
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    const { count } = await getDb().scanRecord.updateMany({
      where: { id: parsed.data.id, userId: user.id },
      data: {
        userVerdict:
          parsed.data.verdict === 'NONE' ? null : parsed.data.verdict,
      },
    });
    if (count === 0) return { ok: false, message: '기록을 찾을 수 없습니다.' };
  } catch {
    console.error('[updateScanVerdict] update failed');
    return FAILED_RESULT;
  }
  revalidateScanPages();
  return {
    ok: true,
    message: '알려 주셔서 고마워요. 다음 검사부터 반영할게요.',
  };
}

export async function updateScanMemo(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = memoSchema.safeParse({
    id: formData.get('id'),
    memo: formData.get('memo'),
  });
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    // userId 조건이 함께 있어 남의 기록은 0건으로 끝난다.
    const { count } = await getDb().scanRecord.updateMany({
      where: { id: parsed.data.id, userId: user.id },
      data: { memo: parsed.data.memo || null },
    });
    if (count === 0) return { ok: false, message: '기록을 찾을 수 없습니다.' };
  } catch {
    console.error('[updateScanMemo] update failed');
    return FAILED_RESULT;
  }
  revalidateScanPages();
  return { ok: true, message: '메모를 저장했습니다.' };
}

export async function deleteScan(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    const { count } = await getDb().scanRecord.deleteMany({
      where: { id: parsed.data.id, userId: user.id },
    });
    if (count === 0) return { ok: false, message: '기록을 찾을 수 없습니다.' };
  } catch {
    console.error('[deleteScan] delete failed');
    return FAILED_RESULT;
  }
  revalidateScanPages();
  return { ok: true, message: '기록을 지웠습니다.' };
}
