'use client';

/** 화면을 그리다 오류가 나면 내부 정보 없이 짧은 안내만 보여 준다. */
export default function AppError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl bg-red-50 p-6 text-red-900">
      <h2 className="text-2xl font-bold">화면을 불러오지 못했어요</h2>
      <p className="mt-2 text-lg">잠시 뒤 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 min-h-12 rounded-xl bg-red-700 px-5 text-lg font-semibold text-white"
      >
        다시 시도
      </button>
    </div>
  );
}
