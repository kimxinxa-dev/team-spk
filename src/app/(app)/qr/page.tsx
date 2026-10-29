import { Suspense } from 'react';
import { HistorySkeleton, ScanHistory } from '@/components/ScanHistory';
import { QrScanner } from './QrScanner';

export const metadata = { title: 'QR 검사 — 안심 지킴이' };

export default function QrPage() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="qr-title">
        <h1 id="qr-title" className="text-3xl font-bold">
          QR 코드 검사
        </h1>
        <p className="mt-2 text-lg text-zinc-700">
          QR 코드를 찍으면 바로 열지 않고, 위험한 주소인지 먼저 알려 드려요.
        </p>
        <QrScanner />
      </section>

      <section aria-labelledby="qr-history-title">
        <h2 id="qr-history-title" className="mb-4 text-2xl font-bold">
          검사 기록
        </h2>
        <Suspense fallback={<HistorySkeleton />}>
          <ScanHistory kind="QR" />
        </Suspense>
      </section>
    </div>
  );
}
