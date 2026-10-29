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
