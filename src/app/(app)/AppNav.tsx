'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/check', label: '문자 검사', icon: '💬' },
  { href: '/qr', label: 'QR 검사', icon: '📷' },
  { href: '/contacts', label: '연락처', icon: '👨‍👩‍👧' },
] as const;

/** 아래쪽 고정 메뉴. 엄지로 누르기 쉽게 크게 둔다. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 border-t-2 border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-3">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-18 flex-col items-center justify-center gap-1 text-lg font-semibold ${
                  active ? 'text-blue-700' : 'text-zinc-600'
                }`}
              >
                <span aria-hidden="true" className="text-2xl">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
