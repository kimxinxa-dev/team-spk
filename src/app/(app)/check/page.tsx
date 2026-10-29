import { Suspense } from 'react';
import { HistorySkeleton, ScanHistory } from '@/components/ScanHistory';
import { DemoPhone } from './demo-phone';
import { GuardTabs } from './GuardTabs';
import { MessageCheckForm } from './MessageCheckForm';
import { QrScanner } from './QrScanner';

export const metadata = { title: '문자 지킴이 — 안심 지킴이' };

/**
 * 스미싱 차단. 주요 기능 1 실시간 문자 인식·감지·차단(demo), 2 QR 감지(qr),
 * 3 붙여 넣은 문자의 AI 판단(message)이 검사 기록 하나를 함께 쓴다.
 */
export default function CheckPage() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="check-title" className="space-y-4">
        <div>
          <h1 id="check-title" className="text-3xl font-bold">
            문자 지킴이
          </h1>
          <p className="mt-2 text-lg text-zinc-700">
            문자·카카오톡·QR 코드가 사기인지 학습된 AI가 바로 채점하고, 위험하면
            막아 드려요.
          </p>
        </div>
        <Suspense fallback={<HistorySkeleton />}>
          <GuardTabs
            panels={{
              demo: <DemoPhone />,
              message: (
                <div className="space-y-2">
                  <p className="text-lg text-zinc-700">
                    받은 문자를 길게 눌러 복사한 뒤 붙여 넣으면, AI가 스미싱인지
                    판단해 드려요.
                  </p>
                  <MessageCheckForm />
                </div>
              ),
              qr: (
                <div className="space-y-2">
                  <p className="text-lg text-zinc-700">
                    QR 코드를 찍으면 바로 열지 않고, 위험한 주소인지 먼저 알려
                    드려요.
                  </p>
                  <QrScanner />
                </div>
              ),
            }}
          />
        </Suspense>
      </section>

      <section aria-labelledby="history-title">
        <h2 id="history-title" className="mb-2 text-2xl font-bold">
          검사 기록
        </h2>
        <p className="mb-4 text-base text-zinc-600">
          결과가 맞는지 알려 주시면(사기 맞아요 / 아니에요) 다음 검사부터 내
          기록에 맞춰 더 정확하게 판단해요.
        </p>
        <Suspense fallback={<HistorySkeleton />}>
          <ScanHistory />
        </Suspense>
      </section>
    </div>
  );
}
