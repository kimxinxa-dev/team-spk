import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from '@/lib/env';

/** 요청마다 새로 만든다(쿠키가 요청마다 다르다). 설정이 없으면 null. */
export async function createSupabaseServerClient() {
  // 쿠키를 먼저 읽어 이 함수를 부르는 화면이 항상 요청마다 그려지게 한다(설정이 없어도 빌드 때 결과가 고정되지 않게).
  const cookieStore = await cookies();
  const env = getSupabaseEnv();
  if (!env) return null;

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy.ts가 맡는다.
          }
        },
      },
    },
  );
}
