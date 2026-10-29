import type { MetadataRoute } from 'next';

/** 홈 화면에 설치하는 앱(PWA) 정보. 문자 앱의 [공유] → 도움폰으로 문자를 바로 검사할 수 있다. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '안심 지킴이 — 어르신 스마트폰 도우미',
    short_name: '안심 지킴이',
    description: '사기 문자 검사, 말로 물어보기, 키오스크 연습',
    start_url: '/home',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    lang: 'ko',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    share_target: {
      action: '/check',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
  } as MetadataRoute.Manifest;
}
