'use server';

// 메시지·QR 검사 기록의 저장·메모 수정·삭제. 주요 기능 1·2가 함께 쓴다.
// 순서: 로그인 확인 → 입력 검증 → 내 자료인지(userId 조건) 확인.
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { analyzeMessage, analyzeQr } from '@/lib/scan/rules';
import {
  idSchema,
  memoSchema,
  messageScanSchema,
  qrScanSchema,
} from '@/lib/validation';
import {
  FAILED_RESULT,
  invalidResult,
  type ActionResult,
} from '@/lib/action-result';

const PATHS = { MESSAGE: '/check', QR: '/qr' } as const;

/** 메모·삭제는 어느 화면의 기록인지 따로 묻지 않고 두 화면을 함께 갱신한다. */
function revalidateScanPages() {
  revalidatePath(PATHS.MESSAGE);
  revalidatePath(PATHS.QR);
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

  const result = analyzeMessage(parsed.data.content);
  try {
    await getDb().scanRecord.create({
      data: {
        userId: user.id,
        kind: 'MESSAGE',
        source: parsed.data.source,
        content: parsed.data.content,
        riskLevel: result.riskLevel,
        reasons: result.reasons,
      },
    });
  } catch {
    console.error('[createMessageScan] insert failed');
    return FAILED_RESULT;
  }
  revalidatePath(PATHS.MESSAGE);
  return {
    ok: true,
    message: '검사를 마쳤습니다. 아래 기록에서 결과를 보세요.',
  };
}

export async function createQrScan(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = qrScanSchema.safeParse({ content: formData.get('content') });
  if (!parsed.success) return invalidResult(parsed.error);

  const result = analyzeQr(parsed.data.content);
  try {
    await getDb().scanRecord.create({
      data: {
        userId: user.id,
        kind: 'QR',
        source: 'QR',
        content: parsed.data.content,
        riskLevel: result.riskLevel,
        reasons: result.reasons,
      },
    });
  } catch {
    console.error('[createQrScan] insert failed');
    return FAILED_RESULT;
  }
  revalidatePath(PATHS.QR);
  return {
    ok: true,
    message: 'QR 검사를 마쳤습니다. 아래 기록에서 결과를 보세요.',
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
