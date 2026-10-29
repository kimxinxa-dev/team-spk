import type { Risk } from '@/lib/scan/rules';

// 색만으로 구분하지 않도록 글자와 기호를 함께 보여 준다.
const RISK_STYLE: Record<
  Risk,
  { label: string; icon: string; className: string }
> = {
  DANGER: { label: '위험', icon: '⛔', className: 'bg-red-700 text-white' },
  CAUTION: {
    label: '주의',
    icon: '⚠️',
    className: 'bg-amber-300 text-amber-950',
  },
  SAFE: { label: '안전', icon: '✅', className: 'bg-green-700 text-white' },
};

export function RiskBadge({ level }: { level: Risk }) {
  const style = RISK_STYLE[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-lg font-bold ${style.className}`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {style.label}
    </span>
  );
}

const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** 한국 시간으로 표시(저장 값은 그대로 두고 표시만 바꾼다) */
export function formatKst(date: Date) {
  return dateFormat.format(date);
}

const TAG_STYLE: Record<Risk, string> = {
  DANGER: 'bg-red-100 text-red-800',
  CAUTION: 'bg-amber-100 text-amber-900',
  SAFE: 'bg-green-100 text-green-800',
};

/** 위험하다고 본 이유를 짧은 태그로 보여 준다(긴 문장 목록보다 한눈에 읽기 쉽게). */
export function ReasonTags({
  level,
  reasons,
}: {
  level: Risk;
  reasons: string[];
}) {
  if (reasons.length === 0) return null;
  return (
    <ul aria-label="이렇게 판단한 이유" className="flex flex-wrap gap-2">
      {reasons.map((reason) => (
        <li
          key={reason}
          className={`rounded-full px-3 py-1 text-base font-bold ${TAG_STYLE[level]}`}
        >
          {reason}
        </li>
      ))}
    </ul>
  );
}
