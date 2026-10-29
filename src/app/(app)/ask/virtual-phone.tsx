'use client';

import { useState } from 'react';
import type { Guide, Screen, ScreenItem } from '@/lib/guides';

/** 안내 문장을 소리로 읽어 준다(휴대폰에 내장된 음성 기능). */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

/**
 * 연습용 가상 휴대폰. 단계마다 눌러야 할 곳을 노란 테두리와 화살표로 보여 주고,
 * 다른 곳을 눌러도 괜찮다고 다시 알려 준다.
 */
export function VirtualPhone({
  guide,
  onFinished,
}: {
  guide: Guide;
  onFinished: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const done = index >= guide.steps.length;
  const step = guide.steps[Math.min(index, guide.steps.length - 1)];

  function tap(item: ScreenItem) {
    if (item.id === step.target) {
      const next = index + 1;
      setIndex(next);
      if (next >= guide.steps.length) {
        setFeedback({ ok: true, text: '끝까지 해냈어요! 정말 잘하셨어요.' });
        speak('끝까지 해냈어요! 정말 잘하셨어요.');
        onFinished();
      } else {
        setFeedback({ ok: true, text: '잘하셨어요! 다음 단계예요.' });
        speak(guide.steps[next].instruction);
      }
    } else {
      setFeedback({
        ok: false,
        text: '괜찮아요. 노란 테두리가 있는 곳을 눌러 보세요.',
      });
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-3xl border-2 border-yellow bg-cream p-4"
        aria-live="polite"
      >
        {done ? (
          <p className="text-xl font-extrabold text-navy">
            🎉 {guide.title}, 끝까지 해냈어요!
          </p>
        ) : (
          <>
            <p className="text-base font-bold text-muted">
              {index + 1} / {guide.steps.length}단계
            </p>
            <p className="text-xl font-extrabold">{step.instruction}</p>
            <button
              type="button"
              onClick={() => speak(step.instruction)}
              className="mt-2 min-h-12 rounded-xl border-2 border-navy bg-white px-4 text-lg font-bold text-navy"
            >
              🔊 소리로 듣기
            </button>
          </>
        )}
        {feedback && (
          <p
            className={`mt-2 text-lg font-bold ${feedback.ok ? 'text-safe' : 'text-caution'}`}
          >
            {feedback.text}
          </p>
        )}
      </div>

      <div
        aria-label="연습용 가상 휴대폰"
        className="relative mx-auto aspect-[9/17] w-full max-w-[320px] overflow-hidden rounded-[2.5rem] border-[10px] border-gray-900 bg-white"
      >
        <div className="flex justify-between bg-gray-100 px-5 py-1 text-sm font-bold text-gray-600">
          <span>10:30</span>
          <span>📶 🔋</span>
        </div>
        {done ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-6xl" aria-hidden>
              🎉
            </p>
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setFeedback(null);
              }}
              className="min-h-12 rounded-xl bg-navy px-5 text-lg font-bold text-white"
            >
              처음부터 다시
            </button>
          </div>
        ) : (
          <ScreenView screen={step.screen} target={step.target} onTap={tap} />
        )}
      </div>
    </div>
  );
}

function Tap({
  item,
  target,
  onTap,
  className,
  children,
}: {
  item: ScreenItem;
  target: string;
  onTap: (i: ScreenItem) => void;
  className: string;
  children: React.ReactNode;
}) {
  const isTarget = item.id === target;
  return (
    <button
      type="button"
      onClick={() => onTap(item)}
      aria-label={isTarget ? `${item.label} (여기를 누르세요)` : item.label}
      className={`relative ${className} ${isTarget ? 'guide-target' : ''}`}
    >
      {isTarget && (
        <span
          aria-hidden
          className="absolute -top-7 left-1/2 z-10 text-2xl"
          style={{ animation: 'bounce-arrow 0.9s infinite' }}
        >
          👇
        </span>
      )}
      {children}
    </button>
  );
}

function ScreenView({
  screen,
  target,
  onTap,
}: {
  screen: Screen;
  target: string;
  onTap: (i: ScreenItem) => void;
}) {
  if (screen.kind === 'home') {
    return (
      <div className="grid h-full grid-cols-3 content-start gap-x-2 gap-y-8 bg-gradient-to-b from-sky-200 to-indigo-200 px-3 pt-12">
        {screen.items.map((it) => (
          <Tap
            key={it.id}
            item={it}
            target={target}
            onTap={onTap}
            className="flex flex-col items-center gap-1 rounded-2xl p-1"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow">
              {it.icon}
            </span>
            <span className="text-sm font-bold text-gray-800">{it.label}</span>
          </Tap>
        ))}
      </div>
    );
  }
  if (screen.kind === 'camera') {
    return (
      <div className="flex h-full flex-col bg-black">
        <div
          className="flex flex-1 items-center justify-center text-6xl"
          aria-hidden
        >
          🌳
        </div>
        <div className="flex items-center justify-around px-4 pb-14 pt-4">
          {screen.items.map((it) => (
            <Tap
              key={it.id}
              item={it}
              target={target}
              onTap={onTap}
              className={
                it.id === 'shutter'
                  ? 'h-16 w-16 rounded-full border-4 border-white bg-white/90'
                  : 'h-12 w-12 rounded-full bg-gray-700 text-xs text-white'
              }
            >
              {it.id === 'shutter' ? (
                <span className="sr-only">{it.label}</span>
              ) : (
                it.label
              )}
            </Tap>
          ))}
        </div>
      </div>
    );
  }
  if (screen.kind === 'chat') {
    return (
      <div className="flex h-full flex-col bg-sky-50">
        <p className="border-b bg-white px-4 py-3 text-lg font-bold">
          {screen.title}
        </p>
        <div className="flex-1 space-y-2 p-3">
          {screen.messages.map((m) => (
            <p
              key={m}
              className="w-fit max-w-[85%] rounded-2xl bg-white px-3 py-2 text-base shadow-sm"
            >
              {m}
            </p>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t bg-white p-2 pb-10">
          {screen.items.map((it) => (
            <Tap
              key={it.id}
              item={it}
              target={target}
              onTap={onTap}
              className={
                it.id === 'input'
                  ? 'min-h-11 flex-1 rounded-full bg-gray-100 px-3 text-left text-sm text-gray-400'
                  : 'min-h-11 min-w-11 rounded-full bg-yellow-300 px-3 text-base font-bold'
              }
            >
              {it.label}
            </Tap>
          ))}
        </div>
      </div>
    );
  }
  if (screen.kind === 'grid') {
    return (
      <div className="h-full bg-white">
        <p className="border-b px-4 py-3 text-lg font-bold">{screen.title}</p>
        <div className="grid grid-cols-2 gap-4 p-4 pt-8">
          {screen.items.map((it) => (
            <Tap
              key={it.id}
              item={it}
              target={target}
              onTap={onTap}
              className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-gray-100"
            >
              <span className="text-4xl">{it.icon}</span>
              <span className="text-base font-bold">{it.label}</span>
            </Tap>
          ))}
        </div>
      </div>
    );
  }
  if (screen.kind === 'slider') {
    return (
      <div className="h-full bg-white">
        <p className="border-b px-4 py-3 text-lg font-bold">{screen.title}</p>
        <p className="px-4 py-6 text-center text-lg">가나다 글자 미리보기</p>
        <div className="mx-4 flex items-center gap-3 pt-6">
          <Tap
            item={screen.items[0]}
            target={target}
            onTap={onTap}
            className="min-h-12 min-w-12 rounded-xl bg-gray-100 text-base font-bold"
          >
            {screen.items[0].label}
          </Tap>
          <div className="h-2 flex-1 rounded-full bg-gray-200">
            <div className="h-2 w-1/3 rounded-full bg-navy" />
          </div>
          <Tap
            item={screen.items[1]}
            target={target}
            onTap={onTap}
            className="min-h-12 min-w-12 rounded-xl bg-gray-100 text-xl font-bold"
          >
            {screen.items[1].label}
          </Tap>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full bg-white">
      <p className="border-b px-4 py-3 text-lg font-bold">{screen.title}</p>
      <ul className="space-y-3 p-3 pt-8">
        {screen.items.map((it) => (
          <li key={it.id}>
            <Tap
              item={it}
              target={target}
              onTap={onTap}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-gray-50 px-3 text-left text-base"
            >
              <span className="text-2xl">{it.icon}</span>
              <span className="font-semibold">{it.label}</span>
            </Tap>
          </li>
        ))}
      </ul>
    </div>
  );
}
