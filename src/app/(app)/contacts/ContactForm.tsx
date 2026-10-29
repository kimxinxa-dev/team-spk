'use client';

import { useActionState, useRef } from 'react';
import { createContact, updateContact } from './actions';
import { FieldError, FormStatus, SubmitButton } from '@/components/form';
import { INITIAL_RESULT, type ActionResult } from '@/lib/action-result';
import type { ContactItem } from '@/lib/queries';

/** 연락처 추가(contact 없음) 또는 고치기(contact 있음) */
export function ContactForm({
  contact,
  onDone,
}: {
  contact?: ContactItem;
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(contact);
  const prefix = contact ? `contact-${contact.id}` : 'contact-new';
  const [result, action] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const next = await (isEdit ? updateContact : createContact)(
        prev,
        formData,
      );
      if (next.ok) {
        if (!isEdit) formRef.current?.reset();
        onDone?.();
      }
      return next;
    },
    INITIAL_RESULT,
  );

  const inputClass =
    'mt-2 block min-h-12 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 text-lg';

  return (
    <form ref={formRef} action={action} className="mt-5 space-y-4" noValidate>
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${prefix}-name`}
            className="block text-lg font-semibold"
          >
            이름
          </label>
          <input
            id={`${prefix}-name`}
            name="name"
            defaultValue={contact?.name}
            maxLength={20}
            required
            aria-describedby={`${prefix}-name-error`}
            className={inputClass}
          />
          <FieldError id={`${prefix}-name-error`} result={result} name="name" />
        </div>
        <div>
          <label
            htmlFor={`${prefix}-phone`}
            className="block text-lg font-semibold"
          >
            전화번호
          </label>
          <input
            id={`${prefix}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={contact?.phone}
            placeholder="010-1234-5678"
            required
            aria-describedby={`${prefix}-phone-error`}
            className={inputClass}
          />
          <FieldError
            id={`${prefix}-phone-error`}
            result={result}
            name="phone"
          />
        </div>
        <div>
          <label
            htmlFor={`${prefix}-relation`}
            className="block text-lg font-semibold"
          >
            관계 <span className="font-normal text-zinc-600">(선택)</span>
          </label>
          <input
            id={`${prefix}-relation`}
            name="relation"
            defaultValue={contact?.relation ?? ''}
            maxLength={10}
            placeholder="예: 아들, 딸, 복지사"
            aria-describedby={`${prefix}-relation-error`}
            className={inputClass}
          />
          <FieldError
            id={`${prefix}-relation-error`}
            result={result}
            name="relation"
          />
        </div>
        <label className="flex min-h-12 items-center gap-3 self-end text-lg font-semibold">
          <input
            type="checkbox"
            name="isGuardian"
            defaultChecked={contact?.isGuardian}
            className="size-6"
          />
          보호자로 지정(위험 문자 알림 받기)
        </label>
      </div>
      <FormStatus result={result} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText="저장하는 중…">
          {isEdit ? '고친 내용 저장' : '연락처 추가'}
        </SubmitButton>
        {isEdit && (
          <button
            type="button"
            onClick={onDone}
            className="min-h-12 rounded-xl border-2 border-zinc-300 px-5 text-lg font-semibold"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
