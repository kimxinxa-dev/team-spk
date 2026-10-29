import type { PoolConfig } from 'pg';
import { readSupabaseCa } from './supabase-ca';

type DatabaseVariable = 'DATABASE_URL' | 'DIRECT_URL' | 'SHADOW_DATABASE_URL';

export function normalizeDatabaseUrl(
  connectionString: string,
  variable: DatabaseVariable = 'DATABASE_URL',
): URL {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(
      `${variable}에 올바른 PostgreSQL 연결 주소를 입력해 주세요.`,
    );
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`${variable}은 PostgreSQL 연결 주소여야 합니다.`);
  }

  // URL options must never replace the CA or disable hostname verification.
  for (const key of [...url.searchParams.keys()]) {
    const normalized = key.toLowerCase();
    if (normalized.startsWith('ssl') || normalized === 'uselibpqcompat') {
      url.searchParams.delete(key);
    }
  }
  return url;
}

export function createDatabaseConnectionConfig(
  connectionString: string,
): PoolConfig {
  return {
    connectionString: normalizeDatabaseUrl(connectionString).toString(),
    ssl: {
      ca: readSupabaseCa(),
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    max: 2,
    // DB와 멀리 떨어진 곳(예: 한국 PC ↔ 유럽 DB)에서는 TLS 연결에 5초 이상 걸릴 때가 있어 여유를 둔다.
    // 무한 대기는 막기 위해 제한 시간은 유지한다.
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 10_000,
  };
}
