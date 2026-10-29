import { requireUser } from '@/lib/auth';
import { listScans } from '@/lib/queries';
import { formatKst } from '@/components/RiskBadge';
import { ScanCard } from '@/components/ScanCard';
import type { ScanKind, ScanSource } from '@/generated_prisma/client';

const SOURCE_LABEL: Record<ScanSource, string> = {
  SMS: '문자',
  KAKAO: '카카오톡',
  OTHER: '기타',
  QR: 'QR 코드',
};

/** 내 검사 기록 목록(서버에서 로그인 확인 후 내 자료만 읽는다). Suspense 안에서 쓴다. */
export async function ScanHistory({ kind }: { kind?: ScanKind }) {
  const user = await requireUser();
  const scans = await listScans(user.id, kind);

  if (scans.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center text-lg text-zinc-600">
        아직 검사한 기록이 없어요. 위에서 검사해 보세요.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {scans.map((scan) => (
        <li key={scan.id}>
          <ScanCard
            scan={{
              id: scan.id,
              sourceLabel: SOURCE_LABEL[scan.source],
              content: scan.content,
              riskLevel: scan.riskLevel,
              score: scan.score,
              userVerdict: scan.userVerdict,
              reasons: scan.reasons,
              aiSummary: scan.aiSummary,
              memo: scan.memo,
              createdAtText: formatKst(scan.createdAt),
            }}
          />
        </li>
      ))}
    </ul>
  );
}

export function HistorySkeleton() {
  return (
    <p role="status" className="p-6 text-center text-lg text-zinc-600">
      기록을 불러오는 중…
    </p>
  );
}
