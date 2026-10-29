import Link from 'next/link';
import { signOut } from '@/app/login/actions';
import { AppNav } from './AppNav';

/** 로그인해야 쓰는 화면들의 공통 틀: 위쪽 제목·로그아웃, 아래쪽 큰 메뉴 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b-2 border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3">
          <Link href="/check" className="text-xl font-bold text-blue-700">
            안심 지킴이
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-12 rounded-xl px-4 text-lg font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-6 pb-32">
        {children}
      </main>
      <AppNav />
    </div>
  );
}
