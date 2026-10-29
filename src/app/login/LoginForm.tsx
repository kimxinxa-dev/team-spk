'use client';

import { useActionState, useState } from 'react';
import { signIn, signUp } from './actions';
import { FieldError, FormStatus, SubmitButton } from '@/components/form';
import { INITIAL_RESULT } from '@/lib/action-result';

export function LoginForm() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [signInResult, signInAction] = useActionState(signIn, INITIAL_RESULT);
  const [signUpResult, signUpAction] = useActionState(signUp, INITIAL_RESULT);
  const isSignUp = mode === 'signUp';
  const result = isSignUp ? signUpResult : signInResult;

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="로그인 또는 가입"
        className="grid grid-cols-2 gap-2"
      >
        {(['signIn', 'signUp'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`min-h-12 rounded-xl text-lg font-semibold ${
              mode === value
                ? 'bg-blue-700 text-white'
                : 'border-2 border-zinc-300 bg-white'
            }`}
          >
            {value === 'signIn' ? '로그인' : '처음이에요(가입)'}
          </button>
        ))}
      </div>

      <form
        key={mode}
        action={isSignUp ? signUpAction : signInAction}
        className="mt-6 space-y-5"
        noValidate
      >
        <div>
          <label htmlFor="email" className="block text-lg font-semibold">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-describedby="email-error"
            className="mt-2 block min-h-12 w-full rounded-xl border-2 border-zinc-300 px-4 text-lg"
          />
          <FieldError id="email-error" result={result} name="email" />
        </div>
        <div>
          <label htmlFor="password" className="block text-lg font-semibold">
            비밀번호{' '}
            <span className="font-normal text-zinc-600">(8자 이상)</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={8}
            aria-describedby="password-error"
            className="mt-2 block min-h-12 w-full rounded-xl border-2 border-zinc-300 px-4 text-lg"
          />
          <FieldError id="password-error" result={result} name="password" />
        </div>
        <FormStatus result={result} />
        <div className="grid">
          <SubmitButton
            pendingText={isSignUp ? '가입하는 중…' : '로그인하는 중…'}
          >
            {isSignUp ? '가입하기' : '로그인'}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
