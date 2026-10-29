'use client';

import { useFormStatus } from 'react-dom';
import type { ActionResult } from '@/lib/action-result';

/** 누르면 바로 "처리 중"으로 바뀌고, 처리하는 동안 다시 누를 수 없다(중복 저장 방지). */
export function SubmitButton({
  children,
  pendingText = '처리 중…',
  variant = 'primary',
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: 'bg-blue-700 text-white hover:bg-blue-800',
    secondary:
      'border-2 border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50',
    danger: 'border-2 border-red-200 bg-white text-red-700 hover:bg-red-50',
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`min-h-12 rounded-xl px-5 text-lg font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${styles}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/** 칸 바로 아래에 보이는 오류 안내 */
export function FieldError({
  id,
  result,
  name,
}: {
  id: string;
  result: ActionResult;
  name: string;
}) {
  const message = !result.ok ? result.fieldErrors?.[name] : undefined;
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-base font-medium text-red-700">
      {message}
    </p>
  );
}

/** 저장됨·실패 같은 폼 전체 결과 */
export function FormStatus({ result }: { result: ActionResult }) {
  if (!result.message) return null;
  return (
    <p
      role={result.ok ? 'status' : 'alert'}
      className={`rounded-xl px-4 py-3 text-base font-medium ${
        result.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      }`}
    >
      {result.message}
    </p>
  );
}
