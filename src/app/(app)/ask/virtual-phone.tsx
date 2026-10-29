'use client';

import { useEffect, useRef, useState } from 'react';
import type { Guide } from '@/lib/guides';
import { VirtualPhone as PhoneEngine } from '@/lib/phone/engine';
import { analyzeScan } from '@/lib/scan/analyze';

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
 * 자유롭게 조작하는 연습용 가상 휴대폰 위에서 안내를 진행한다.
 * 지금 눌러야 할 곳에 노란 테두리를 띄우고, 다른 화면으로 가면 돌아오는 방법을 알려 준다.
 */
export function VirtualPhone({
  guide,
  onFinished,
}: {
  guide: Guide;
  onFinished: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(onFinished);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (!hostRef.current) return;
    const phone = new PhoneEngine(hostRef.current, {
      analyze: (text) => analyzeScan('MESSAGE', text),
      onEvent: (e) => {
        if (e.type === 'guide-step') {
          setIndex(e.index);
          speak(guide.steps[e.index].instruction);
        }
        if (e.type === 'guide-done') {
          setIndex(guide.steps.length);
          speak('끝까지 해냈어요! 정말 잘하셨어요.');
          finishedRef.current();
        }
      },
    });
    phone.startGuide(guide);
    return () => phone.destroy();
  }, [guide]);

  const done = index >= guide.steps.length;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_340px]">
      <div className="space-y-3" aria-live="polite">
        <ol className="list-decimal space-y-1 rounded-2xl border-2 border-yellow bg-cream p-4 pl-9 text-lg">
          {guide.steps.map((s, i) => (
            <li
              key={s.target}
              className={
                i < index
                  ? 'text-muted line-through'
                  : i === index
                    ? 'font-bold text-navy'
                    : ''
              }
            >
              {s.instruction}
            </li>
          ))}
        </ol>
        {done ? (
          <p className="text-xl font-bold text-safe">
            🎉 {guide.title}, 끝까지 해냈어요!
          </p>
        ) : (
          <button
            type="button"
            onClick={() => speak(guide.steps[index].instruction)}
            className="min-h-12 rounded-xl border-2 border-navy bg-white px-4 text-lg font-bold text-navy"
          >
            🔊 소리로 듣기
          </button>
        )}
        <p className="text-base text-muted">
          휴대폰은 자유롭게 눌러 볼 수 있어요. 다른 화면으로 가면 ◁ 뒤로·▢ 홈
          버튼으로 돌아오는 방법을 알려 드려요.
        </p>
      </div>
      <div ref={hostRef} className="grid justify-items-center" />
    </div>
  );
}
