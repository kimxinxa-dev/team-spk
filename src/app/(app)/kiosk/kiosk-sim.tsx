'use client';

import { useRef, useState } from 'react';
import type { KioskStep, Option, Scenario } from './scenarios';

export type KioskResult = {
  durationSec: number;
  mistakes: number;
  stuckStep: string | null;
};

/**
 * 실제 무인기처럼 생긴 연습 화면. 틀리면 부드럽게 다시 알려 주고,
 * [도와주세요]를 누르면 눌러야 할 곳에 노란 테두리를 보여 준다.
 */
export function KioskSim({
  scenario,
  onFinish,
  onQuit,
}: {
  scenario: Scenario;
  onFinish: (r: KioskResult) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState<number[]>(() =>
    scenario.steps.map(() => 0),
  );
  const [hint, setHint] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const startedAt = useRef<number | null>(null);
  const step = scenario.steps[index];

  function wrong(text: string) {
    setMistakes((m) => m.map((v, i) => (i === index ? v + 1 : v)));
    setMessage(text);
  }

  function next() {
    setHint(false);
    setMessage(null);
    setCode('');
    if (index + 1 < scenario.steps.length) {
      setIndex(index + 1);
      return;
    }
    setDone(true);
    const total = mistakes.reduce((a, b) => a + b, 0);
    const worst = mistakes.indexOf(Math.max(...mistakes));
    onFinish({
      durationSec: Math.max(
        1,
        Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000),
      ),
      mistakes: total,
      stuckStep: total > 0 ? scenario.steps[worst].name : null,
    });
  }

  function choose(option: Option) {
    startedAt.current ??= Date.now();
    if (option.id === step.answer) {
      if (step.kind === 'pay') {
        setPaying(true);
        setTimeout(() => {
          setPaying(false);
          next();
        }, 1800);
      } else next();
    } else {
      wrong('괜찮아요, 다시 해 볼까요? 위의 연습 과제를 다시 읽어 보세요.');
    }
  }

  function press(key: string) {
    startedAt.current ??= Date.now();
    if (step.kind !== 'keypad') return;
    if (key === '지움') setCode((c) => c.slice(0, -1));
    else if (key === '확인') {
      if (code === step.answer) next();
      else
        wrong(`숫자가 달라요. ${step.answer.length}자리를 다시 눌러 보세요.`);
    } else if (code.length < step.answer.length) setCode((c) => c + key);
  }

  if (done) {
    return (
      <div
        className={`overflow-hidden rounded-3xl border-4 border-gray-800 bg-white`}
      >
        <div
          className={`${scenario.theme} px-5 py-4 text-xl font-extrabold text-white`}
        >
          {scenario.brand}
        </div>
        <div className="space-y-3 p-8 text-center">
          <p className="text-6xl" aria-hidden>
            🎉
          </p>
          <p className="text-3xl font-extrabold">{scenario.doneTitle}</p>
          <p className="text-xl">{scenario.doneText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-yellow bg-cream p-4">
        <p className="text-base font-bold text-muted">연습 과제</p>
        <p className="text-lg font-bold">{scenario.mission}</p>
      </div>

      <div
        className="overflow-hidden rounded-3xl border-4 border-gray-800 bg-gray-50 shadow-lg"
        aria-label={`${scenario.brand} 연습용 키오스크`}
      >
        <div
          className={`${scenario.theme} flex items-center justify-between px-5 py-3 text-white`}
        >
          <span className="text-xl font-extrabold">
            {scenario.icon} {scenario.brand}
          </span>
          <span className="text-base">
            {index + 1} / {scenario.steps.length}
          </span>
        </div>
        <div className="min-h-[360px] space-y-4 p-4">
          <h3 className="text-2xl font-extrabold">{step.title}</h3>
          {step.kind === 'choice' && step.tabs && (
            <div className="flex gap-1 overflow-x-auto" aria-hidden>
              {step.tabs.map((t) => (
                <span
                  key={t}
                  className={`rounded-t-xl px-4 py-2 text-lg font-bold ${t === step.tab ? `${scenario.theme} text-white` : 'bg-gray-200'}`}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {step.kind === 'keypad' ? (
            <Keypad step={step} code={code} hint={hint} onPress={press} />
          ) : paying ? (
            <div
              role="status"
              className="flex flex-col items-center gap-3 py-10 text-center"
            >
              <span className="text-6xl" aria-hidden>
                💳
              </span>
              <p className="text-2xl font-extrabold">
                카드를 아래 투입구에 꽂아 주세요
              </p>
              <p className="text-lg text-muted">
                결제 중이에요. 카드를 빼지 마세요…
              </p>
            </div>
          ) : (
            <Options step={step} hint={hint} onChoose={choose} />
          )}
        </div>
        <div className="flex gap-2 border-t bg-white p-3">
          <button
            type="button"
            onClick={onQuit}
            className="min-h-12 flex-1 rounded-xl bg-gray-200 text-lg font-bold"
          >
            처음으로 (그만하기)
          </button>
          <button
            type="button"
            onClick={() => setHint(true)}
            className="min-h-12 flex-1 rounded-xl bg-yellow text-lg font-bold"
          >
            🙋 도와주세요
          </button>
        </div>
      </div>
      {message && (
        <p
          role="alert"
          className="rounded-2xl bg-amber-50 p-3 text-lg font-bold text-caution"
        >
          {message}
        </p>
      )}
    </div>
  );
}

function Options({
  step,
  hint,
  onChoose,
}: {
  step: Exclude<KioskStep, { kind: 'keypad' }>;
  hint: boolean;
  onChoose: (o: Option) => void;
}) {
  const layout = step.kind === 'pay' ? 'big' : step.layout;
  const cls =
    layout === 'grid'
      ? 'grid grid-cols-2 gap-3'
      : layout === 'big'
        ? 'grid gap-3 sm:grid-cols-2'
        : 'grid gap-3';
  return (
    <div className={cls}>
      {step.options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChoose(o)}
          className={`flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm active:scale-[0.98] ${layout === 'grid' ? 'flex-col justify-center text-center' : ''} ${layout === 'big' ? 'min-h-24' : 'min-h-16'} ${hint && o.id === step.answer ? 'guide-target' : ''}`}
        >
          {o.icon && (
            <span className={layout === 'list' ? 'text-3xl' : 'text-5xl'}>
              {o.icon}
            </span>
          )}
          <span>
            <span className="block text-xl font-extrabold">{o.label}</span>
            {o.sub && (
              <span className="block text-base text-muted">{o.sub}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

function Keypad({
  step,
  code,
  hint,
  onPress,
}: {
  step: Extract<KioskStep, { kind: 'keypad' }>;
  code: string;
  hint: boolean;
  onPress: (k: string) => void;
}) {
  const expectedNext = step.answer[code.length];
  return (
    <div className="mx-auto max-w-xs space-y-3">
      <p
        className="rounded-xl border-2 border-gray-300 bg-white py-3 text-center text-3xl font-bold tracking-[0.4em]"
        aria-live="polite"
      >
        {code.padEnd(step.answer.length, '_')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '지움', '0', '확인'].map(
          (k) => {
            const highlight =
              hint &&
              (code.length === step.answer.length
                ? k === '확인'
                : k === expectedNext);
            return (
              <button
                key={k}
                type="button"
                onClick={() => onPress(k)}
                className={`min-h-14 rounded-xl text-2xl font-bold ${k === '확인' ? 'bg-navy text-white' : 'bg-white shadow'} ${highlight ? 'guide-target' : ''}`}
              >
                {k}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}
