'use client';

import { useEffect, useRef } from 'react';
import { ReasonTags } from '@/components/RiskBadge';
import type { CheckResult } from '@/app/(app)/scan-actions';
import type { Risk } from '@/lib/scan/rules';

export type VerdictText = Record<Risk, { title: string; advice: string }>;

// 결과 창 머리: 연한 색 배경 + 색 원 기호 + 위험도 글자. 색만으로 구분하지 않도록 기호와 글자를 함께 쓴다.
const HERO: Record<
  Risk,
  { word: string; tint: string; solid: string; label: string }
> = {
  DANGER: {
    word: '위험',
    tint: 'bg-red-50',
    solid: 'bg-red-600 ring-red-600/15',
    label: 'text-red-700',
  },
  CAUTION: {
    word: '주의',
    tint: 'bg-amber-50',
    solid: 'bg-amber-500 ring-amber-500/15',
    label: 'text-amber-800',
  },
  SAFE: {
    word: '안전',
    tint: 'bg-green-50',
    solid: 'bg-green-600 ring-green-600/15',
    label: 'text-green-700',
  },
};

/** 링크 차단 띠의 색 */
const BLOCK: Record<Risk, string> = {
  DANGER: 'border-red-600 bg-red-50 text-red-700',
  CAUTION: 'border-amber-500 bg-amber-50 text-amber-800',
  SAFE: '',
};

function RiskGlyph({ level }: { level: Risk }) {
  const color = level === 'CAUTION' ? '#1c1917' : '#ffffff';
  return (
    <svg viewBox="0 0 24 24" className="size-9" aria-hidden="true">
      {level === 'SAFE' ? (
        <path
          d="m6.5 12.5 3.6 3.6 7.4-8"
          fill="none"
          stroke={color}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d="M12 6.5v7"
            stroke={color}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17.6" r="1.7" fill={color} />
        </>
      )}
    </svg>
  );
}

/**
 * 검사 결과를 화면 아래에서 크게 띄우는 창(문자·QR 공통).
 * 열리면 창으로 포커스를 옮기고, Esc나 [확인했어요]로 닫으면 onClose가 원래 버튼으로 포커스를 돌려준다.
 */
export function VerdictSheet({
  pending,
  pendingText,
  result,
  texts,
  quoteLabel,
  quoteAside,
  blockedSite,
  quote,
  extraAction,
  onClose,
}: {
  pending: boolean;
  pendingText: string;
  result: CheckResult | null;
  texts: VerdictText;
  /** 검사한 내용 위의 제목(예: "받은 문자") */
  quoteLabel: string;
  /** 제목 오른쪽의 보조 글(예: 보낸 번호) */
  quoteAside?: string;
  /** QR 안의 사이트 이름. 위험이면 "링크 접속을 차단했어요", 주의면 "바로 열지 않았어요"를 판단 이유보다 먼저 보여 준다. */
  blockedSite?: string;
  quote: string;
  /** [확인했어요] 아래에 붙는 보조 버튼(예: 안전한 QR의 "이 주소 열기") */
  extraAction?: React.ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const done = !pending && result !== null;

  useEffect(() => {
    dialogRef.current?.focus();
  }, [done]);

  useEffect(() => {
    if (!done) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, onClose]);

  const hero = result?.ok ? HERO[result.riskLevel] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="verdict-title"
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+20px)] outline-none motion-safe:animate-[sheet-up_300ms_ease-out]"
      >
        <span
          aria-hidden="true"
          className="absolute top-2 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-black/20"
        />
        {!done ? (
          <p
            id="verdict-title"
            role="status"
            className="px-6 pt-14 pb-10 text-center text-2xl font-bold"
          >
            {pendingText}
          </p>
        ) : !result.ok || !hero ? (
          <div className="px-6 pt-10">
            <h2 id="verdict-title" className="text-2xl font-bold">
              검사하지 못했어요
            </h2>
            <p className="mt-2 text-lg">{!result.ok ? result.message : ''}</p>
          </div>
        ) : (
          <>
            <div
              className={`grid justify-items-center gap-1.5 px-6 pt-9 pb-6 text-center ${hero.tint}`}
            >
              <span
                className={`grid size-[4.25rem] place-items-center rounded-full ring-8 ${hero.solid}`}
              >
                <RiskGlyph level={result.riskLevel} />
              </span>
              <span
                className={`mt-3 text-sm font-extrabold tracking-[0.12em] ${hero.label}`}
              >
                {hero.word}
              </span>
              <h2
                id="verdict-title"
                className="text-2xl leading-tight font-bold text-balance"
              >
                {texts[result.riskLevel].title}
              </h2>
              <p className="max-w-[30ch] text-lg leading-relaxed text-zinc-700">
                {texts[result.riskLevel].advice}
              </p>
            </div>

            <div className="px-5">
              {blockedSite && result.riskLevel !== 'SAFE' && (
                <p
                  className={`mt-5 grid gap-0.5 rounded-2xl border-2 px-4 py-3 ${BLOCK[result.riskLevel]}`}
                >
                  <b className="text-lg">
                    {result.riskLevel === 'DANGER'
                      ? '🔒 링크 접속을 차단했어요'
                      : '⚠️ 바로 열지 않았어요'}
                  </b>
                  <span className="text-sm font-bold break-all opacity-85">
                    {blockedSite}
                  </span>
                </p>
              )}
              <p className="mt-5 flex justify-between gap-2 text-sm font-bold text-zinc-600">
                <span>{quoteLabel}</span>
                {quoteAside && (
                  <span className="font-medium">{quoteAside}</span>
                )}
              </p>
              {/* 검사한 내용은 글자 그대로만 보여 준다(HTML로 넣지 않음) */}
              <p className="mt-2 rounded-[6px_18px_18px_18px] bg-zinc-100 px-4 py-3 text-base leading-relaxed break-all whitespace-pre-wrap text-zinc-800">
                {quote}
              </p>
              {result.reasons.length > 0 && (
                <>
                  <p className="mt-5 text-sm font-bold text-zinc-600">
                    왜 그런가요?
                  </p>
                  <div className="mt-2">
                    <ReasonTags
                      level={result.riskLevel}
                      reasons={result.reasons}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}
        {done && (
          <div className="mt-5 grid gap-1 px-5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-13 rounded-2xl bg-zinc-900 text-lg font-bold text-white hover:bg-zinc-800"
            >
              확인했어요
            </button>
            {extraAction}
          </div>
        )}
      </div>
    </div>
  );
}
