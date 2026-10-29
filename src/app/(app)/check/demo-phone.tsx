'use client';

import { useState } from 'react';
import { Button, Notice } from '@/components/ui';
import type { Risk } from '@/lib/scan/rules';
import { createDemoScan } from '../scan-actions';
import { DEMO_SAMPLES, type DemoSample } from './samples';

type Stage = 'idle' | 'incoming' | 'checking' | 'popup' | 'blocked' | 'install';

export const RISK: Record<
  Risk,
  { color: string; bg: string; icon: string; title: string }
> = {
  DANGER: {
    color: 'text-danger',
    bg: 'bg-red-50 border-danger',
    icon: '🚨',
    title: '사기 문자일 가능성이 높아요',
  },
  CAUTION: {
    color: 'text-caution',
    bg: 'bg-amber-50 border-caution',
    icon: '⚠️',
    title: '조심하세요, 의심스러운 문자예요',
  },
  SAFE: {
    color: 'text-safe',
    bg: 'bg-green-50 border-safe',
    icon: '✅',
    title: '위험한 점을 찾지 못했어요',
  },
};

type DemoResult = { riskLevel: Risk; score: number; reasons: string[] };

/**
 * 체험 문자 받기: 가상 휴대폰에 체험용 문자가 도착하는 순간 AI가 채점하고,
 * 위험도에 따라 경고 팝업 → 링크 차단 → 설치 화면 가리기까지 보여 준다. 검사 결과는 아래 기록에 저장된다.
 */
export function DemoPhone() {
  const [sample, setSample] = useState<DemoSample>(DEMO_SAMPLES[0]);
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function receive() {
    setError(null);
    setResult(null);
    setStage('incoming');
    await new Promise((r) => setTimeout(r, 1200));
    setStage('checking');
    const res = await createDemoScan({ sampleId: sample.id });
    if (!res.ok) {
      setError(res.message);
      setStage('idle');
      return;
    }
    setResult(res);
    setStage('popup');
  }

  const r = result ? RISK[result.riskLevel] : null;
  const hasLink = /\b[a-z0-9-]+\.[a-z]{2,}\//i.test(sample.content);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <div className="space-y-4">
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
                onClick={() => {
                  setSample(s);
                  setStage('idle');
                }}
                className={`min-h-12 rounded-2xl border-2 px-3 text-lg font-bold ${sample.id === s.id ? 'border-navy bg-navy text-white' : 'border-line bg-white'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <Button
          onClick={receive}
          loading={stage === 'incoming' || stage === 'checking'}
          className="w-full"
        >
          📩 체험 문자 받기
        </Button>
        {error && <Notice kind="error">{error}</Notice>}
        <p className="text-base text-muted">
          체험용 가짜 문자예요. 실제로 받은 문자는 「붙여 넣어 검사」나 문자
          앱의 [공유] → 도움폰으로 검사할 수 있어요.
        </p>
      </div>

      {/* 가상 휴대폰 */}
      <div
        aria-label="체험용 가상 휴대폰"
        className="relative mx-auto aspect-[9/17] w-full max-w-[320px] overflow-hidden rounded-[2.5rem] border-[10px] border-gray-900 bg-gradient-to-b from-sky-100 to-indigo-100"
      >
        <div className="flex justify-between px-5 pt-2 text-sm font-bold text-gray-700">
          <span>10:30</span>
          <span>📶 🔋</span>
        </div>
        <div className="mt-10 text-center text-5xl font-light text-gray-800">
          10:30
        </div>
        <div className="text-center text-base text-gray-600">
          10월 29일 목요일
        </div>

        {stage !== 'idle' && (
          <div
            className="notify-in absolute inset-x-3 top-8 rounded-2xl bg-white/95 p-3 shadow-lg"
            role="status"
          >
            <p className="text-sm font-bold text-gray-500">
              {sample.app === '문자' ? '✉️ 문자' : '💬 메신저'} ·{' '}
              {sample.sender}
            </p>
            <p className="line-clamp-3 text-base text-gray-900">
              {sample.content}
            </p>
          </div>
        )}

        {stage === 'checking' && (
          <div
            className="absolute inset-x-3 bottom-6 rounded-2xl bg-navy p-3 text-center text-base font-bold text-white"
            role="status"
          >
            🛡️ 도움폰 AI가 검사하고 있어요…
          </div>
        )}

        {stage === 'popup' && result && r && (
          <div
            className="absolute inset-0 flex items-center bg-black/55 p-3"
            role="alertdialog"
            aria-label={r.title}
          >
            <div
              className={`w-full space-y-2 rounded-2xl border-4 bg-white p-4 ${r.bg}`}
            >
              <p className={`text-xl font-extrabold ${r.color}`}>
                {r.icon} {r.title}
              </p>
              <p className="text-base font-bold">위험 점수 {result.score}점</p>
              <ul className="list-disc pl-5 text-base">
                {result.reasons.slice(0, 2).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <div className="grid gap-2 pt-1">
                {result.riskLevel !== 'SAFE' && hasLink && (
                  <button
                    type="button"
                    onClick={() => setStage('blocked')}
                    className="min-h-12 rounded-xl border-2 border-gray-300 bg-white text-base font-bold"
                  >
                    실수로 링크를 누르면?
                  </button>
                )}
                {result.riskLevel !== 'SAFE' && (
                  <button
                    type="button"
                    onClick={() => setStage('install')}
                    className="min-h-12 rounded-xl border-2 border-gray-300 bg-white text-base font-bold"
                  >
                    앱 설치 화면이 뜨면?
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStage('idle')}
                  className="min-h-12 rounded-xl bg-navy text-base font-bold text-white"
                >
                  알겠어요
                </button>
              </div>
            </div>
          </div>
        )}

        {stage === 'blocked' && (
          <div
            className="absolute inset-0 flex flex-col justify-center gap-3 bg-slate-900/95 p-5 text-white"
            role="alertdialog"
            aria-label="위험한 사이트를 막았어요"
          >
            <p className="text-2xl font-extrabold">
              🛡️ 위험한 사이트를 막았어요
            </p>
            <p className="text-lg">
              사기 문자에 있던 사이트예요. 열지 않고 닫았어요.
              이름·비밀번호·계좌번호를 넣지 마세요.
            </p>
            <button
              type="button"
              onClick={() => setStage('popup')}
              className="min-h-12 rounded-xl bg-yellow text-lg font-bold text-gray-900"
            >
              알겠어요
            </button>
          </div>
        )}

        {stage === 'install' && (
          <div
            className="absolute inset-0 flex flex-col justify-center gap-3 bg-slate-900/95 p-5 text-white"
            role="alertdialog"
            aria-label="앱 설치를 멈췄어요"
          >
            <p className="text-2xl font-extrabold">
              잠깐만요! 앱을 설치하려고 해요
            </p>
            <p className="text-lg">
              조금 전 사기 의심 문자를 받았어요. 문자 안내로 설치하는 앱은
              휴대폰 속 돈과 정보를 빼갈 수 있어요. 가족에게 먼저 물어보세요.
            </p>
            <button
              type="button"
              onClick={() => setStage('popup')}
              className="min-h-12 rounded-xl bg-yellow text-lg font-bold text-gray-900"
            >
              설치하지 않을래요
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
