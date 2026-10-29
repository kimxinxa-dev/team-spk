import { Suspense } from 'react';
import { HistorySkeleton, ScanHistory } from '@/components/ScanHistory';
import { MessageCheckForm } from './MessageCheckForm';

export const metadata = { title: '문자 검사 — 안심 지킴이' };

export default function CheckPage() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="check-title">
        <h1 id="check-title" className="text-3xl font-bold">
          문자·카톡 검사
        </h1>
        <p className="mt-2 text-lg text-zinc-700">
          받은 메시지를 길게 눌러 복사한 뒤, 아래 칸에 붙여 넣으세요.
        </p>
        <MessageCheckForm />
      </section>

      <section aria-labelledby="history-title">
        <h2 id="history-title" className="mb-4 text-2xl font-bold">
          검사 기록
        </h2>
        <Suspense fallback={<HistorySkeleton />}>
          <ScanHistory kind="MESSAGE" />
        </Suspense>
      </section>
    </div>
  );
}
