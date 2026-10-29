'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Button,
  ConfirmDialog,
  Empty,
  FieldError,
  Loading,
  Notice,
  inputClass,
  newRequestId,
  shortDate,
} from '@/components/ui';
import { usePagedList } from '@/components/use-paged-list';
import type { KioskSessionView } from '@/lib/data/kiosk';
import { memoTextSchema } from '@/lib/validation';
import {
  deleteSession,
  listSessions,
  saveSession,
  updateSessionMemo,
} from './actions';
import { KioskSim, type KioskResult } from './kiosk-sim';
import { SCENARIOS, findScenario, tipFor, type Scenario } from './scenarios';

export function KioskClient() {
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<{
    tip: string;
    error?: string;
    saving: boolean;
  } | null>(null);
  const list = usePagedList<KioskSessionView>(listSessions);

  async function finish(s: Scenario, r: KioskResult) {
    setResult({ tip: tipFor(r.stuckStep, r.mistakes), saving: true });
    const res = await saveSession({
      kioskType: s.type,
      ...r,
      requestId: newRequestId(),
    });
    if (!res.ok) {
      if (res.expired) router.push('/login?expired=1');
      setResult({
        tip: tipFor(r.stuckStep, r.mistakes),
        saving: false,
        error: res.error,
      });
      return;
    }
    list.prepend(res.data);
    setResult({ tip: tipFor(r.stuckStep, r.mistakes), saving: false });
  }

  return (
    <div className="space-y-8">
      {!scenario ? (
        <section aria-labelledby="choose" className="space-y-3">
          <h2 id="choose" className="text-2xl font-extrabold text-navy">
            어떤 키오스크를 연습할까요?
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {SCENARIOS.map((s) => (
              <button
                key={s.type}
                type="button"
                onClick={() => {
                  setScenario(s);
                  setResult(null);
                  setRunKey((k) => k + 1);
                }}
                className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5 text-left shadow-sm hover:border-navy sm:flex-col sm:items-start"
              >
                <span aria-hidden className="text-5xl">
                  {s.icon}
                </span>
                <span>
                  <span className="block text-2xl font-extrabold text-navy">
                    {s.name}
                  </span>
                  <span className="block text-base text-muted">
                    {s.steps.length}단계
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <KioskSim
            key={runKey}
            scenario={scenario}
            onFinish={(r) => finish(scenario, r)}
            onQuit={() => setScenario(null)}
          />
          {result && (
            <div className="space-y-3">
              {result.saving ? (
                <Loading text="연습 기록을 저장하고 있어요…" />
              ) : null}
              {result.error && <Notice kind="error">{result.error}</Notice>}
              {!result.saving && !result.error && (
                <Notice kind="success">연습 기록을 저장했어요.</Notice>
              )}
              <Notice kind="info">💡 {result.tip}</Notice>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setResult(null);
                    setRunKey((k) => k + 1);
                  }}
                >
                  한 번 더 연습
                </Button>
                <Button className="flex-1" onClick={() => setScenario(null)}>
                  다른 키오스크
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
      <Records list={list} />
    </div>
  );
}

function Records({
  list,
}: {
  list: ReturnType<typeof usePagedList<KioskSessionView>>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<KioskSessionView | null>(null);
  const [notice, setNotice] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  async function save(s: KioskSessionView) {
    const parsed = memoTextSchema.safeParse(memo);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const res = await updateSessionMemo({ id: s.id, memo: parsed.data });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    list.replace({ ...s, memo: parsed.data || null });
    setEditing(null);
    setNotice({ kind: 'success', text: '메모를 저장했어요.' });
  }

  return (
    <section aria-labelledby="records" className="space-y-4">
      <h2 id="records" className="text-2xl font-extrabold text-navy">
        연습 기록
      </h2>
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      <ul className="space-y-3">
        {list.items.map((s) => {
          const sc = findScenario(s.kioskType);
          return (
            <li
              key={s.id}
              className="space-y-2 rounded-3xl border border-line bg-white p-4"
            >
              <p className="text-xl font-extrabold">
                {sc?.icon} {sc?.name}
              </p>
              <p className="text-lg">
                {s.durationSec}초 · 실수 {s.mistakes}번
                {s.stuckStep ? ` · 막힌 곳: ${s.stuckStep}` : ''}
              </p>
              <p className="text-base text-muted">{shortDate(s.createdAt)}</p>
              {editing === s.id ? (
                <div className="space-y-2">
                  <label
                    htmlFor={`memo-${s.id}`}
                    className="block text-lg font-bold"
                  >
                    메모
                  </label>
                  <input
                    id={`memo-${s.id}`}
                    value={memo}
                    maxLength={200}
                    onChange={(e) => {
                      setMemo(e.target.value);
                      setError(undefined);
                    }}
                    aria-invalid={!!error}
                    aria-describedby={`memo-${s.id}-error`}
                    placeholder="예: 다음엔 세트 버튼부터 찾기"
                    className={inputClass}
                  />
                  <FieldError id={`memo-${s.id}-error`} message={error} />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setEditing(null)}
                      disabled={busy}
                    >
                      취소
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => save(s)}
                      loading={busy}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {s.memo && (
                    <p className="rounded-xl bg-cream px-3 py-2 text-base">
                      📝 {s.memo}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setEditing(s.id);
                        setMemo(s.memo ?? '');
                        setError(undefined);
                      }}
                    >
                      메모 고치기
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-1"
                      onClick={() => setDeleting(s)}
                    >
                      지우기
                    </Button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {list.loading && <Loading />}
      {list.error && (
        <Notice kind="error" onRetry={list.reload}>
          {list.error}
        </Notice>
      )}
      {!list.loading && !list.error && list.items.length === 0 && (
        <Empty>
          아직 연습 기록이 없어요. 위에서 키오스크를 골라 연습해 보세요.
        </Empty>
      )}
      {list.hasMore && !list.loading && (
        <Button variant="secondary" className="w-full" onClick={list.more}>
          더 보기
        </Button>
      )}
      <ConfirmDialog
        open={!!deleting}
        title="이 연습 기록을 지울까요?"
        body="지우면 되돌릴 수 없어요."
        confirmLabel="지우기"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteSession(deleting.id);
          if (res.ok) {
            list.remove(deleting.id);
            setNotice({ kind: 'success', text: '기록을 지웠어요.' });
          } else setNotice({ kind: 'error', text: res.error });
          setDeleting(null);
        }}
      />
    </section>
  );
}
