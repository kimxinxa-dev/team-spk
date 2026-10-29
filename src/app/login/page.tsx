import Link from 'next/link';
import { LoginForm } from './LoginForm';

export const metadata = { title: '로그인 — 안심 지킴이' };

/** 앱 아이콘과 같은 방패 모양 */
function ShieldMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-16 place-items-center rounded-[20px] bg-gradient-to-br from-blue-500 to-blue-800 shadow-lg shadow-blue-700/25"
    >
      <svg viewBox="0 0 64 64" className="size-10">
        <path
          d="M32 6 54 14v16c0 14-9.5 24-22 28C19.5 54 10 44 10 30V14z"
          fill="#fff"
        />
        <path
          d="m22 32 7 7 14-15"
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pt-6 pb-12">
      <Link
        href="/"
        className="inline-flex min-h-12 items-center text-lg font-semibold text-zinc-600 hover:text-blue-700"
      >
        ← 처음 화면
      </Link>

      <div className="mt-4 grid justify-items-center gap-3 text-center">
        <ShieldMark />
        <h1 className="text-3xl font-bold">안심 지킴이</h1>
        <p className="text-lg text-balance text-zinc-700">
          문자·QR 사기를 먼저 막아 드려요
        </p>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-base text-balance text-zinc-600">
        <span aria-hidden="true">🔒 </span>내 검사 기록과 연락처는 나만 볼 수
        있어요
      </p>
    </main>
  );
}
