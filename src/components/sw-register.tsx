'use client';

import { useEffect } from 'react';

/** 홈 화면 설치(PWA)를 위해 서비스 워커를 등록한다. 화면에는 아무것도 그리지 않는다. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);
  return null;
}
