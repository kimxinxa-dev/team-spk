import 'server-only';

import { getDb } from '@/lib/db';

export type MyStats = {
  total: number;
  danger: number;
  qr: number;
  verdicts: number;
};

/** 홈 화면 요약: 세 가지 검사(실시간 감지·QR·붙여 넣기) 기록을 한 번에 모아 센다. */
export async function getMyStats(userId: string): Promise<MyStats> {
  const db = getDb();
  const [total, danger, qr, verdicts] = await Promise.all([
    db.scanRecord.count({ where: { userId } }),
    db.scanRecord.count({ where: { userId, riskLevel: 'DANGER' } }),
    db.scanRecord.count({ where: { userId, kind: 'QR' } }),
    db.scanRecord.count({ where: { userId, userVerdict: { not: null } } }),
  ]);
  return { total, danger, qr, verdicts };
}
