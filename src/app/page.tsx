import Link from 'next/link';

const FEATURES = [
  {
    title: '문자·카톡 검사',
    body: '받은 메시지를 붙여 넣으면 사기 문자인지 바로 알려 드려요.',
    icon: '💬',
  },
  {
    title: 'QR 코드 검사',
    body: 'QR 코드를 찍으면 열기 전에 위험한 주소인지 먼저 확인해요.',
    icon: '📷',
  },
  {
    title: '보호자 연락처',
    body: '위험한 문자를 받으면 가족에게 바로 전화할 수 있어요.',
    icon: '👨‍👩‍👧',
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16">
      <p className="text-lg font-bold text-blue-700">안심 지킴이</p>
      <h1 className="mt-3 text-4xl leading-tight font-bold sm:text-5xl">
        이 문자, 눌러도 될까요?
        <br />
        먼저 물어보세요.
      </h1>
      <p className="mt-5 text-xl leading-9 text-zinc-700">
        택배·가족·정부 기관을 사칭한 사기 문자(스미싱)를 쉬운 말로 알려 드리는
        서비스입니다.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/check"
          className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-blue-700 px-8 text-xl font-bold text-white hover:bg-blue-800"
        >
          문자 검사 시작하기
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-zinc-300 bg-white px-8 text-xl font-bold hover:bg-zinc-50"
        >
          로그인 · 가입
        </Link>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="rounded-2xl border-2 border-zinc-200 bg-white p-5"
          >
            <p className="text-3xl" aria-hidden="true">
              {feature.icon}
            </p>
            <h2 className="mt-2 text-xl font-bold">{feature.title}</h2>
            <p className="mt-2 text-lg leading-8 text-zinc-700">
              {feature.body}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
