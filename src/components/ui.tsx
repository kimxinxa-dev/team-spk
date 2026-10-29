'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** 앱 전체에서 같은 모양으로 쓰는 버튼·입력칸·상태 표시. 누르는 곳은 최소 48px. */

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}) {
  const color =
    variant === 'primary'
      ? 'bg-navy text-white hover:bg-[#162c49]'
      : variant === 'danger'
        ? 'border-2 border-danger bg-white text-danger hover:bg-red-50'
        : 'border-2 border-navy bg-white text-navy hover:bg-cream';
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading}
      className={`${base} ${color} ${className}`}
    >
      {loading ? (
        <>
          <Spinner light={variant === 'primary'} /> 처리하고 있어요…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-5 w-5 animate-spin rounded-full border-[3px] ${light ? 'border-white/40 border-t-white' : 'border-navy/30 border-t-navy'}`}
    />
  );
}

export function Loading({ text = '불러오고 있어요…' }: { text?: string }) {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-3 py-6 text-lg text-muted"
    >
      <Spinner /> {text}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center text-lg text-muted">
      {children}
    </p>
  );
}

export function Notice({
  kind,
  children,
  onRetry,
}: {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
  onRetry?: () => void;
}) {
  const style =
    kind === 'error'
      ? 'bg-red-50 text-danger border-danger/30'
      : kind === 'success'
        ? 'bg-green-50 text-safe border-safe/30'
        : 'bg-cream text-navy border-yellow/50';
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-lg ${style}`}
    >
      <span className="flex-1">
        {kind === 'error' ? '⚠ ' : kind === 'success' ? '✓ ' : ''}
        {children}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-12 rounded-xl px-3 font-bold underline"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-base font-semibold text-danger">
      ⚠ {message}
    </p>
  );
}

export const inputClass =
  'w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-lg outline-none focus:border-navy aria-[invalid=true]:border-danger';

/** 지우기처럼 되돌릴 수 없는 일을 하기 전에 묻는 창 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(92vw,420px)] rounded-3xl p-0 backdrop:bg-black/50"
      aria-labelledby="confirm-title"
    >
      <div className="space-y-4 p-6">
        <h2 id="confirm-title" className="text-2xl font-extrabold text-navy">
          {title}
        </h2>
        <p className="text-lg">{body}</p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export function shortDate(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** 저장 버튼마다 요청 번호를 하나 만들어, 두 번 눌러도 서버가 한 번만 저장하게 한다. */
export function newRequestId() {
  return crypto.randomUUID();
}
