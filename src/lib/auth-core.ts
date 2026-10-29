import 'server-only';

// 로그인·가입의 실제 처리. 로그인 화면(/login)과 가상 휴대폰 안 로그인이 함께 쓴다.
import { getDb } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { authSchema, signUpSchema } from '@/lib/validation';
import { FAILED_RESULT, invalidResult } from '@/lib/action-result';

/** 성공하면 로그인한 이메일. 가입 확인 메일이 필요하면 email 없이 안내만 돌려준다. */
export type AuthOutcome =
  | { ok: true; email: string | null; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const NOT_CONFIGURED: AuthOutcome = {
  ok: false,
  message: '로그인 설정이 아직 되어 있지 않습니다. 운영자에게 문의해 주세요.',
};

const FAILED = FAILED_RESULT as Extract<AuthOutcome, { ok: false }>;

/** Supabase Auth 사용자와 같은 id로 앱 회원 행을 만든다(이미 있으면 그대로). */
async function ensureAppUser(id: string, email: string) {
  await getDb().user.upsert({
    where: { id },
    create: { id, email },
    update: {},
  });
}

export async function signInCore(input: unknown): Promise<AuthOutcome> {
  const parsed = authSchema.safeParse(input);
  if (!parsed.success)
    return invalidResult(parsed.error) as Extract<AuthOutcome, { ok: false }>;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { ok: false, message: '이메일 또는 비밀번호가 맞지 않습니다.' };
  }

  try {
    await ensureAppUser(data.user.id, parsed.data.email);
  } catch {
    console.error('[signIn] app user upsert failed');
    return FAILED;
  }
  return { ok: true, email: parsed.data.email };
}

export async function signUpCore(input: unknown): Promise<AuthOutcome> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success)
    return invalidResult(parsed.error) as Extract<AuthOutcome, { ok: false }>;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    // 이미 가입한 이메일인지 등 자세한 이유는 알려 주지 않는다(계정 존재 여부 노출 방지).
    return { ok: false, message: '가입하지 못했습니다. 입력을 확인해 주세요.' };
  }
  if (!data.session) {
    // Supabase에서 이메일 확인이 켜져 있으면 세션이 없다. 심사용 계정은 바로 로그인돼야 하므로 꺼 둔다.
    return {
      ok: true,
      email: null,
      message:
        '가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.',
    };
  }

  try {
    await ensureAppUser(data.user.id, parsed.data.email);
  } catch {
    console.error('[signUp] app user upsert failed');
    return FAILED;
  }
  return { ok: true, email: parsed.data.email };
}

export async function signOutCore() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
}
