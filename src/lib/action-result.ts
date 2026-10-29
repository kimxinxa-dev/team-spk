import type { z } from 'zod';

/** Server Action이 화면에 돌려주는 결과. 오류 원문·내부 정보는 담지 않는다. */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export const INITIAL_RESULT: ActionResult = { ok: true };

/** Zod 검증 실패를 칸별 안내로 바꾼다(칸마다 첫 번째 안내만). */
export function invalidResult(error: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, message: '입력한 내용을 확인해 주세요.', fieldErrors };
}

export const FAILED_RESULT: ActionResult = {
  ok: false,
  message: '처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
};
