'use client';

import type { ReactNode } from 'react';

/** 체험 문자 화면에서 쓰는 버튼과 결과 안내. 누르는 곳은 최소 48px. */

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  children,
  loading = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading}
      className={`${base} bg-navy text-white hover:bg-blue-800 ${className}`}
    >
      {loading ? (
        <>
          <span
            aria-hidden
            className="inline-block h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white"
          />
          처리하고 있어요…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Notice({
  kind,
  children,
}: {
  kind: 'error' | 'success';
  children: ReactNode;
}) {
  const style =
    kind === 'error'
      ? 'bg-red-50 text-danger border-danger/30'
      : 'bg-green-50 text-safe border-safe/30';
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border px-4 py-3 text-lg ${style}`}
    >
      {kind === 'error' ? '⚠ ' : '✓ '}
      {children}
    </p>
  );
}
