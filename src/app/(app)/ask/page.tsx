import { Suspense } from 'react';
import { HistorySkeleton } from '@/components/ScanHistory';
import { requireUser } from '@/lib/auth';
import { AskClient } from './ask-client';

export const metadata = { title: '말로 물어보기 — 안심 지킴이' };

/** 주요 기능 2. 말로 물어보기: 음성으로 묻고 노란 테두리를 따라 연습, 배움 노트 저장 */
export default function AskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">말로 물어보기</h1>
        <p className="mt-2 text-lg text-zinc-700">
          하고 싶은 일을 말해 보세요. 눌러야 할 곳을 노란 테두리로 한 단계씩
          알려 드려요.
        </p>
      </div>
      <Suspense fallback={<HistorySkeleton />}>
        <Guarded />
      </Suspense>
    </div>
  );
}

async function Guarded() {
  await requireUser();
  return <AskClient />;
}
