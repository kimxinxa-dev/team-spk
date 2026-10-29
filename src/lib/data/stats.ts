import 'server-only';

import { getDb } from '@/lib/db';

export type MyStats = {
  scamCount: number;
  dangerCount: number;
  guideCount: number;
  practiceTotal: number;
  kioskCount: number;
  avgMistakes: number;
  topStuckStep: string | null;
};

/** 나의 성장: 세 기능의 기록을 한 번에 모아 계산한다. 각 집계는 동시에 실행한다. */
export async function getMyStats(userId: string): Promise<MyStats> {
  const db = getDb();
  const [scamCount, dangerCount, guideAgg, kioskAgg, stuck] = await Promise.all(
    [
      db.scanRecord.count({ where: { userId } }),
      db.scanRecord.count({ where: { userId, riskLevel: 'DANGER' } }),
      db.guideNote.aggregate({
        where: { userId },
        _count: true,
        _sum: { practiceCount: true },
      }),
      db.kioskSession.aggregate({
        where: { userId },
        _count: true,
        _avg: { mistakes: true },
      }),
      db.kioskSession.groupBy({
        by: ['stuckStep'],
        where: { userId, stuckStep: { not: null } },
        _count: { stuckStep: true },
        orderBy: { _count: { stuckStep: 'desc' } },
        take: 1,
      }),
    ],
  );
  return {
    scamCount,
    dangerCount,
    guideCount: guideAgg._count,
    practiceTotal: guideAgg._sum.practiceCount ?? 0,
    kioskCount: kioskAgg._count,
    avgMistakes: Math.round((kioskAgg._avg.mistakes ?? 0) * 10) / 10,
    topStuckStep: stuck[0]?.stuckStep ?? null,
  };
}
