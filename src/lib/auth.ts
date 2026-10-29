import 'server-only';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SessionUser = { id: string; email: string };

/**
 * 로그인한 사용자. 쿠키의 토큰을 그대로 믿지 않고 getClaims()로 서명을 검증한다.
 * 로그인하지 않았거나 로그인 설정이 없으면 null.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || typeof claims.email !== 'string') return null;
  return { id: claims.sub, email: claims.email };
}

/** 보호된 화면·서버 기능의 첫 줄. 로그인하지 않았으면 로그인 화면으로 보낸다. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
