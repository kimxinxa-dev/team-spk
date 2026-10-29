import Link from 'next/link';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import { getMyStats } from '@/lib/data/stats';

export const metadata = { title: '홈 — 안심 지킴이' };

const FEATURES = [
  {
    href: '/check?tab=demo',
    icon: '📩',
    title: '실시간 감지',
    desc: '문자가 오는 순간 검사하고 위험하면 막아요',
  },
  {
    href: '/check?tab=qr',
    icon: '📷',
    title: 'QR 검사',
    desc: '찍기 전에 위험한 주소인지 확인해요',
  },
  {
    href: '/check?tab=message',
    icon: '✍️',
    title: '붙여 넣어 검사',
    desc: '받은 문자를 붙여 넣으면 AI가 판단해요',
  },
];

/** 로그인 후 첫 화면. 세 가지 스미싱 검사로 바로 가고, 내 검사 기록 요약만 따로 불러온다. */
export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        사기 문자, 안심 지킴이가 막아 드려요
      </h1>
      <nav aria-label="기능 바로가기" className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="flex items-center gap-4 rounded-2xl border-2 border-zinc-200 bg-white p-5 hover:border-blue-700 sm:flex-col sm:items-start"
          >
            <span aria-hidden="true" className="text-5xl">
              {f.icon}
            </span>
            <span>
              <span className="block text-2xl font-bold text-blue-800">
                {f.title}
              </span>
              <span className="block text-lg text-zinc-600">{f.desc}</span>
            </span>
          </Link>
        ))}
      </nav>
      <Suspense
        fallback={
          <p
            role="status"
            className="rounded-2xl bg-blue-50 p-5 text-lg text-zinc-600"
          >
            내 검사 기록을 모으고 있어요…
          </p>
        }
      >
        <MySummary />
      </Suspense>
    </div>
  );
}

async function MySummary() {
  const user = await requireUser();
  const s = await getMyStats(user.id);
  return (
    <section
      aria-labelledby="summary"
      className="space-y-3 rounded-2xl bg-blue-50 p-5"
    >
      <h2 id="summary" className="text-2xl font-bold">
        내 검사 기록
      </h2>
      {s.total === 0 ? (
        <p className="text-lg text-zinc-700">
          아직 검사한 문자가 없어요. 위에서 하나 해 보세요!
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="검사한 문자·QR" value={`${s.total}건`} />
          <Stat label="찾아낸 위험" value={`${s.danger}건`} />
          <Stat label="QR 검사" value={`${s.qr}건`} />
          <Stat label="정답 알려 준 기록" value={`${s.verdicts}건`} />
        </dl>
      )}
      <Link
        href="/check"
        className="inline-flex min-h-12 items-center text-lg font-bold text-blue-800 underline"
      >
        검사 기록 전체 보기
      </Link>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <dt className="text-base text-zinc-600">{label}</dt>
      <dd className="text-2xl font-bold text-blue-800">{value}</dd>
    </div>
  );
}
