'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Notice } from '@/components/ui';
import { VirtualPhone } from '@/lib/phone/engine';
import { analyzeScan } from '@/lib/scan/analyze';
import { createDemoScan } from '../scan-actions';
import { DEMO_SAMPLES, type DemoSample } from './samples';

/**
 * 체험 문자 받기: 자유롭게 조작하는 가상 휴대폰을 쓰다가 체험 문자가 도착하면
 * 그 순간 AI가 채점해 경고 팝업을 띄우고, 문자 속 링크를 누르면 차단·설치 가리기를 보여 준다.
 * 검사 결과는 서버에서 다시 채점해 아래 검사 기록에 저장한다.
 */
export function DemoPhone() {
  const hostRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<VirtualPhone | null>(null);
  const [sample, setSample] = useState<DemoSample>(DEMO_SAMPLES[0]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!hostRef.current) return;
    const phone = new VirtualPhone(hostRef.current, {
      analyze: (text) => analyzeScan('MESSAGE', text),
    });
    phoneRef.current = phone;
    return () => phone.destroy();
  }, []);

  async function receive() {
    setBusy(true);
    setNotice(null);
    phoneRef.current?.receiveMessage({
      app: sample.app === '문자' ? 'sms' : 'messenger',
      from: sample.sender,
      text: sample.content,
    });
    const res = await createDemoScan({ sampleId: sample.id });
    setBusy(false);
    setNotice(
      res.ok
        ? { ok: true, text: '검사 결과를 아래 검사 기록에 저장했어요.' }
        : { ok: false, text: res.message },
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <p className="text-lg">
          휴대폰을 마음대로 쓰다가 [체험 문자 받기]를 눌러 보세요. 문자가 오는
          순간 AI가 채점하고, 위험하면 경고 팝업이 떠요. 문자 앱에서 링크를
          누르면 차단 화면이 나와요.
        </p>
        <fieldset className="space-y-2">
          <legend className="text-lg font-bold">
            어떤 문자를 받아 볼까요?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_SAMPLES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sample.id === s.id}
                onClick={() => setSample(s)}
                className={`min-h-12 rounded-2xl border-2 px-3 text-lg font-bold ${sample.id === s.id ? 'border-navy bg-navy text-white' : 'border-line bg-white'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <Button onClick={receive} loading={busy} className="w-full">
          📩 체험 문자 받기
        </Button>
        {notice && (
          <Notice kind={notice.ok ? 'success' : 'error'}>{notice.text}</Notice>
        )}
        <p className="text-base text-muted">
          체험용 가짜 문자예요. 휴대폰의 메시지 앱에서 문자를 누르면 [복사]할 수
          있어요. 복사한 문자나 실제로 받은 문자는 「붙여 넣기」 탭에 붙여
          넣거나 문자 앱의 [공유] → 안심 지킴이로 검사할 수 있어요.
        </p>
      </div>
      <div ref={hostRef} className="grid justify-items-center" />
    </div>
  );
}
