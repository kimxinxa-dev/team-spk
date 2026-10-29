import 'server-only';

import { getDb } from '@/lib/db';
import type { ScanKind } from '@/generated_prisma/client';

export const PAGE_SIZE = 20;

/** 내 검사 기록(최신순, 한 번에 PAGE_SIZE개). 항상 userId로 거른다. */
export function listScans(userId: string, kind: ScanKind) {
  return getDb().scanRecord.findMany({
    where: { userId, kind },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    select: {
      id: true,
      source: true,
      content: true,
      riskLevel: true,
      reasons: true,
      aiSummary: true,
      memo: true,
      createdAt: true,
    },
  });
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
