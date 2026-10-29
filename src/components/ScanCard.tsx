'use client';

import { useActionState, useState } from 'react';
import {
  deleteScan,
  updateScanMemo,
  updateScanVerdict,
} from '@/app/(app)/scan-actions';
import { FieldError, FormStatus, SubmitButton } from '@/components/form';
import { RiskBadge } from '@/components/RiskBadge';
import { INITIAL_RESULT } from '@/lib/action-result';
import { MEMO_MAX } from '@/lib/validation';
import type { Risk } from '@/lib/scan/rules';

export type ScanCardData = {
  id: string;
  sourceLabel: string;
  content: string;
  riskLevel: Risk;
  score: number;
  userVerdict: string | null;
  reasons: string[];
  aiSummary: string | null;
  memo: string | null;
  createdAtText: string;
};

/** 검사 기록 한 건: 결과 보기 · 메모 고치기 · 지우기 */
export function ScanCard({ scan }: { scan: ScanCardData }) {
  const [editing, setEditing] = useState(false);
  const [memoResult, memoAction] = useActionState(
    async (prev: typeof INITIAL_RESULT, formData: FormData) => {
      const result = await updateScanMemo(prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    INITIAL_RESULT,
  );
  const [deleteResult, deleteAction] = useActionState(
    deleteScan,
    INITIAL_RESULT,
  );
  const [verdictResult, verdictAction, verdictPending] = useActionState(
    updateScanVerdict,
    INITIAL_RESULT,
  );
  const memoId = `memo-${scan.id}`;

  return (
    <article className="rounded-2xl border-2 border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <RiskBadge level={scan.riskLevel} />
          <span className="text-lg font-bold text-zinc-800">
            위험도 {scan.score}%
          </span>
        </span>
        <p className="text-base text-zinc-600">
          {scan.sourceLabel} · {scan.createdAtText}
        </p>
      </div>

      {/* 사용자가 쓴 글은 글자 그대로만 보여 준다(HTML로 넣지 않음) */}
      <p className="mt-3 line-clamp-4 text-lg break-all whitespace-pre-wrap text-zinc-900">
        {scan.content}
      </p>

      {scan.reasons.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-6 text-lg text-zinc-800">
          {scan.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {scan.aiSummary && (
        <p className="mt-3 rounded-xl bg-blue-50 p-4 text-lg text-blue-950">
          {scan.aiSummary}
        </p>
      )}

      {/* 사용자가 알려 준 정답은 이 사람의 다음 검사를 맞춤 판단하는 학습 데이터가 된다 */}
      <form action={verdictAction} className="mt-4">
        <input type="hidden" name="id" value={scan.id} />
        <fieldset disabled={verdictPending}>
          <legend className="text-base font-semibold text-zinc-700">
            이 문자, 실제로 사기였나요?
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ['SCAM', '사기 맞아요'],
                ['SAFE', '아니에요'],
                ['NONE', '모르겠어요'],
              ] as const
            ).map(([value, label]) => {
              const selected = (scan.userVerdict ?? 'NONE') === value;
              return (
                <button
                  key={value}
                  type="submit"
                  name="verdict"
                  value={value}
                  aria-pressed={selected}
                  className={`min-h-12 rounded-xl border-2 text-base font-semibold ${
                    selected
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-zinc-300 bg-white text-zinc-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </form>

      {editing ? (
        <form action={memoAction} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={scan.id} />
          <label htmlFor={memoId} className="block text-lg font-semibold">
            메모
          </label>
          <textarea
            id={memoId}
            name="memo"
            defaultValue={scan.memo ?? ''}
            maxLength={MEMO_MAX}
            rows={2}
            aria-describedby={`${memoId}-error`}
            className="block w-full rounded-xl border-2 border-zinc-300 p-3 text-lg"
          />
          <FieldError id={`${memoId}-error`} result={memoResult} name="memo" />
          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingText="저장하는 중…">메모 저장</SubmitButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-12 rounded-xl border-2 border-zinc-300 px-5 text-lg font-semibold"
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <>
          {scan.memo && (
            <p className="mt-3 text-lg text-zinc-700">📝 {scan.memo}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-12 rounded-xl border-2 border-zinc-300 px-5 text-lg font-semibold hover:bg-zinc-50"
            >
              {scan.memo ? '메모 고치기' : '메모 쓰기'}
            </button>
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (
                  !confirm('이 기록을 지울까요? 지운 기록은 되돌릴 수 없어요.')
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={scan.id} />
              <SubmitButton variant="danger" pendingText="지우는 중…">
                지우기
              </SubmitButton>
            </form>
          </div>
        </>
      )}
      <div className="mt-3 space-y-2">
        <FormStatus result={verdictResult} />
        <FormStatus result={memoResult} />
        {!deleteResult.ok && <FormStatus result={deleteResult} />}
      </div>
    </article>
  );
}
