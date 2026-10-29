'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { authSchema } from '@/lib/validation';
import {
  FAILED_RESULT,
  invalidResult,
  type ActionResult,
} from '@/lib/action-result';

const NOT_CONFIGURED: ActionResult = {
  ok: false,
  message: '로그인 설정이 아직 되어 있지 않습니다. 운영자에게 문의해 주세요.',
};

/** Supabase Auth 사용자와 같은 id로 앱 회원 행을 만든다(이미 있으면 그대로). */
async function ensureAppUser(id: string, email: string) {
  await getDb().user.upsert({
    where: { id },
    create: { id, email },
    update: {},
  });
}

export async function signIn(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = authSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return invalidResult(parsed.error);

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
    return FAILED_RESULT;
  }
  redirect('/check');
}

export async function signUp(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = authSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return invalidResult(parsed.error);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error || !data.user) {
    // 이미 가입한 이메일인지 등 자세한 이유는 알려 주지 않는다(계정 존재 여부 노출 방지).
    return { ok: false, message: '가입하지 못했습니다. 입력을 확인해 주세요.' };
  }
  if (!data.session) {
    // Supabase에서 이메일 확인이 켜져 있으면 세션이 없다. 심사용 계정은 바로 로그인돼야 하므로 꺼 둔다.
    return {
      ok: true,
      message:
        '가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.',
    };
  }

  try {
    await ensureAppUser(data.user.id, parsed.data.email);
  } catch {
    console.error('[signUp] app user upsert failed');
    return FAILED_RESULT;
  }
  redirect('/check');
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect('/login');
}
