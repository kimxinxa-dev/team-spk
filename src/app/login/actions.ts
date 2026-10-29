'use server';

import { redirect } from 'next/navigation';
import { signInCore, signOutCore, signUpCore } from '@/lib/auth-core';
import type { ActionResult } from '@/lib/action-result';

/** 로그인·가입하면 바로 가상 휴대폰(문자 지킴이 > 실시간 감지 탭)으로 간다. */
const AFTER_LOGIN = '/check?tab=demo';

export async function signIn(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const res = await signInCore({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!res.ok) return res;
  redirect(AFTER_LOGIN);
}

export async function signUp(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const res = await signUpCore({
    email: formData.get('email'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  });
  if (!res.ok) return res;
  if (!res.email) return { ok: true, message: res.message };
  redirect(AFTER_LOGIN);
}

export async function signOut() {
  await signOutCore();
  redirect('/login');
}
