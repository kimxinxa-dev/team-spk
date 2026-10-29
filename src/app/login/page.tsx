import Link from 'next/link';
import { LoginForm } from './LoginForm';

export const metadata = { title: '로그인 — 안심 지킴이' };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-12">
      <Link href="/" className="text-lg font-bold text-blue-700">
        ← 안심 지킴이
      </Link>
      <h1 className="mt-6 text-3xl font-bold">로그인</h1>
      <p className="mt-2 text-lg text-zinc-700">
        내 검사 기록과 연락처는 나만 볼 수 있어요.
      </p>
      <LoginForm />
    </main>
  );
}
