import 'server-only';

import { NotFoundError } from '@/lib/data-action';
import { getDb } from '@/lib/db';
import { LIST_PAGE_SIZE as PAGE_SIZE } from '@/lib/validation';

export type KioskSessionView = {
  id: string;
  kioskType: 'restaurant' | 'hospital' | 'train';
  durationSec: number;
  mistakes: number;
  stuckStep: string | null;
  memo: string | null;
  createdAt: string;
};

const select = {
  id: true,
  kioskType: true,
  durationSec: true,
  mistakes: true,
  stuckStep: true,
  memo: true,
  createdAt: true,
} as const;

function toView(
  row: { createdAt: Date } & Record<string, unknown>,
): KioskSessionView {
  return {
    ...(row as unknown as KioskSessionView),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveKioskSession(
  userId: string,
  input: {
    kioskType: string;
    durationSec: number;
    mistakes: number;
    stuckStep: string | null;
    requestId: string;
  },
) {
  const row = await getDb().kioskSession.upsert({
    where: {
      userId_clientRequestId: { userId, clientRequestId: input.requestId },
    },
    update: {},
    create: {
      userId,
      kioskType: input.kioskType,
      durationSec: input.durationSec,
      mistakes: input.mistakes,
      stuckStep: input.stuckStep,
      clientRequestId: input.requestId,
    },
    select,
  });
  return toView(row);
}

export async function listKioskSessions(userId: string, offset: number) {
  const rows = await getDb().kioskSession.findMany({
    where: { userId },
    select,
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: PAGE_SIZE + 1,
  });
  return {
    items: rows.slice(0, PAGE_SIZE).map(toView),
    hasMore: rows.length > PAGE_SIZE,
  };
}

export async function updateKioskMemo(
  userId: string,
  id: string,
  memo: string,
) {
  const { count } = await getDb().kioskSession.updateMany({
    where: { id, userId },
    data: { memo: memo || null },
  });
  if (count === 0) throw new NotFoundError();
}

export async function deleteKioskSession(userId: string, id: string) {
  const { count } = await getDb().kioskSession.deleteMany({
    where: { id, userId },
  });
  if (count === 0) throw new NotFoundError();
}
