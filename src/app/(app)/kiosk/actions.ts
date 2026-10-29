'use server';

// 키오스크 연습 기록(주요 기능 3) 저장·목록·메모 고치기·지우기.
// 순서: 로그인 확인 → 입력 검증 → 내 자료인지(userId 조건) 확인.
import { authedAction } from '@/lib/data-action';
import {
  deleteKioskSession,
  listKioskSessions,
  saveKioskSession,
  updateKioskMemo,
} from '@/lib/data/kiosk';
import {
  idSchema,
  kioskMemoSchema,
  kioskSaveSchema,
  offsetSchema,
} from '@/lib/validation';

export async function saveSession(input: unknown) {
  return authedAction('saveSession', kioskSaveSchema, input, (user, d) =>
    saveKioskSession(user.id, d),
  );
}

export async function listSessions(offset: unknown) {
  return authedAction('listSessions', offsetSchema, offset, (user, o) =>
    listKioskSessions(user.id, o),
  );
}

export async function updateSessionMemo(input: unknown) {
  return authedAction(
    'updateSessionMemo',
    kioskMemoSchema,
    input,
    async (user, d) => {
      await updateKioskMemo(user.id, d.id, d.memo);
      return null;
    },
  );
}

export async function deleteSession(id: unknown) {
  return authedAction('deleteSession', idSchema, { id }, async (user, d) => {
    await deleteKioskSession(user.id, d.id);
    return null;
  });
}
