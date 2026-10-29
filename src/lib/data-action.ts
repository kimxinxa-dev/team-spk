import 'server-only';

import { z } from 'zod';
import { getCurrentUser, type SessionUser } from './auth';

/** 모든 Server Action이 화면에 돌려주는 결과 형식. 내부 오류 내용은 담지 않는다. */
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      expired?: boolean;
    };

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * 로그인 확인 → 입력 검증 → 처리 순서를 강제한다.
 * 로그인이 만료됐으면 expired로 알려 화면이 다시 로그인하도록 안내한다.
 */
export async function authedAction<S extends z.ZodType, T>(
  name: string,
  schema: S,
  input: unknown,
  run: (user: SessionUser, data: z.infer<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const user = await getCurrentUser();
  if (!user)
    return {
      ok: false,
      error: '로그인이 만료되었어요. 다시 로그인해 주세요.',
      expired: true,
    };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '입력한 내용을 다시 확인해 주세요.',
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  try {
    return { ok: true, data: await run(user, parsed.data) };
  } catch (e) {
    if (e instanceof NotFoundError)
      return {
        ok: false,
        error: '찾는 기록이 없어요. 이미 지워졌을 수 있어요.',
      };
    console.error(
      `[action:${name}] failed`,
      e instanceof Error ? e.name : 'unknown',
    );
    return {
      ok: false,
      error: '잠시 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.',
    };
  }
}

/** 다른 사람의 기록이거나 없는 기록일 때. 둘을 구분해 알려 주지 않는다. */
export class NotFoundError extends Error {
  name = 'NotFoundError';
}
