'use client';

import { useActionState, useState } from 'react';
import { signIn, signUp } from './actions';
import { FieldError, FormStatus, SubmitButton } from '@/components/form';
import { INITIAL_RESULT, type ActionResult } from '@/lib/action-result';

const INPUT =
  'block min-h-14 w-full rounded-2xl border-2 border-zinc-300 bg-white pr-4 pl-12 text-lg placeholder:text-zinc-400 focus:border-blue-700 focus:outline-none aria-[invalid=true]:border-red-600';

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m4 7 8 6 8-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 10V7.5a4 4 0 0 1 8 0V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/** 칸 안 왼쪽 아이콘 + 입력칸(+ 오른쪽 버튼) */
function Field({
  id,
  label,
  hint,
  icon,
  result,
  children,
  trailing,
}: {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  result: ActionResult;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-lg font-semibold">
        {label}
        {hint && <span className="font-normal text-zinc-600"> {hint}</span>}
      </label>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-zinc-500">
          {icon}
        </span>
        {children}
        {trailing}
      </div>
      <FieldError id={`${id}-error`} result={result} name={id} />
    </div>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [showPassword, setShowPassword] = useState(false);
  const [signInResult, signInAction] = useActionState(signIn, INITIAL_RESULT);
  const [signUpResult, signUpAction] = useActionState(signUp, INITIAL_RESULT);
  const isSignUp = mode === 'signUp';
  const result = isSignUp ? signUpResult : signInResult;
  const invalid = (name: string) =>
    !result.ok && result.fieldErrors?.[name] ? true : undefined;

  return (
    <div className="mt-8 rounded-3xl border-2 border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      {/* 로그인 / 가입 바꾸기 */}
      <div
        role="tablist"
        aria-label="로그인 또는 가입"
        className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1"
      >
        {(['signIn', 'signUp'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value);
              setShowPassword(false);
            }}
            className={`min-h-12 rounded-xl text-lg font-bold transition-colors ${
              mode === value
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {value === 'signIn' ? '로그인' : '가입하기'}
          </button>
        ))}
      </div>

      <form
        key={mode}
        action={isSignUp ? signUpAction : signInAction}
        className="mt-6 grid gap-5"
        noValidate
      >
        <Field id="email" label="이메일" icon={<MailIcon />} result={result}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="예: hong@naver.com"
            required
            aria-invalid={invalid('email')}
            aria-describedby="email-error"
            className={INPUT}
          />
        </Field>

        <Field
          id="password"
          label="비밀번호"
          hint="(8자 이상)"
          icon={<LockIcon />}
          result={result}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-controls={isSignUp ? 'password passwordConfirm' : 'password'}
              className="absolute top-1/2 right-2 min-h-11 -translate-y-1/2 rounded-xl px-3 text-base font-bold text-blue-700 hover:bg-blue-50"
            >
              {showPassword ? '숨기기' : '👁 보기'}
            </button>
          }
        >
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={8}
            aria-invalid={invalid('password')}
            aria-describedby="password-error"
            className={`${INPUT} pr-24`}
          />
        </Field>

        {isSignUp && (
          <Field
            id="passwordConfirm"
            label="비밀번호 한 번 더"
            icon={<LockIcon />}
            result={result}
          >
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              aria-invalid={invalid('passwordConfirm')}
              aria-describedby="passwordConfirm-error"
              className={INPUT}
            />
          </Field>
        )}

        <FormStatus result={result} />
        {!isSignUp && !result.ok && !result.fieldErrors && (
          <p className="-mt-2 text-base text-zinc-600">
            처음 오셨다면 위의{' '}
            <button
              type="button"
              onClick={() => setMode('signUp')}
              className="font-bold text-blue-700 underline"
            >
              가입하기
            </button>
            를 눌러 주세요.
          </p>
        )}

        <div className="grid">
          <SubmitButton
            pendingText={isSignUp ? '가입하는 중…' : '로그인하는 중…'}
          >
            {isSignUp ? '가입하고 시작하기' : '로그인'}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
