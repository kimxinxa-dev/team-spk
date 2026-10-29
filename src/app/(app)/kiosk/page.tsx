import { Suspense } from 'react';
import { HistorySkeleton } from '@/components/ScanHistory';
import { requireUser } from '@/lib/auth';
import { KioskClient } from './kiosk-client';

export const metadata = { title: '키오스크 연습 — 안심 지킴이' };

/** 주요 기능 3. 키오스크 연습: 음식점·병원·기차역 무인기 연습과 연습 기록 */
export default function KioskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">키오스크 연습</h1>
        <p className="mt-2 text-lg text-zinc-700">
          실제 무인기와 같은 순서로 연습해요. 틀려도 괜찮고, 막히면
          [도와주세요]를 누르세요.
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
  return <KioskClient />;
}
