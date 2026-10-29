'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type Page<T> = { items: T[]; hasMore: boolean };
type Result<T> =
  { ok: true; data: Page<T> } | { ok: false; error: string; expired?: boolean };

/**
 * 세 기록 목록이 함께 쓰는 '나눠 불러오기'. 처음 10개를 읽고 [더 보기]마다 10개씩 더 읽는다.
 * 로그인이 만료되면 로그인 화면으로 보낸다.
 */
export function usePagedList<T extends { id: string }>(
  load: (offset: number) => Promise<Result<T>>,
) {
  const router = useRouter();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const loadRef = useRef(load);

  const fetchPage = useCallback(
    async (offset: number, replace: boolean) => {
      setLoading(true);
      setError(null);
      const res = await loadRef.current(offset);
      setLoading(false);
      if (!res.ok) {
        if (res.expired) router.push('/login?expired=1');
        setError(res.error);
        return;
      }
      setItems((prev) =>
        replace ? res.data.items : [...prev, ...res.data.items],
      );
      setHasMore(res.data.hasMore);
    },
    [router],
  );

  useEffect(() => {
    // 화면을 처음 열 때 목록을 불러온다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPage(0, true);
  }, [fetchPage]);

  return {
    items,
    loading,
    error,
    hasMore,
    more: () => fetchPage(items.length, false),
    reload: () => fetchPage(0, true),
    prepend: (item: T) =>
      setItems((prev) => [item, ...prev.filter((p) => p.id !== item.id)]),
    replace: (item: T) =>
      setItems((prev) => prev.map((p) => (p.id === item.id ? item : p))),
    remove: (id: string) => setItems((prev) => prev.filter((p) => p.id !== id)),
  };
}
