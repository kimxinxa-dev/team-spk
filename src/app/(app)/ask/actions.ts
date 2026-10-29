'use server';

// 배움 노트(주요 기능 2) 저장·목록·제목 고치기·연습 횟수·지우기.
// 순서: 로그인 확인 → 입력 검증 → 내 자료인지(userId 조건) 확인.
import { authedAction } from '@/lib/data-action';
import {
  countGuidePractice,
  deleteGuideNote,
  listGuideNotes,
  renameGuideNote,
  saveGuideNote,
} from '@/lib/data/guides';
import {
  guideRenameSchema,
  guideSaveSchema,
  idSchema,
  offsetSchema,
} from '@/lib/validation';

export async function saveNote(input: unknown) {
  return authedAction('saveNote', guideSaveSchema, input, (user, d) =>
    saveGuideNote(user.id, d),
  );
}

export async function listNotes(offset: unknown) {
  return authedAction('listNotes', offsetSchema, offset, (user, o) =>
    listGuideNotes(user.id, o),
  );
}

export async function renameNote(input: unknown) {
  return authedAction(
    'renameNote',
    guideRenameSchema,
    input,
    async (user, d) => {
      await renameGuideNote(user.id, d.id, d.title);
      return null;
    },
  );
}

export async function practiceNote(id: unknown) {
  return authedAction('practiceNote', idSchema, { id }, async (user, d) => {
    await countGuidePractice(user.id, d.id);
    return null;
  });
}

export async function deleteNote(id: unknown) {
  return authedAction('deleteNote', idSchema, { id }, async (user, d) => {
    await deleteGuideNote(user.id, d.id);
    return null;
  });
}
