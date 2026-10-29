import 'server-only';

import { NotFoundError } from '@/lib/data-action';
import { getDb } from '@/lib/db';
import { findGuide } from '@/lib/guides';
import { LIST_PAGE_SIZE as PAGE_SIZE } from '@/lib/validation';

export type GuideNoteView = {
  id: string;
  guideKey: string;
  title: string;
  question: string;
  practiceCount: number;
  createdAt: string;
};

const select = {
  id: true,
  guideKey: true,
  title: true,
  question: true,
  practiceCount: true,
  createdAt: true,
} as const;

function toView(
  row: Omit<GuideNoteView, 'createdAt'> & { createdAt: Date },
): GuideNoteView {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function saveGuideNote(
  userId: string,
  input: { guideKey: string; question: string; requestId: string },
) {
  const guide = findGuide(input.guideKey);
  if (!guide) throw new NotFoundError();
  const row = await getDb().guideNote.upsert({
    where: {
      userId_clientRequestId: { userId, clientRequestId: input.requestId },
    },
    update: {},
    create: {
      userId,
      guideKey: guide.key,
      title: guide.title,
      question: input.question,
      clientRequestId: input.requestId,
    },
    select,
  });
  return toView(row);
}

export async function listGuideNotes(userId: string, offset: number) {
  const rows = await getDb().guideNote.findMany({
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

export async function renameGuideNote(
  userId: string,
  id: string,
  title: string,
) {
  const { count } = await getDb().guideNote.updateMany({
    where: { id, userId },
    data: { title },
  });
  if (count === 0) throw new NotFoundError();
}

/** 연습 횟수는 DB에서 1씩 올려 동시에 눌러도 숫자가 틀리지 않는다. */
export async function countGuidePractice(userId: string, id: string) {
  const { count } = await getDb().guideNote.updateMany({
    where: { id, userId },
    data: { practiceCount: { increment: 1 } },
  });
  if (count === 0) throw new NotFoundError();
}

export async function deleteGuideNote(userId: string, id: string) {
  const { count } = await getDb().guideNote.deleteMany({
    where: { id, userId },
  });
  if (count === 0) throw new NotFoundError();
}
