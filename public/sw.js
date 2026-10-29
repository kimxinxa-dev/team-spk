// 안심 지킴이 서비스 워커: 홈 화면 설치(PWA)와 체험 문자 알림을 담당한다.
// 화면·데이터는 캐시하지 않고 항상 서버에서 최신으로 받는다.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
);

// 체험 문자 알림: 서버가 보낸 내용을 휴대폰 알림창에 띄운다.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || '새 문자';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon.svg',
      tag: 'dodum-demo',
      data: { url: data.url || '/check' },
    }),
  );
});

// 알림을 누르면 앱을 열어 바로 검사 결과 팝업을 보여 준다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || '/check';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        const open = list.find((c) => 'focus' in c);
        if (open) {
          open.navigate(url);
          return open.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
