'use client';

import { useActionState, useRef } from 'react';
import { createMessageScan } from '../scan-actions';
import { FieldError, FormStatus, SubmitButton } from '@/components/form';
import { INITIAL_RESULT, type ActionResult } from '@/lib/action-result';
import { MESSAGE_MAX } from '@/lib/validation';

const SOURCES = [
  { value: 'SMS', label: '문자' },
  { value: 'KAKAO', label: '카카오톡' },
  { value: 'OTHER', label: '기타' },
] as const;

export function MessageCheckForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, action] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const next = await createMessageScan(prev, formData);
      if (next.ok) formRef.current?.reset();
      return next;
    },
    INITIAL_RESULT,
  );

  return (
    <form ref={formRef} action={action} className="mt-5 space-y-5" noValidate>
      <fieldset>
        <legend className="text-lg font-semibold">어디서 받았나요?</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SOURCES.map((source, index) => (
            <label
              key={source.value}
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-zinc-300 bg-white text-lg font-semibold has-checked:border-blue-700 has-checked:bg-blue-50 has-checked:text-blue-800"
            >
              <input
                type="radio"
                name="source"
                value={source.value}
                defaultChecked={index === 0}
                className="sr-only"
              />
              {source.label}
            </label>
          ))}
        </div>
        <FieldError id="source-error" result={result} name="source" />
      </fieldset>

      <div>
        <label htmlFor="content" className="block text-lg font-semibold">
          받은 메시지
        </label>
        <textarea
          id="content"
          name="content"
          rows={6}
          maxLength={MESSAGE_MAX}
          required
          placeholder="예: [CJ대한통운] 주소지 불일치로 배송이 보류되었습니다. 주소 확인 bit.ly/..."
          aria-describedby="content-error"
          className="mt-2 block w-full rounded-xl border-2 border-zinc-300 bg-white p-4 text-lg leading-8"
        />
        <FieldError id="content-error" result={result} name="content" />
      </div>

      <FormStatus result={result} />
      <div className="grid">
        <SubmitButton pendingText="검사하는 중…">검사하기</SubmitButton>
      </div>
    </form>
  );
}
