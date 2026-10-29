import 'server-only';

import { z } from 'zod';

const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .url('올바른 PostgreSQL 연결 주소를 입력해 주세요.')
    .refine(
      (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
      'postgres:// 또는 postgresql://로 시작하는 연결 주소를 입력해 주세요.',
    ),
});

export function getDatabaseEnv() {
  const result = databaseEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  if (!result.success) {
    throw new Error(
      '.env 파일의 DATABASE_URL에 실제 Supabase PostgreSQL 연결 주소를 입력한 뒤 서버를 재시작해 주세요.',
    );
  }

  return result.data;
}

// Supabase Auth용 공개 값(URL·publishable 키). 비밀 키(secret/service_role)는 여기에 두지 않는다.
const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

/** 설정되지 않았으면 null — 화면이 "로그인 설정 필요" 안내를 보여 준다. */
export function getSupabaseEnv() {
  const result = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return result.success ? result.data : null;
}
