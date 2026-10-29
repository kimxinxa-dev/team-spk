'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const TABS = [
  { id: 'demo', label: '📩 체험 문자' },
  { id: 'message', label: '✍️ 문자 검사' },
  { id: 'qr', label: '📷 QR 검사' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * 문자 지킴이의 세 가지 검사 방법을 탭으로 나눈다.
 * 문자 앱에서 [공유]로 들어오면(text가 있으면) 문자 검사 탭을 먼저 연다.
 */
export function GuardTabs({ panels }: { panels: Record<TabId, ReactNode> }) {
  const params = useSearchParams();
  const shared = params.has('text') || params.has('url');
  const requested = params.get('tab');
  const initial: TabId = shared
    ? 'message'
    : TABS.some((t) => t.id === requested)
      ? (requested as TabId)
      : 'demo';
  const [tab, setTab] = useState<TabId>(initial);

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="검사 방법"
        className="grid grid-cols-3 gap-2"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-h-14 rounded-2xl px-1 text-base font-bold sm:text-lg ${
              tab === t.id
                ? 'bg-blue-700 text-white'
                : 'border-2 border-zinc-300 bg-white text-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {TABS.map((t) => (
        <div
          key={t.id}
          id={`panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={tab !== t.id}
        >
          {panels[t.id]}
        </div>
      ))}
    </div>
  );
}
