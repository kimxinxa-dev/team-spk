'use server';

// 보호자·연락처 추가·수정·삭제(주요 기능 3).
// 순서: 로그인 확인 → 입력 검증 → 내 자료인지(userId 조건) 확인.
import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated_prisma/client';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { contactSchema, idSchema } from '@/lib/validation';
import {
  FAILED_RESULT,
  invalidResult,
  type ActionResult,
} from '@/lib/action-result';

const DUPLICATE_PHONE: ActionResult = {
  ok: false,
  message: '이미 등록한 전화번호입니다.',
  fieldErrors: { phone: '이미 등록한 전화번호입니다.' },
};

function parseContact(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    relation: formData.get('relation') || undefined,
    isGuardian: formData.get('isGuardian') === 'on',
  });
}

function isDuplicate(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export async function createContact(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parseContact(formData);
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    await getDb().contact.create({
      data: { ...parsed.data, userId: user.id },
    });
  } catch (error) {
    if (isDuplicate(error)) return DUPLICATE_PHONE;
    console.error('[createContact] insert failed');
    return FAILED_RESULT;
  }
  revalidatePath('/contacts');
  return { ok: true, message: '연락처를 저장했습니다.' };
}

export async function updateContact(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const target = idSchema.safeParse({ id: formData.get('id') });
  if (!target.success) return invalidResult(target.error);
  const parsed = parseContact(formData);
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    const { count } = await getDb().contact.updateMany({
      where: { id: target.data.id, userId: user.id },
      data: parsed.data,
    });
    if (count === 0)
      return { ok: false, message: '연락처를 찾을 수 없습니다.' };
  } catch (error) {
    if (isDuplicate(error)) return DUPLICATE_PHONE;
    console.error('[updateContact] update failed');
    return FAILED_RESULT;
  }
  revalidatePath('/contacts');
  return { ok: true, message: '연락처를 고쳤습니다.' };
}

export async function deleteContact(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    const { count } = await getDb().contact.deleteMany({
      where: { id: parsed.data.id, userId: user.id },
    });
    if (count === 0)
      return { ok: false, message: '연락처를 찾을 수 없습니다.' };
  } catch {
    console.error('[deleteContact] delete failed');
    return FAILED_RESULT;
  }
  revalidatePath('/contacts');
  return { ok: true, message: '연락처를 지웠습니다.' };
}
