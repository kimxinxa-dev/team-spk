import 'server-only';

import { getDb } from '@/lib/db';
import type { ScanKind } from '@/generated_prisma/client';

export const PAGE_SIZE = 20;

/** 내 검사 기록(최신순, 한 번에 PAGE_SIZE개). 항상 userId로 거른다. kind가 없으면 문자·QR 모두. */
export function listScans(userId: string, kind?: ScanKind) {
  return getDb().scanRecord.findMany({
    where: { userId, ...(kind ? { kind } : {}) },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    select: {
      id: true,
      kind: true,
      source: true,
      content: true,
      riskLevel: true,
      score: true,
      reasons: true,
      aiSummary: true,
      userVerdict: true,
      memo: true,
      createdAt: true,
    },
  });
}

/** 사용자가 정답을 알려 준 최근 기록 50개. 학습 AI가 이 사람에게 맞춰 판단하는 데 쓴다. */
export async function getPersonalExamples(userId: string) {
  const rows = await getDb().scanRecord.findMany({
    where: { userId, userVerdict: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { content: true, userVerdict: true },
  });
  return rows.map((r) => ({
    content: r.content,
    verdict: r.userVerdict === 'SCAM' ? ('scam' as const) : ('safe' as const),
  }));
}

export type ScanItem = Awaited<ReturnType<typeof listScans>>[number];

/** 내 연락처(이름순) */
export function listContacts(userId: string) {
  return getDb().contact.findMany({
    where: { userId },
    orderBy: [{ isGuardian: 'desc' }, { name: 'asc' }],
    take: 100,
    select: {
      id: true,
      name: true,
      phone: true,
      relation: true,
      isGuardian: true,
    },
  });
}

export type ContactItem = Awaited<ReturnType<typeof listContacts>>[number];
