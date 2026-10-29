import Link from 'next/link';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import { getMyStats } from '@/lib/data/stats';

export const metadata = { title: '홈 — 안심 지킴이' };

const FEATURES = [
  {
    href: '/check',
    icon: '🛡️',
    title: '문자 지킴이',
    desc: '사기 문자·QR을 바로 검사해요',
  },
  {
    href: '/ask',
    icon: '🎤',
    title: '말로 물어보기',
    desc: '누를 곳을 노란 테두리로 알려 드려요',
  },
  {
    href: '/kiosk',
    icon: '🍽️',
    title: '키오스크 연습',
    desc: '음식점·병원·기차역 무인기 연습',
  },
];

/** 로그인 후 첫 화면. 기능 바로가기는 바로 보이고, 세 기능의 기록을 모은 '나의 성장'만 따로 불러온다. */
export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">무엇을 도와 드릴까요?</h1>
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
            나의 기록을 모으고 있어요…
          </p>
        }
      >
        <MyGrowth />
      </Suspense>
    </div>
  );
}

async function MyGrowth() {
  const user = await requireUser();
  const s = await getMyStats(user.id);
  const empty = s.scamCount + s.guideCount + s.kioskCount === 0;
  return (
    <section
      aria-labelledby="growth"
      className="space-y-3 rounded-2xl bg-blue-50 p-5"
    >
      <h2 id="growth" className="text-2xl font-bold">
        나의 성장
      </h2>
      {empty ? (
        <p className="text-lg text-zinc-700">
          아직 기록이 없어요. 위의 기능을 하나 해 보세요!
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="검사한 문자·QR"
            value={`${s.scamCount}건`}
            sub={`위험 ${s.dangerCount}건 찾음`}
          />
          <Stat
            label="배운 방법"
            value={`${s.guideCount}개`}
            sub={`연습 ${s.practiceTotal}번`}
          />
          <Stat
            label="키오스크 연습"
            value={`${s.kioskCount}번`}
            sub={`평균 실수 ${s.avgMistakes}번`}
          />
          <Stat
            label="다음에 연습할 곳"
            value={s.topStuckStep ?? '없음'}
            sub="자주 막힌 단계"
          />
        </dl>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4">
      <dt className="text-base text-zinc-600">{label}</dt>
      <dd className="text-2xl font-bold text-blue-800">{value}</dd>
      <dd className="text-base text-zinc-600">{sub}</dd>
    </div>
  );
}
