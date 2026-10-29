/**
 * 자유롭게 조작하는 가상 휴대폰(연습용).
 * 홈·메신저·문자·카메라·사진첩·설정·전화·시계·인터넷 앱을 실제처럼 오가며 쓸 수 있고,
 * 문자를 받으면 채점 함수로 검사해 위험하면 경고 팝업·링크 차단·설치 가리기를 보여 준다.
 * React 밖의 순수 DOM 코드라 앱(클라이언트 컴포넌트)과 미리보기 페이지가 함께 쓴다.
 */

export type Risk = 'SAFE' | 'CAUTION' | 'DANGER';
export type Analysis = { riskLevel: Risk; score: number; reasons: string[] };
export type IncomingMessage = {
  app: 'sms' | 'messenger';
  from: string;
  text: string;
};

export type PhoneEvent = {
  type: 'message-checked';
  message: IncomingMessage;
  result: Analysis;
};

type Screen =
  | { id: 'home' }
  | { id: 'messenger' }
  | { id: 'chat'; who: string }
  | { id: 'attach'; who: string }
  | { id: 'album'; who: string }
  | { id: 'sms' }
  | { id: 'sms-thread'; from: string }
  | { id: 'camera' }
  | { id: 'gallery' }
  | { id: 'photo'; index: number }
  | { id: 'settings' }
  | { id: 'connections' }
  | { id: 'wifi' }
  | { id: 'wifi-pw' }
  | { id: 'display' }
  | { id: 'font' }
  | { id: 'contacts' }
  | { id: 'contact'; who: string }
  | { id: 'call'; who: string; video: boolean }
  | { id: 'clock' }
  | { id: 'alarm-edit' }
  | { id: 'browser'; host: string }
  | { id: 'installer' }
  | { id: 'ext'; app: string; view: string; data: string };

/** 휴대폰에 따로 설치하는 앱이 화면을 바꾸거나 안내를 시작할 때 쓰는 기능 */
export type PhoneAppContext = {
  /** 이 앱의 다음 화면으로 이동 */
  push(view: string, data?: string): void;
  back(): void;
  toast(text: string): void;
  /** 휴대폰 안 입력칸(data-model)의 현재 값 */
  drafts: Record<string, string>;
  /** 휴대폰에서 마지막으로 복사한 글 */
  clipboard: string;
  /** 이 주소를 막는다(나중에 문자·인터넷에서 열려고 하면 차단 화면) */
  blockLink(raw: string): void;
};

/**
 * 휴대폰에 설치하는 앱. render는 화면 HTML을, handle은 data-act="x:앱id:동작" 버튼의 동작을 맡는다.
 */
export type PhoneApp = {
  id: string;
  label: string;
  icon: string;
  bg: string;
  render(
    view: string,
    data: string,
    ctx: PhoneAppContext,
  ): { html: string; dark?: boolean };
  handle(action: string, arg: string, ctx: PhoneAppContext): boolean | void;
};

/** 설치 앱이 쓰는 화면 위쪽 막대(뒤로 버튼 + 제목) */
export function phoneBar(title: string) {
  return `<div class="vp-bar"><button data-act="back" aria-label="뒤로">${ICON.back}</button><span class="t">${esc(title)}</span></div>`;
}

export { esc as escapeHtml };

type ChatLine = { me: boolean; text?: string; photo?: string };
type SmsLine = { from: string; text: string; risk?: Analysis };
type Overlay =
  | { kind: 'warn'; msg: IncomingMessage; result: Analysis }
  | { kind: 'qr-warn'; content: string; place: string; result: Analysis }
  | { kind: 'blocked' }
  | { kind: 'install-guard' }
  | { kind: 'msg-menu'; text: string };

const PHOTOS = ['👶', '🌸', '⛰️', '🍚', '🐶', '🌅'];
/** 사진 칸 배경(실제 사진처럼 보이게 하는 색) */
const PHOTO_BG = [
  'linear-gradient(135deg,#fde68a,#f59e0b)',
  'linear-gradient(135deg,#fbcfe8,#ec4899)',
  'linear-gradient(135deg,#bae6fd,#0369a1)',
  'linear-gradient(135deg,#fed7aa,#c2410c)',
  'linear-gradient(135deg,#d9f99d,#4d7c0f)',
  'linear-gradient(135deg,#fecaca,#7c2d12)',
];
const CONTACTS = [
  {
    id: 'son',
    name: '아들',
    initial: '아',
    color: '#3b82f6',
    phone: '010-1234-5678',
  },
  {
    id: 'daughter',
    name: '딸',
    initial: '딸',
    color: '#ec4899',
    phone: '010-2345-6789',
  },
  {
    id: 'clinic',
    name: '동네병원',
    initial: '병',
    color: '#10b981',
    phone: '02-123-4567',
  },
];

/** 휴대폰 화면에 쓰는 선 그림 아이콘(SVG). 설치 앱도 쓸 수 있게 내보낸다. */
const P = (d: string, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d ? `<path d="${d}"/>` : ''}${extra}</svg>`;
export const PHONE_ICONS = {
  phone: P(
    'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2',
  ),
  chat: P(
    'M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20l1.2-4.4A8.5 8.5 0 1 1 21 11.5z',
  ),
  mail: P(
    'M3 7l9 6 9-6',
    '<rect x="3" y="5" width="18" height="14" rx="2.5"/>',
  ),
  camera: P('M4 8h3l2-3h6l2 3h3v11H4z', '<circle cx="12" cy="13" r="3.5"/>'),
  gallery: P(
    'M4 17l5-5 4 4 3-3 4 4',
    '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.6"/>',
  ),
  settings: P(
    'M12 2.5l1.6 2.3 2.8-.4.8 2.7 2.5 1.3-1 2.6 1 2.6-2.5 1.3-.8 2.7-2.8-.4L12 21.5l-1.6-2.3-2.8.4-.8-2.7-2.5-1.3 1-2.6-1-2.6 2.5-1.3.8-2.7 2.8.4z',
    '<circle cx="12" cy="12" r="3.2"/>',
  ),
  clock: P('M12 7v5l3 2', '<circle cx="12" cy="12" r="8.5"/>'),
  globe: P(
    'M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17',
    '<circle cx="12" cy="12" r="8.5"/>',
  ),
  shield: P(
    'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    '<path d="M8.5 12l2.5 2.5 4.5-5"/>',
  ),
  search: P('M20 20l-4.5-4.5', '<circle cx="11" cy="11" r="6.5"/>'),
  more: P(
    '',
    '<circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/>',
  ),
  plus: P('M12 5v14M5 12h14'),
  send: P('M4 12l16-8-6 16-2.5-6.5z'),
  smile: P(
    'M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01',
    '<circle cx="12" cy="12" r="8.5"/>',
  ),
  mic: P(
    'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v3',
  ),
  chevron: P('M9 6l6 6-6 6'),
  wifi: P(
    'M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
  ),
  lock: P(
    'M8 11V8a4 4 0 0 1 8 0v3',
    '<rect x="5" y="11" width="14" height="10" rx="2"/>',
  ),
  sun: P(
    'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    '<circle cx="12" cy="12" r="4"/>',
  ),
  sound: P(
    'M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  ),
  battery: P(
    'M22 11v2',
    '<rect x="2" y="7" width="18" height="10" rx="2"/><rect x="4" y="9" width="11" height="6" rx="1" fill="currentColor"/>',
  ),
  bluetooth: P('M7 7l10 10-5 4V3l5 4L7 17'),
  plane: P('M10 21l2-7-8-3 1-2 9 1 4-6h2l-2 7 4 2-1 1-4-1-3 7z'),
  video: P(
    'M15 10l5-3v10l-5-3z',
    '<rect x="3" y="6" width="12" height="12" rx="2.5"/>',
  ),
  muteMic: P(
    'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6M6 11a6 6 0 0 0 10 4.5M12 17v3M4 4l16 16',
  ),
  keypad: P(
    '',
    '<circle cx="6" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="18" cy="5" r="1.3" fill="currentColor"/><circle cx="6" cy="11" r="1.3" fill="currentColor"/><circle cx="12" cy="11" r="1.3" fill="currentColor"/><circle cx="18" cy="11" r="1.3" fill="currentColor"/><circle cx="6" cy="17" r="1.3" fill="currentColor"/><circle cx="12" cy="17" r="1.3" fill="currentColor"/><circle cx="18" cy="17" r="1.3" fill="currentColor"/>',
  ),
  record: P(
    '',
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
  ),
  hangup: P(
    'M3 14.5c5-4.5 13-4.5 18 0l-2 3-3.5-1.5V13a10 10 0 0 0-7 0v3l-3.5 1.5z',
  ),
  flash: P('M13 2L4 14h7l-1 8 9-12h-7z'),
  flip: P('M4 8h11l-3-3M20 16H9l3 3'),
  file: P('M14 3H6v18h12V7zM14 3v4h4'),
  user: P('M4 20a8 8 0 0 1 16 0', '<circle cx="12" cy="8" r="4"/>'),
  pin: P(
    'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z',
    '<circle cx="12" cy="9" r="2.5"/>',
  ),
  share: P(
    'M8.5 10.5l7-4M8.5 13.5l7 4',
    '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/>',
  ),
  trash: P('M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13'),
  edit: P('M4 20h4L19 9l-4-4L4 16z'),
  check: P('M5 12l4.5 4.5L19 7'),
  info: P('M12 11v6M12 7.5h.01', '<circle cx="12" cy="12" r="9"/>'),
};

const APPS = [
  {
    id: 'phone',
    label: '전화',
    svg: PHONE_ICONS.phone,
    bg: 'linear-gradient(160deg,#4ade80,#059669)',
  },
  {
    id: 'messenger',
    label: '메신저',
    svg: PHONE_ICONS.chat,
    bg: 'linear-gradient(160deg,#fde047,#eab308)',
    dark: true,
  },
  {
    id: 'sms',
    label: '메시지',
    svg: PHONE_ICONS.mail,
    bg: 'linear-gradient(160deg,#60a5fa,#2563eb)',
  },
  {
    id: 'camera',
    label: '카메라',
    svg: PHONE_ICONS.camera,
    bg: 'linear-gradient(160deg,#9ca3af,#374151)',
  },
  {
    id: 'gallery',
    label: '갤러리',
    svg: PHONE_ICONS.gallery,
    bg: 'linear-gradient(160deg,#f9a8d4,#db2777)',
  },
  {
    id: 'settings',
    label: '설정',
    svg: PHONE_ICONS.settings,
    bg: 'linear-gradient(160deg,#94a3b8,#475569)',
  },
  {
    id: 'clock',
    label: '시계',
    svg: PHONE_ICONS.clock,
    bg: 'linear-gradient(160deg,#38bdf8,#0369a1)',
  },
  {
    id: 'browser',
    label: '인터넷',
    svg: PHONE_ICONS.globe,
    bg: 'linear-gradient(160deg,#a78bfa,#6d28d9)',
  },
];

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

const LINK_RE = /((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;

function hostOf(raw: string) {
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`).hostname;
  } catch {
    return raw;
  }
}

const RISK_TEXT: Record<Risk, { title: string; color: string; soft: string }> =
  {
    DANGER: {
      title: '사기 문자일 가능성이 높아요',
      color: '#dc2626',
      soft: '#fef2f2',
    },
    CAUTION: {
      title: '조심하세요, 의심스러운 문자예요',
      color: '#d97706',
      soft: '#fffbeb',
    },
    SAFE: {
      title: '위험한 점을 찾지 못했어요',
      color: '#16a34a',
      soft: '#f0fdf4',
    },
  };

const STYLE_ID = 'vp-style';
const CSS = `
.vp{position:relative;width:100%;max-width:var(--vp-max,330px);aspect-ratio:9/19;border-radius:48px;background:linear-gradient(145deg,#2b2d33,#0a0b0e);padding:9px;box-sizing:border-box;box-shadow:0 0 0 2px #3a3d44 inset,0 24px 50px rgba(0,0,0,.35);user-select:none;-webkit-tap-highlight-color:transparent}
.vp::before{content:"";position:absolute;right:-3px;top:22%;width:3px;height:56px;border-radius:0 3px 3px 0;background:#3a3d44}
.vp::after{content:"";position:absolute;left:-3px;top:18%;width:3px;height:90px;border-radius:3px 0 0 3px;background:#3a3d44}
.vp *{box-sizing:border-box}
.vp svg{width:1.4em;height:1.4em;display:block}
.vp-scr{position:relative;width:100%;height:100%;border-radius:40px;overflow:hidden;background:#f3f4f8;color:#111318;font-family:"Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;display:flex;flex-direction:column;font-size:calc(13.5px * var(--vp-font,1));letter-spacing:-.2px}
.vp-cam-hole{position:absolute;top:10px;left:50%;width:11px;height:11px;margin-left:-5.5px;border-radius:50%;background:#050505;box-shadow:0 0 0 2px #1c1c1f;z-index:30}
.vp-status{height:32px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:4px 24px 0;font-size:12px;font-weight:700;z-index:5}
.vp-status .r{display:flex;align-items:center;gap:4px}
.vp-status svg{width:15px;height:15px}
.vp-dark .vp-status,.vp-wall .vp-status{color:#fff}
.vp-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;scrollbar-width:none}
.vp-body::-webkit-scrollbar{display:none}
.vp-nav{height:42px;flex:none;display:flex;justify-content:space-around;align-items:center}
.vp-nav button{width:60px;height:36px;border:0;background:none;cursor:pointer;color:#52525b;display:grid;place-items:center;border-radius:12px}
.vp-nav svg{width:19px;height:19px}
.vp-dark .vp-nav button,.vp-wall .vp-nav button{color:#e4e4e7}
.vp-nav button:active{background:rgba(127,127,127,.18)}
.vp-wall{background:radial-gradient(120% 70% at 85% 5%,rgba(125,211,252,.85),transparent 55%),radial-gradient(90% 60% at 0% 95%,rgba(240,171,252,.75),transparent 60%),linear-gradient(170deg,#1e3a8a,#312e81 55%,#4c1d95)}
.vp-widget{color:#fff;padding:22px 24px 6px;text-shadow:0 1px 6px rgba(0,0,0,.25)}
.vp-widget b{display:block;font-size:50px;font-weight:300;letter-spacing:-2px;line-height:1.05}
.vp-widget span{font-size:14px;font-weight:600}
.vp-weather{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:6px 12px;border-radius:16px;background:rgba(255,255,255,.18);backdrop-filter:blur(6px);font-size:12.5px;font-weight:600}
.vp-weather svg{width:16px;height:16px}
.vp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 2px;padding:10px 12px 6px;margin-top:auto}
.vp-app{display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:none;cursor:pointer;color:#fff;font:inherit;font-size:.82em;font-weight:600;position:relative;border-radius:18px;padding:3px 0;text-shadow:0 1px 4px rgba(0,0,0,.45)}
.vp-app i{width:52px;height:52px;border-radius:17px;display:grid;place-items:center;font-style:normal;font-size:26px;color:#fff;box-shadow:0 4px 10px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.35)}
.vp-app i.dk{color:#3a2c00}
.vp-app i svg{width:27px;height:27px}
.vp-badge{position:absolute;top:-3px;right:8px;min-width:19px;height:19px;border-radius:10px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 5px;text-shadow:none;border:2px solid rgba(255,255,255,.9)}
.vp-dots{display:flex;justify-content:center;gap:6px;padding:4px 0 8px}
.vp-dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5)}
.vp-dots i:first-child{background:#fff}
.vp-searchbar{margin:0 16px 10px;height:42px;border-radius:21px;background:rgba(255,255,255,.92);display:flex;align-items:center;gap:8px;padding:0 14px;color:#6b7280;font-size:.95em}
.vp-searchbar svg{width:18px;height:18px}
.vp-searchbar .g{flex:1}
.vp-dock{display:flex;justify-content:space-around;margin:0 10px 6px;padding:8px 0;border-radius:28px;background:rgba(255,255,255,.2);backdrop-filter:blur(10px)}
.vp-dock .vp-app{font-size:0;gap:0;text-shadow:none}
.vp-bar{height:56px;flex:none;display:flex;align-items:center;gap:4px;padding:0 6px 0 4px;background:#f3f4f8;font-weight:800;font-size:1.25em}
.vp-bar .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vp-bar button,.vp-bar .ico{border:0;background:none;font:inherit;cursor:pointer;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#27272a;flex:none}
.vp-bar .ico{cursor:default;color:#52525b}
.vp-bar svg{width:21px;height:21px}
.vp-sub{font-size:.82em;font-weight:700;color:#6b7280;padding:12px 22px 4px}
.vp-list{background:#fff;margin:6px 12px;border-radius:24px;overflow:hidden}
.vp-row{width:100%;min-height:62px;display:flex;align-items:center;gap:14px;padding:8px 16px;border:0;background:#fff;font:inherit;text-align:left;cursor:pointer;color:inherit;position:relative}
.vp-row+.vp-row::before{content:"";position:absolute;top:0;left:66px;right:16px;height:1px;background:#eceef2}
.vp-row:active{background:#f4f4f6}
.vp-row .ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#fff;flex:none}
.vp-row .ic svg{width:20px;height:20px}
.vp-row .tx{flex:1;min-width:0}
.vp-row .tx small{display:block;color:#6b7280;font-size:.86em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.vp-row .tx b{font-weight:650;font-size:1.05em}
.vp-row .tx small.on{color:#2563eb;font-weight:600}
.vp-row .meta{font-size:.78em;color:#9ca3af;align-self:flex-start;margin-top:8px;white-space:nowrap}
.vp-row .chev{color:#c4c7cf}
.vp-row .chev svg{width:18px;height:18px}
.vp-av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;flex:none;font-size:1.05em}
.vp-sw{width:46px;height:26px;border-radius:13px;background:#d1d5db;position:relative;flex:none;transition:background .2s}
.vp-sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.vp-sw.on{background:#3b82f6}.vp-sw.on::after{left:23px}
.vp-chat{flex:1;background:#bfd0e2;padding:10px 10px 12px;display:flex;flex-direction:column;gap:6px}
.vp-chat.sms{background:#fff}
.vp-date{align-self:center;font-size:.76em;color:#fff;background:rgba(0,0,0,.18);border-radius:12px;padding:3px 12px;margin:4px 0}
.vp-chat.sms .vp-date{color:#6b7280;background:none}
.vp-line{display:flex;align-items:flex-end;gap:5px}
.vp-line.me{flex-direction:row-reverse}
.vp-line .tm{font-size:.7em;color:#4b5563;white-space:nowrap;padding-bottom:2px}
.vp-chat.sms .vp-line .tm{color:#9ca3af}
.vp-line .who{width:34px;height:34px;border-radius:13px;display:grid;place-items:center;color:#fff;font-weight:800;font-size:.8em;align-self:flex-start;flex:none}
.vp-line .col{display:grid;gap:3px;max-width:72%}
.vp-line .nm{font-size:.78em;color:#374151}
.vp-msg[data-act]{cursor:pointer}
.vp-msg[data-act]:active{filter:brightness(.92)}
.vp-msg{padding:8px 12px;border-radius:4px 16px 16px 16px;background:#fff;line-height:1.45;word-break:break-all;box-shadow:0 1px 1px rgba(0,0,0,.05)}
.vp-line.me .vp-msg{background:#fde68a;border-radius:16px 4px 16px 16px}
.vp-chat.sms .vp-msg{background:#eef0f4;border-radius:18px 18px 18px 6px;box-shadow:none}
.vp-msg .ph{width:120px;height:120px;border-radius:12px;display:grid;place-items:center;font-size:56px}
.vp-line.me .vp-msg:has(.ph){padding:4px;background:#fff}
.vp-input{flex:none;display:flex;align-items:center;gap:6px;padding:7px 8px;background:#fff}
.vp-input .plus{width:36px;height:36px;border-radius:50%;border:0;background:#f1f2f5;cursor:pointer;display:grid;place-items:center;color:#374151;flex:none}
.vp-input .plus svg{width:20px;height:20px}
.vp-input .fld{flex:1;height:38px;border-radius:19px;background:#f1f2f5;color:#9ca3af;display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 14px}
.vp-input .fld svg{width:20px;height:20px;color:#9ca3af}
.vp-input .snd{width:38px;height:38px;border-radius:50%;border:0;background:#fcd34d;cursor:pointer;display:grid;place-items:center;color:#3a2c00;flex:none}
.vp-input .snd svg{width:18px;height:18px}
.vp-sheet{background:#fff;border-radius:26px 26px 0 0;padding:10px 16px 18px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px 6px;margin-top:auto;box-shadow:0 -6px 20px rgba(0,0,0,.08)}
.vp-sheet::before{content:"";grid-column:1/-1;justify-self:center;width:40px;height:4px;border-radius:2px;background:#d1d5db;margin-bottom:6px}
.vp-sheet button{border:0;background:none;font:inherit;font-size:.85em;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;border-radius:14px;padding:4px;color:#374151}
.vp-sheet i{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;color:#fff}
.vp-sheet i svg{width:24px;height:24px}
.vp-pics{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px}
.vp-pic{aspect-ratio:1;border:0;font-size:40px;cursor:pointer;position:relative;display:grid;place-items:center;padding:0}
.vp-pic::after{content:"";position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:50%;border:2px solid #fff;background:rgba(0,0,0,.15)}
.vp-pic.sel::after{content:"✓";color:#3a2c00;background:#fcd34d;border-color:#fcd34d;font-size:12px;font-weight:900;display:grid;place-items:center}
.vp-pic.view::after{display:none}
.vp-foot{flex:none;padding:10px 12px;background:#fff;display:flex;justify-content:flex-end;align-items:center;gap:8px}
.vp-foot .info{flex:1;color:#6b7280;font-size:.9em}
.vp-btn{min-height:44px;padding:0 20px;border-radius:22px;border:0;background:#2563eb;color:#fff;font:inherit;font-weight:700;cursor:pointer}
.vp-btn.yel{background:#fcd34d;color:#3a2c00}
.vp-btn.gray{background:#e5e7eb;color:#111318}
.vp-btn.red{background:#ef4444}
.vp-camtop{flex:none;display:flex;justify-content:space-between;padding:6px 18px;color:#fff}
.vp-camtop svg{width:20px;height:20px}
.vp-camv{flex:1;background:radial-gradient(ellipse at 50% 30%,#93c5fd 0%,#60a5fa 35%,transparent 36%),linear-gradient(#7dd3fc 0%,#bae6fd 45%,#4d7c0f 46%,#365314 100%);display:grid;place-items:center;font-size:96px;position:relative}
.vp-camv .grid{position:absolute;inset:0;background:linear-gradient(90deg,transparent 33%,rgba(255,255,255,.25) 33.3%,transparent 33.6%,transparent 66.4%,rgba(255,255,255,.25) 66.6%,transparent 67%),linear-gradient(transparent 33%,rgba(255,255,255,.25) 33.3%,transparent 33.6%,transparent 66.4%,rgba(255,255,255,.25) 66.6%,transparent 67%)}
.vp-flash{position:absolute;inset:0;background:#fff;animation:vpflash .35s ease-out forwards}
@keyframes vpflash{to{opacity:0}}
.vp-zoom{flex:none;display:flex;justify-content:center;gap:8px;padding:10px 0 4px;background:#000}
.vp-zoom span{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center}
.vp-zoom span.on{background:rgba(255,255,255,.3);color:#fcd34d;font-size:12.5px}
.vp-modes{flex:none;display:flex;justify-content:center;gap:18px;padding:6px 0;background:#000;color:#9ca3af;font-size:.85em;font-weight:700}
.vp-modes .on{color:#fcd34d}
.vp-blockln{display:grid;gap:2px;border:2px solid;border-radius:14px;padding:10px 12px}
.vp-blockln b{font-size:1.05em}
.vp-blockln span{font-size:.85em;font-weight:700;word-break:break-all;opacity:.85}
.vp-camc{flex:none;height:100px;background:#000;display:flex;align-items:center;justify-content:space-around}
.vp-shut{width:70px;height:70px;border-radius:50%;border:4px solid #fff;background:#fff;box-shadow:inset 0 0 0 3px #000;cursor:pointer}
.vp-shut:active{transform:scale(.94)}
.vp-thumb{width:44px;height:44px;border-radius:50%;border:2px solid #fff;font-size:22px;cursor:pointer;display:grid;place-items:center;overflow:hidden}
.vp-flip{width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;cursor:pointer;display:grid;place-items:center}
.vp-callscr{flex:1;background:radial-gradient(circle at 50% 20%,#334155,#0f172a 70%);color:#fff;display:flex;flex-direction:column;align-items:center;padding:34px 0 22px}
.vp-callscr .vp-av{width:104px;height:104px;font-size:2.2em}
.vp-callscr .st{color:#cbd5e1;font-size:.95em;margin-top:4px}
.vp-callgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px 20px;margin-top:auto;margin-bottom:26px}
.vp-callgrid span{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:.78em;color:#e2e8f0}
.vp-callgrid i{width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center}
.vp-callgrid i svg{width:22px;height:22px}
.vp-hang{width:66px;height:66px;border-radius:50%;border:0;background:#ef4444;color:#fff;cursor:pointer;display:grid;place-items:center;box-shadow:0 6px 16px rgba(239,68,68,.45)}
.vp-hang svg{width:30px;height:30px}
.vp-profile{display:flex;flex-direction:column;align-items:center;gap:4px;padding:18px 0 8px}
.vp-profile .vp-av{width:92px;height:92px;font-size:2em}
.vp-profile b{font-size:1.5em}
.vp-profile small{color:#6b7280}
.vp-actions{display:flex;justify-content:center;gap:24px;padding:14px}
.vp-actions button{border:0;background:none;font:inherit;font-size:.85em;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;border-radius:14px;padding:4px;color:#374151}
.vp-actions i{width:54px;height:54px;border-radius:50%;background:#e8f0fe;color:#2563eb;display:grid;place-items:center}
.vp-actions i svg{width:24px;height:24px}
.vp-slider{display:flex;align-items:center;gap:10px;padding:16px}
.vp-slider .tr{flex:1;height:6px;border-radius:3px;background:#dbe1ea;position:relative}
.vp-slider .tr i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:#3b82f6}
.vp-slider .tr i::after{content:"";position:absolute;right:-9px;top:-6px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3)}
.vp-slider button{width:44px;height:44px;border-radius:14px;border:0;background:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.vp-preview{margin:6px 12px;padding:16px;border-radius:24px;background:#fff;line-height:1.55}
.vp-tabs{display:flex;gap:4px;padding:0 12px 6px}
.vp-tabs span{flex:1;text-align:center;font-size:.85em;font-weight:700;color:#9ca3af;padding:8px 0;border-radius:14px}
.vp-tabs span.on{color:#111318;background:#fff}
.vp-alarm{width:100%;border:0;background:#fff;border-radius:24px;padding:14px 16px;display:flex;align-items:center;gap:10px;font:inherit;cursor:pointer;text-align:left;color:inherit}
.vp-alarm .tm{font-size:2.1em;font-weight:300;letter-spacing:-1px}
.vp-alarm .tm small{font-size:.42em;font-weight:600;margin-right:4px;letter-spacing:0}
.vp-alarm .days{display:flex;gap:3px;font-size:.78em;color:#9ca3af;margin-top:2px}
.vp-alarm .days .on{color:#2563eb;font-weight:800}
.vp-alarm.off .tm{color:#9ca3af}
.vp-fab{position:sticky;bottom:12px;align-self:center;margin:auto 0 10px;min-height:48px;padding:0 22px;border-radius:24px;border:0;background:#2563eb;color:#fff;font:inherit;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 6px 16px rgba(37,99,235,.35)}
.vp-fab svg{width:18px;height:18px}
.vp-time{display:flex;align-items:center;justify-content:center;gap:18px;padding:22px 0 14px}
.vp-time .ap{font-size:1.1em;font-weight:700;color:#6b7280}
.vp-time .hm{display:flex;flex-direction:column;align-items:center;gap:4px}
.vp-time .hm b{font-size:3.2em;font-weight:300;line-height:1}
.vp-time button{width:40px;height:30px;border-radius:12px;border:0;background:#e5e7eb;font-size:14px;cursor:pointer;color:#374151}
.vp-web{flex:1;background:#fff;padding:28px 20px;line-height:1.6;display:grid;align-content:start;gap:14px;justify-items:center;text-align:center}
.vp-web .logo{font-size:2.2em;font-weight:900;letter-spacing:-1px;background:linear-gradient(90deg,#2563eb,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent}
.vp-web .box{width:100%;height:44px;border-radius:22px;border:1.5px solid #e5e7eb;display:flex;align-items:center;gap:8px;padding:0 14px;color:#9ca3af}
.vp-web .box svg{width:18px;height:18px}
.vp-url{flex:none;margin:6px 10px;height:40px;padding:0 14px;border-radius:20px;background:#eef0f4;font-size:.9em;color:#374151;display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden}
.vp-url svg{width:15px;height:15px;color:#16a34a;flex:none}
.vp-link{color:#2563eb;text-decoration:underline;cursor:pointer;background:none;border:0;font:inherit;padding:0;word-break:break-all;text-align:left}
.vp-riskband{display:inline-flex;align-items:center;gap:4px;font-size:.8em;font-weight:800;color:#fff;border-radius:10px;padding:2px 8px;margin-bottom:4px}
.vp-riskband svg{width:13px;height:13px}
.vp-heads{position:absolute;left:8px;right:8px;top:34px;z-index:40;background:rgba(250,250,252,.97);backdrop-filter:blur(10px);border-radius:22px;padding:10px 14px;box-shadow:0 12px 30px rgba(0,0,0,.28);animation:vpdown .4s cubic-bezier(.2,.9,.3,1.2);cursor:pointer;display:grid;gap:3px}
.vp-heads .hd{display:flex;align-items:center;gap:6px;font-size:.78em;color:#6b7280;font-weight:600}
.vp-heads .hd i{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;color:#fff}
.vp-heads .hd i svg{width:11px;height:11px}
.vp-heads .hd em{font-style:normal;margin-left:auto}
.vp-heads b{font-size:.98em}
.vp-heads p{margin:0;color:#374151;line-height:1.4}
@keyframes vpdown{from{transform:translateY(-130%)}to{transform:none}}
.vp-ov{position:absolute;inset:0;z-index:50;display:flex;align-items:flex-end;padding:10px 10px 50px;background:rgba(0,0,0,.45)}
.vp-pop{width:100%;background:#fff;border-radius:28px;padding:20px 18px 14px;display:grid;gap:10px;animation:vpup .3s ease-out}
@keyframes vpup{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
.vp-pop .hd{display:flex;align-items:center;gap:10px}
.vp-pop .hd i{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#fff;flex:none}
.vp-pop .hd i svg{width:22px;height:22px}
.vp-pop .hd small{display:block;color:#6b7280;font-size:.8em;font-weight:600}
.vp-pop h4{margin:0;font-size:1.12em;line-height:1.3}
.vp-pop .meter{height:8px;border-radius:4px;background:#e5e7eb;overflow:hidden}
.vp-pop .meter b{display:block;height:100%;border-radius:4px}
.vp-pop ul{margin:0;padding-left:18px;color:#374151;line-height:1.45}
.vp-pop .tip{font-size:.88em;color:#374151;background:#f3f4f6;border-radius:14px;padding:8px 10px}
.vp-pop .btns{display:flex;gap:8px}
.vp-pop button{flex:1;min-height:46px;border-radius:23px;border:0;background:#eef0f4;font:inherit;font-weight:700;cursor:pointer;color:#111318}
.vp-pop button.main{background:#2563eb;color:#fff}
.vp-full{position:absolute;inset:0;z-index:50;background:linear-gradient(180deg,#0b1220,#111c33);color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:12px;padding:26px}
.vp-full .big{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;background:rgba(250,204,21,.15);color:#facc15;margin-bottom:6px}
.vp-full .big svg{width:46px;height:46px}
.vp-full h4{margin:0;font-size:1.35em}
.vp-full p{margin:0;color:#cbd5e1;line-height:1.55}
.vp-full button{width:100%;min-height:48px;border-radius:24px;border:0;background:#facc15;font:inherit;font-weight:800;cursor:pointer;color:#18181b}
.vp-full button.sub{background:transparent;border:1.5px solid #475569;color:#e2e8f0}
.vp-dialog{margin:auto 14px;background:#fff;border-radius:28px;padding:22px 20px 16px;display:grid;gap:12px;box-shadow:0 10px 30px rgba(0,0,0,.18)}
.vp-dialog h5{margin:0;font-size:1.15em}
.vp-dialog .pw{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #3b82f6;padding:6px 2px;font-size:1.05em;letter-spacing:3px}
.vp-dialog .pw svg{width:18px;height:18px;color:#9ca3af}
.vp-dialog .btns{display:flex;justify-content:flex-end;gap:6px}
.vp-dialog .btns button{border:0;background:none;font:inherit;font-weight:700;color:#2563eb;min-height:42px;padding:0 16px;border-radius:21px;cursor:pointer}
.vp-dialog .btns button.ghost{color:#6b7280}
.vp-dimmed{flex:1;display:flex;flex-direction:column;background:rgba(0,0,0,.35)}
.vp-toast{position:absolute;left:50%;bottom:58px;transform:translateX(-50%);z-index:60;background:rgba(39,39,42,.92);color:#fff;border-radius:18px;padding:8px 16px;font-size:12.5px;white-space:nowrap}
.vp-pad{padding:12px;display:grid;gap:10px;align-content:start}
.vp-card{background:#fff;border-radius:22px;padding:14px;display:grid;gap:6px}
.vp-card.DANGER{box-shadow:inset 0 0 0 2px #fca5a5;background:#fff5f5}.vp-card.CAUTION{box-shadow:inset 0 0 0 2px #fcd34d;background:#fffbeb}.vp-card.SAFE{box-shadow:inset 0 0 0 2px #86efac;background:#f0fdf4}
.vp-field{width:100%;border:0;border-radius:16px;padding:10px 12px;font:inherit;background:#f1f2f5;color:#111318;resize:none}
.vp-field:focus{outline:2px solid #3b82f6}
.vp-chips{display:flex;flex-wrap:wrap;gap:6px}
.vp-chip{min-height:38px;padding:0 12px;border-radius:19px;border:0;background:#fff;font:inherit;font-weight:600;cursor:pointer;color:#111318;box-shadow:inset 0 0 0 1.5px #e5e7eb}
.vp-menu{display:grid;gap:8px;padding:6px 12px 12px}
.vp-menu button{min-height:70px;border-radius:22px;border:0;background:#fff;font:inherit;cursor:pointer;display:flex;align-items:center;gap:12px;padding:10px 14px;text-align:left;color:#111318}
.vp-menu i{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff;font-style:normal;font-size:24px;flex:none}
.vp-menu i svg{width:24px;height:24px}
.vp-menu span{flex:1}
.vp-menu small{display:block;color:#6b7280}
.vp-pill{display:inline-block;border-radius:10px;padding:1px 8px;color:#fff;font-weight:800;font-size:.8em}
.vp-mini{min-height:34px;padding:0 12px;border-radius:17px;border:0;background:#eef0f4;font:inherit;font-size:.85em;font-weight:700;cursor:pointer;color:#111318}
.vp-mini.on{background:#2563eb;color:#fff}
.vp-k-opt{min-height:58px;border-radius:14px;border:2px solid #e4e4e7;background:#fff;font:inherit;cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px;text-align:left;color:#18181b}
.vp-k-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.vp-k-grid .vp-k-opt{flex-direction:column;text-align:center;justify-content:center}
.vp-k-opt em{font-style:normal;font-size:26px}
.vp-k-opt small{display:block;color:#71717a;font-size:.8em}
.vp-keys{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.vp-keys button{min-height:46px;border-radius:12px;border:0;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.15);font:inherit;font-size:1.2em;font-weight:800;cursor:pointer;color:#18181b}
.vp-qrposter{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.vp-qrposter button{border:0;border-radius:16px;background:#fff;padding:10px 4px;font:inherit;font-size:.8em;font-weight:700;cursor:pointer;display:grid;gap:4px;justify-items:center;color:#18181b}
.vp-qrposter b{font-size:30px;line-height:1}
.vp-appbar{flex:none;padding:6px 16px 14px;color:#fff;display:flex;align-items:center;gap:10px}
.vp-appbar svg{width:26px;height:26px}
.vp-appbar b{font-size:1.3em}
@media (prefers-reduced-motion:reduce){`;

const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="5" width="14" height="14" rx="5"/></svg>',
  recent:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M7 6v12M12 6v12M17 6v12"/></svg>',
};

const SIGNAL =
  '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="15" width="3" height="6" rx="1"/><rect x="8" y="11" width="3" height="10" rx="1"/><rect x="13" y="7" width="3" height="14" rx="1"/><rect x="18" y="3" width="3" height="18" rx="1"/></svg>';
const BATTERY =
  '<svg viewBox="0 0 28 14" style="width:24px;height:12px"><rect x="1" y="1" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".5"/><rect x="3" y="3" width="16" height="8" rx="2" fill="currentColor"/><rect x="25" y="5" width="2" height="4" rx="1" fill="currentColor" opacity=".5"/></svg>';

/** 휴대폰 카메라 앱의 QR 모드에 넣는 기능(시뮬레이션의 안심 지킴이가 판독을 맡는다) */
export type CameraQr = {
  /** 무작위로 비출 수 있는 QR 수 */
  count: number;
  /** QR이 비춰진(판독 전) 화면 */
  preview(index: number): string;
  /** 셔터를 눌러 판독한 화면과 결과(위험·주의면 경고 팝업을 띄운다) */
  scan(index: number): {
    html: string;
    result: Analysis;
    content: string;
    place: string;
  } | null;
};

/** 카메라로 찍은 QR의 경고 팝업 제목 */
const QR_RISK_TITLE: Record<Risk, string> = {
  DANGER: '위험한 QR 코드예요',
  CAUTION: '조심해야 할 QR 코드예요',
  SAFE: '안전해 보이는 QR 코드예요',
};

export class VirtualPhone {
  private root: HTMLElement;
  private analyze: (text: string) => Analysis;
  private onEvent: (e: PhoneEvent) => void;
  private stack: Screen[] = [{ id: 'home' }];
  private fontScale = 1;
  private wifiOn = false;
  private wifiConnected = false;
  private photos = [...PHOTOS.slice(0, 4)];
  private picked = new Set<number>();
  private chats: Record<string, ChatLine[]> = {
    daughter: [{ me: false, text: '엄마 사진 좀 보내 주세요 😊' }],
    son: [{ me: false, text: '아버지 주말에 찾아뵐게요' }],
  };
  private sms: SmsLine[] = [
    {
      from: '동네병원',
      text: '[동네병원] 내일 오전 10시 진료 예약되어 있습니다.',
    },
  ];
  private unread = { sms: 0, messenger: 1 };
  private alarms = [{ h: 7, m: 0, on: false }];
  private draftHour = 8;
  private overlay: Overlay | null = null;
  private heads: IncomingMessage | null = null;
  private headsTimer: ReturnType<typeof setTimeout> | null = null;
  private toastText: string | null = null;
  private flash = false;
  private blockedHosts = new Set<string>();
  private apps: PhoneApp[];
  private drafts: Record<string, string> = {};
  private clipboard = '';
  private qr: CameraQr | null = null;
  /** 카메라에 비춰진 QR(무작위), 판독했는지, 그 화면(판독은 셔터를 누를 때 한 번만) */
  private camQr: { index: number; judged: boolean; html: string } | null = null;

  constructor(
    root: HTMLElement,
    opts: {
      analyze: (text: string) => Analysis;
      onEvent?: (e: PhoneEvent) => void;
      apps?: PhoneApp[];
      /** 카메라 앱의 [QR] 모드: 비출 수 있는 QR 목록과, 비췄을 때 보여 줄 판독 화면을 만드는 함수 */
      qr?: CameraQr;
    },
  ) {
    this.root = root;
    this.analyze = opts.analyze;
    this.onEvent = opts.onEvent ?? (() => undefined);
    this.apps = opts.apps ?? [];
    this.qr = opts.qr ?? null;
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    this.root.addEventListener('click', this.handleClick);
    this.root.addEventListener('input', this.handleInput);
    this.render();
  }

  destroy() {
    this.root.removeEventListener('click', this.handleClick);
    this.root.removeEventListener('input', this.handleInput);
    if (this.headsTimer) clearTimeout(this.headsTimer);
    this.root.innerHTML = '';
  }

  // ---------- 바깥에서 쓰는 기능 ----------
  receiveMessage(msg: IncomingMessage) {
    const result = this.analyze(msg.text);
    if (msg.app === 'sms') {
      this.sms.push({ from: msg.from, text: msg.text, risk: result });
      this.unread.sms += 1;
    } else {
      const key = msg.from;
      (this.chats[key] ??= []).push({ me: false, text: msg.text });
      this.unread.messenger += 1;
    }
    if (result.riskLevel === 'DANGER') {
      for (const m of msg.text.matchAll(LINK_RE))
        this.blockedHosts.add(hostOf(m[1]));
    }
    this.heads = msg;
    if (this.headsTimer) clearTimeout(this.headsTimer);
    this.headsTimer = setTimeout(() => {
      this.heads = null;
      if (result.riskLevel !== 'SAFE')
        this.overlay = { kind: 'warn', msg, result };
      this.render();
    }, 1400);
    this.onEvent({ type: 'message-checked', message: msg, result });
    this.render();
  }

  // ---------- 화면 이동 ----------
  private get top() {
    return this.stack[this.stack.length - 1];
  }

  /** 카메라에 다음 체험용 QR을 무작위로 비춘다(바로 전 QR과 다르게). */
  private aimQr() {
    if (!this.qr || this.qr.count === 0) return;
    let index = Math.floor(Math.random() * this.qr.count);
    if (this.qr.count > 1 && index === this.camQr?.index)
      index = (index + 1) % this.qr.count;
    this.camQr = { index, judged: false, html: this.qr.preview(index) };
  }

  private push(s: Screen) {
    if (s.id === 'camera') this.aimQr();
    this.stack.push(s);
  }

  private back() {
    if (this.overlay) {
      this.overlay = null;
    } else if (this.stack.length > 1) {
      this.stack.pop();
    }
  }

  private toast(text: string) {
    this.toastText = text;
    setTimeout(() => {
      this.toastText = null;
      this.render();
    }, 1600);
  }

  private openLink(raw: string, text: string) {
    const host = hostOf(raw);
    if (this.blockedHosts.has(host)) {
      this.overlay = /설치|\.apk/.test(text)
        ? { kind: 'install-guard' }
        : { kind: 'blocked' };
      if (this.overlay.kind === 'install-guard') this.push({ id: 'installer' });
      return;
    }
    this.push({ id: 'browser', host });
  }

  /** 입력칸은 다시 그려도 글이 지워지지 않도록 값을 따로 기억한다. */
  private handleInput = (e: Event) => {
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (el.dataset?.model) this.drafts[el.dataset.model] = el.value;
  };

  private appContext(appId: string): PhoneAppContext {
    return {
      push: (view, data = '') =>
        this.push({ id: 'ext', app: appId, view, data }),
      back: () => this.back(),
      toast: (text) => this.toast(text),
      drafts: this.drafts,
      clipboard: this.clipboard,
      blockLink: (raw) => this.blockedHosts.add(hostOf(raw)),
    };
  }

  private handleClick = (e: Event) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || !this.root.contains(el)) return;
    const act = el.dataset.act!;
    const arg = el.dataset.arg ?? '';
    this.run(act, arg);
    this.render();
  };

  /** 버튼 동작을 실행한다. */
  private run(act: string, arg: string): boolean | void {
    if (act.startsWith('x:')) {
      const [, appId, action] = act.split(':');
      const app = this.apps.find((a) => a.id === appId);
      return app?.handle(action, arg, this.appContext(appId));
    }
    switch (act) {
      case 'back':
        return this.back();
      case 'open-ext':
        return this.push({ id: 'ext', app: arg, view: 'main', data: '' });
      case 'home':
        this.overlay = null;
        this.stack = [{ id: 'home' }];
        return;
      case 'recent':
        return this.toast('최근 앱이 없어요');
      case 'open':
        if (arg === 'sms') this.unread.sms = 0;
        if (arg === 'messenger') this.unread.messenger = 0;
        if (arg === 'phone') return this.push({ id: 'contacts' });
        if (arg === 'browser')
          return this.push({ id: 'browser', host: 'search.example' });
        return this.push({ id: arg } as Screen);
      case 'chat':
        return this.push({ id: 'chat', who: arg });
      case 'plus':
        return this.push({ id: 'attach', who: arg });
      case 'album':
        this.picked.clear();
        this.stack.pop();
        return this.push({ id: 'album', who: arg });
      case 'attach-cam':
        this.stack.pop();
        return this.push({ id: 'camera' });
      case 'pick': {
        const i = Number(arg);
        if (this.picked.has(i)) this.picked.delete(i);
        else this.picked.add(i);
        return;
      }
      case 'send-photos': {
        const s = this.top;
        if (s.id !== 'album' || this.picked.size === 0) {
          this.toast('보낼 사진을 먼저 고르세요');
          return false;
        }
        for (const i of this.picked)
          (this.chats[s.who] ??= []).push({ me: true, photo: this.photos[i] });
        this.picked.clear();
        this.stack.pop();
        return this.toast('사진을 보냈어요');
      }
      case 'send-text':
        return this.toast('글자는 키보드로 입력해요 (연습에서는 생략)');
      case 'sms-thread':
        return this.push({ id: 'sms-thread', from: arg });
      case 'link': {
        const line = this.sms.find((l) => l.text.includes(arg));
        return this.openLink(arg, line?.text ?? '');
      }
      case 'shutter':
        // QR이 비춰져 있으면 셔터가 판독, 판독한 뒤에 누르면 다음 QR을 비춘다.
        if (this.qr && this.camQr) {
          if (this.camQr.judged) return this.aimQr();
          const scanned = this.qr.scan(this.camQr.index);
          if (!scanned) return;
          this.camQr = { ...this.camQr, judged: true, html: scanned.html };
          // 위험·주의면 틀이 조여진 뒤 문자 판독과 같은 경고 팝업을 띄운다.
          if (scanned.result.riskLevel !== 'SAFE') {
            this.blockedHosts.add(hostOf(scanned.content));
            const index = this.camQr.index;
            setTimeout(() => {
              if (this.camQr?.index !== index || !this.camQr.judged) return;
              this.overlay = {
                kind: 'qr-warn',
                content: scanned.content,
                place: scanned.place,
                result: scanned.result,
              };
              this.render();
            }, 900);
          }
          return;
        }
        this.photos.unshift(['🌳', '🏠', '🌼', '🐱'][this.photos.length % 4]);
        this.flash = true;
        setTimeout(() => {
          this.flash = false;
          this.render();
        }, 350);
        return this.toast('찰칵! 사진첩에 저장했어요');
      case 'photo':
        return this.push({ id: 'photo', index: Number(arg) });
      case 'go':
        return this.push({ id: arg } as Screen);
      case 'wifi-toggle':
        this.wifiOn = !this.wifiOn;
        if (!this.wifiOn) this.wifiConnected = false;
        return;
      case 'wifi-net':
        if (!this.wifiOn) {
          this.wifiOn = true;
        }
        if (arg === 'home') return this.push({ id: 'wifi-pw' });
        return this.toast('비밀번호를 모르는 와이파이예요');
      case 'wifi-connect':
        this.wifiConnected = true;
        this.stack.pop();
        return this.toast('우리집_WiFi에 연결했어요');
      case 'font':
        this.fontScale = Math.min(
          1.5,
          Math.max(0.85, this.fontScale + (arg === '+' ? 0.15 : -0.15)),
        );
        return;
      case 'contact':
        return this.push({ id: 'contact', who: arg });
      case 'call':
        return this.push({
          id: 'call',
          who: arg.split(':')[0],
          video: arg.endsWith(':video'),
        });
      case 'hang':
        this.stack.pop();
        return this.toast('통화를 끝냈어요');
      case 'alarm-add':
        this.draftHour = 8;
        return this.push({ id: 'alarm-edit' });
      case 'hour':
        this.draftHour = (this.draftHour + (arg === '+' ? 1 : 23)) % 24;
        return;
      case 'alarm-save':
        this.alarms.push({ h: this.draftHour, m: 0, on: true });
        this.stack.pop();
        return this.toast(`${this.draftHour}시에 알람을 맞췄어요`);
      case 'alarm-toggle': {
        const a = this.alarms[Number(arg)];
        if (a) a.on = !a.on;
        return;
      }
      case 'heads':
        if (this.heads) {
          const m = this.heads;
          this.heads = null;
          if (m.app === 'sms') this.push({ id: 'sms-thread', from: m.from });
          else this.push({ id: 'chat', who: m.from });
        }
        return;
      case 'ov-close':
        this.overlay = null;
        return;
      case 'qr-open':
        this.overlay = null;
        return this.openLink(arg, '');
      case 'qr-next':
        this.overlay = null;
        return this.aimQr();
      case 'ov-view': {
        const ov = this.overlay;
        this.overlay = null;
        if (ov?.kind === 'warn') {
          this.unread.sms = 0;
          this.push(
            ov.msg.app === 'sms'
              ? { id: 'sms-thread', from: ov.msg.from }
              : { id: 'chat', who: ov.msg.from },
          );
        }
        return;
      }
      case 'install-cancel':
        this.overlay = null;
        this.stack = [{ id: 'home' }];
        return this.toast('설치하지 않았어요. 잘하셨어요!');
      case 'msg': {
        const [where, idx] = arg.split('|');
        const text =
          where === 'sms'
            ? this.sms[Number(idx)]?.text
            : this.chats[where]?.[Number(idx)]?.text;
        if (text) this.overlay = { kind: 'msg-menu', text };
        return;
      }
      case 'copy': {
        if (this.overlay?.kind !== 'msg-menu') return;
        this.clipboard = this.overlay.text;
        // 실제 기기의 클립보드에도 넣어 다른 곳에 붙여 넣을 수 있게 한다(막혀 있으면 휴대폰 안에서만 복사).
        navigator.clipboard?.writeText(this.clipboard).catch(() => undefined);
        this.overlay = null;
        return this.toast('복사했어요');
      }
      case 'noop':
        return;
      case 'install-anyway':
        this.overlay = null;
        return;
    }
  }

  // ---------- 그리기 ----------
  private g(gid: string) {
    return `data-gid="${gid}"`;
  }

  private bar(
    title: string,
    icons: (keyof typeof PHONE_ICONS)[] = ['search', 'more'],
  ) {
    return `<div class="vp-bar"><button data-act="back" aria-label="뒤로">${ICON.back}</button><span class="t">${esc(title)}</span>${icons.map((i) => `<span class="ico">${PHONE_ICONS[i]}</span>`).join('')}</div>`;
  }

  private contact(id: string) {
    return CONTACTS.find((c) => c.id === id);
  }

  private avatar(id: string, size = '') {
    const c = this.contact(id);
    const color = c?.color ?? '#94a3b8';
    const ini = c?.initial ?? id.match(/[가-힣A-Za-z0-9]/)?.[0] ?? '?';
    return `<span class="vp-av" style="background:${color};${size}">${esc(ini)}</span>`;
  }

  private row(opts: {
    act: string;
    arg?: string;
    gid?: string;
    icon: string;
    color: string;
    title: string;
    sub?: string;
    subOn?: boolean;
    chev?: boolean;
    right?: string;
  }) {
    return `<button class="vp-row" data-act="${opts.act}" ${opts.arg !== undefined ? `data-arg="${esc(opts.arg)}"` : ''} ${opts.gid ? this.g(opts.gid) : ''}><span class="ic" style="background:${opts.color}">${opts.icon}</span><span class="tx"><b>${esc(opts.title)}</b>${opts.sub ? `<small class="${opts.subOn ? 'on' : ''}">${esc(opts.sub)}</small>` : ''}</span>${opts.right ?? ''}${opts.chev ? `<span class="chev">${PHONE_ICONS.chevron}</span>` : ''}</button>`;
  }

  private photoTile(i: number, cls: string, act: string, gid?: string) {
    return `<button class="vp-pic ${cls}" data-act="${act}" data-arg="${i}" ${gid ? this.g(gid) : ''} aria-label="사진 ${i + 1}" style="background:${PHOTO_BG[i % PHOTO_BG.length]}">${this.photos[i]}</button>`;
  }

  private screenHtml(s: Screen): {
    html: string;
    dark?: boolean;
    wall?: boolean;
  } {
    switch (s.id) {
      case 'home': {
        const badge = (id: string) => {
          const n =
            id === 'sms'
              ? this.unread.sms
              : id === 'messenger'
                ? this.unread.messenger
                : 0;
          return n ? `<span class="vp-badge">${n}</span>` : '';
        };
        const app = (a: (typeof APPS)[number]) =>
          `<button class="vp-app" data-act="open" data-arg="${a.id}" ${this.g(`home:${a.id}`)} aria-label="${a.label}"><i class="${'dark' in a ? 'dk' : ''}" style="background:${a.bg}">${a.svg}</i>${a.label}${badge(a.id)}</button>`;
        const ext = this.apps
          .map(
            (a) =>
              `<button class="vp-app" data-act="open-ext" data-arg="${a.id}" ${this.g(`home:${a.id}`)} aria-label="${esc(a.label)}"><i style="background:${a.bg}">${a.icon}</i>${esc(a.label)}</button>`,
          )
          .join('');
        return {
          wall: true,
          html: `<div class="vp-widget"><b>10:30</b><span>10월 29일 목요일</span><br><span class="vp-weather">${PHONE_ICONS.sun} 18° 맑음 · 우리 동네</span></div>
            <div class="vp-grid">${ext}${APPS.slice(3).map(app).join('')}</div>
            <div class="vp-dots"><i></i><i></i></div>
            <div class="vp-searchbar">${PHONE_ICONS.search}<span class="g">검색</span>${PHONE_ICONS.mic}</div>
            <div class="vp-dock">${APPS.slice(0, 3).map(app).join('')}</div>`,
        };
      }
      case 'messenger': {
        const keys = [
          ...CONTACTS.slice(0, 2).map((c) => c.id),
          ...Object.keys(this.chats).filter(
            (k) => !CONTACTS.some((c) => c.id === k),
          ),
        ];
        return {
          html: `${this.bar('채팅', ['search', 'plus'])}<div class="vp-list">${keys
            .map((k) => {
              const last = this.chats[k]?.at(-1);
              const preview = last?.photo
                ? '사진을 보냈습니다.'
                : (last?.text ?? '');
              const name = this.contact(k)?.name ?? k;
              return `<button class="vp-row" data-act="chat" data-arg="${esc(k)}" ${this.contact(k) ? this.g(`messenger:${k}`) : ''}>${this.avatar(k)}<span class="tx"><b>${esc(name)}</b><small>${esc(preview)}</small></span><span class="meta">오전 10:2${keys.indexOf(k)}</span></button>`;
            })
            .join('')}</div>`,
        };
      }
      case 'chat': {
        const name = this.contact(s.who)?.name ?? s.who;
        const lines = (this.chats[s.who] ?? [])
          .map((l, i, arr) => {
            const first = !l.me && (i === 0 || arr[i - 1].me);
            const body = l.photo
              ? `<span class="ph" style="background:${PHOTO_BG[Math.max(0, this.photos.indexOf(l.photo)) % PHOTO_BG.length]}">${l.photo}</span>`
              : esc(l.text ?? '');
            if (l.me)
              return `<div class="vp-line me"><div class="col"><div class="vp-msg">${body}</div></div><span class="tm">1<br>오전 10:3${i % 10}</span></div>`;
            return `<div class="vp-line">${first ? `<span class="who" style="background:${this.contact(s.who)?.color ?? '#94a3b8'}">${esc(this.contact(s.who)?.initial ?? name.slice(0, 1))}</span>` : '<span style="width:34px;flex:none"></span>'}<div class="col">${first ? `<span class="nm">${esc(name)}</span>` : ''}<div class="vp-msg" ${l.photo ? '' : `data-act="msg" data-arg="${esc(s.who)}|${i}" role="button" aria-label="메시지 메뉴 열기"`}>${body}</div></div><span class="tm">오전 10:2${i % 10}</span></div>`;
          })
          .join('');
        return {
          html: `${this.bar(name, ['search', 'more'])}<div class="vp-chat"><span class="vp-date">2026년 10월 29일 목요일</span>${lines}</div>
            <div class="vp-input"><button class="plus" data-act="plus" data-arg="${esc(s.who)}" ${this.g('chat:plus')} aria-label="더하기">${PHONE_ICONS.plus}</button><span class="fld">메시지 입력${PHONE_ICONS.smile}</span><button class="snd" data-act="send-text" aria-label="보내기">${PHONE_ICONS.send}</button></div>`,
        };
      }
      case 'attach':
        return {
          html: `${this.bar(this.contact(s.who)?.name ?? s.who)}<div class="vp-chat" style="flex:1"></div><div class="vp-sheet">
            <button data-act="album" data-arg="${esc(s.who)}" ${this.g('attach:album')}><i style="background:#22c55e">${PHONE_ICONS.gallery}</i>앨범</button>
            <button data-act="attach-cam" ${this.g('attach:camera')}><i style="background:#3b82f6">${PHONE_ICONS.camera}</i>카메라</button>
            <button data-act="send-text"><i style="background:#f59e0b">${PHONE_ICONS.file}</i>파일</button>
            <button data-act="send-text"><i style="background:#8b5cf6">${PHONE_ICONS.user}</i>연락처</button>
            <button data-act="send-text"><i style="background:#ef4444">${PHONE_ICONS.pin}</i>지도</button>
            <button data-act="send-text"><i style="background:#06b6d4">${PHONE_ICONS.mic}</i>음성 메모</button>
            <button data-act="send-text"><i style="background:#64748b">${PHONE_ICONS.video}</i>영상</button>
            <button data-act="send-text"><i style="background:#ec4899">${PHONE_ICONS.smile}</i>이모티콘</button></div>`,
        };
      case 'album':
        return {
          html: `${this.bar('최근 항목', [])}<div class="vp-pics" style="flex:1;align-content:start">${this.photos
            .map((_, i) =>
              this.photoTile(
                i,
                this.picked.has(i) ? 'sel' : '',
                'pick',
                `album:photo-${i}`,
              ),
            )
            .join(
              '',
            )}</div><div class="vp-foot"><span class="info">${this.picked.size ? `${this.picked.size}장 선택됨` : '보낼 사진을 고르세요'}</span><button class="vp-btn yel" data-act="send-photos" ${this.g('album:send')}>전송</button></div>`,
        };
      case 'sms': {
        const senders = [...new Set(this.sms.map((l) => l.from))].reverse();
        return {
          html: `${this.bar('메시지', ['search', 'more'])}<div class="vp-list">${senders
            .map((from, i) => {
              const last = [...this.sms]
                .reverse()
                .find((l) => l.from === from)!;
              const risky = last.risk && last.risk.riskLevel !== 'SAFE';
              return `<button class="vp-row" data-act="sms-thread" data-arg="${esc(from)}">${risky ? `<span class="vp-av" style="background:${RISK_TEXT[last.risk!.riskLevel].color}">${PHONE_ICONS.shield}</span>` : this.avatar(from)}<span class="tx"><b>${esc(from)}</b><small>${esc(last.text)}</small></span><span class="meta">오전 10:${30 - i}</span></button>`;
            })
            .join('')}</div>`,
        };
      }
      case 'sms-thread': {
        const lines = this.sms
          .map((l, idx) => ({ l, idx }))
          .filter(({ l }) => l.from === s.from)
          .map(({ l, idx }, i) => {
            const body = esc(l.text).replace(
              LINK_RE,
              (m) =>
                `<button class="vp-link" data-act="link" data-arg="${m}">${m}</button>`,
            );
            const band =
              l.risk && l.risk.riskLevel !== 'SAFE'
                ? `<span class="vp-riskband" style="background:${RISK_TEXT[l.risk.riskLevel].color}">${PHONE_ICONS.shield}안심 지킴이 · ${l.risk.riskLevel === 'DANGER' ? '사기 의심' : '주의'} 위험도 ${l.risk.score}%</span>`
                : '';
            return `<div class="vp-line"><div class="col">${band}<div class="vp-msg" data-act="msg" data-arg="sms|${idx}" role="button" aria-label="문자 메뉴 열기">${body}</div></div><span class="tm">오전 10:${20 + i}</span></div>`;
          })
          .join('');
        return {
          html: `${this.bar(s.from, ['phone', 'more'])}<div class="vp-chat sms"><span class="vp-date">10월 29일 목요일</span>${lines}</div>
            <div class="vp-input"><button class="plus" data-act="send-text" aria-label="더하기">${PHONE_ICONS.plus}</button><span class="fld">메시지 입력${PHONE_ICONS.smile}</span><button class="snd" style="background:#2563eb;color:#fff" data-act="send-text" aria-label="보내기">${PHONE_ICONS.send}</button></div>`,
        };
      }
      case 'camera': {
        const qr = this.qr && this.camQr ? this.camQr : null;
        const view = qr
          ? qr.html
          : `<div class="vp-camv"><span class="grid"></span>🌳${this.flash ? '<span class="vp-flash"></span>' : ''}</div>`;
        return {
          dark: true,
          html: `<div class="vp-camtop">${PHONE_ICONS.flash}${PHONE_ICONS.settings}</div>${view}
            <div class="vp-zoom"><span>.5</span><span class="on">1×</span><span>2</span></div>
            <div class="vp-modes"><span>동영상</span><span class="on">사진</span><span>인물</span></div>
            <div class="vp-camc"><button class="vp-thumb" data-act="go" data-arg="gallery" aria-label="갤러리" style="background:${PHOTO_BG[0]}">${this.photos[0] ?? ''}</button>
            <button class="vp-shut" data-act="shutter" ${this.g('camera:shutter')} aria-label="${qr ? (qr.judged ? '다음 QR 비추기' : '찍어서 QR 판독하기') : '찍기'}"></button>
            <button class="vp-flip" data-act="send-text" aria-label="화면 전환">${PHONE_ICONS.flip}</button></div>`,
        };
      }
      case 'gallery':
        return {
          html: `${this.bar('갤러리', ['search', 'more'])}<div class="vp-tabs"><span class="on">사진</span><span>앨범</span><span>스토리</span></div><div class="vp-sub">오늘</div><div class="vp-pics">${this.photos
            .map((_, i) => this.photoTile(i, 'view', 'photo'))
            .join('')}</div>`,
        };
      case 'photo':
        return {
          dark: true,
          html: `<div class="vp-camv" style="background:${PHOTO_BG[s.index % PHOTO_BG.length]}">${this.photos[s.index] ?? ''}</div>
            <div class="vp-actions" style="background:#000;color:#fff">${(['share', 'edit', 'trash'] as const).map((k) => `<button data-act="send-text" style="color:#e5e7eb"><i style="background:rgba(255,255,255,.12);color:#fff">${PHONE_ICONS[k]}</i>${k === 'share' ? '공유' : k === 'edit' ? '편집' : '삭제'}</button>`).join('')}</div>`,
        };
      case 'settings':
        return {
          html: `${this.bar('설정', ['search'])}
            <div class="vp-list"><button class="vp-row" data-act="send-text"><span class="vp-av" style="background:#6366f1">나</span><span class="tx"><b>내 프로필</b><small>계정 · 개인 정보</small></span><span class="chev">${PHONE_ICONS.chevron}</span></button></div>
            <div class="vp-list">
            ${this.row({ act: 'go', arg: 'connections', gid: 'settings:connections', icon: PHONE_ICONS.wifi, color: '#3b82f6', title: '연결', sub: 'Wi-Fi · 블루투스 · 비행기 탑승 모드' })}
            ${this.row({ act: 'send-text', icon: PHONE_ICONS.sound, color: '#a855f7', title: '소리 및 진동', sub: '소리 모드 · 벨소리' })}
            ${this.row({ act: 'send-text', icon: PHONE_ICONS.info, color: '#f43f5e', title: '알림', sub: '앱 알림 · 상태 표시줄' })}
            ${this.row({ act: 'go', arg: 'display', gid: 'settings:display', icon: PHONE_ICONS.sun, color: '#22c55e', title: '디스플레이', sub: '밝기 · 글자 크기 · 어두운 화면' })}
            ${this.row({ act: 'send-text', icon: PHONE_ICONS.battery, color: '#10b981', title: '배터리', sub: '82%' })}
            </div>`,
        };
      case 'connections':
        return {
          html: `${this.bar('연결', ['search'])}<div class="vp-list">
            ${this.row({ act: 'go', arg: 'wifi', gid: 'connections:wifi', icon: PHONE_ICONS.wifi, color: '#3b82f6', title: 'Wi-Fi', sub: this.wifiConnected ? '우리집_WiFi' : this.wifiOn ? '켜짐' : '꺼짐', subOn: this.wifiConnected, right: `<span class="vp-sw ${this.wifiOn ? 'on' : ''}"></span>` })}
            ${this.row({ act: 'send-text', icon: PHONE_ICONS.bluetooth, color: '#2563eb', title: '블루투스', sub: '꺼짐', right: '<span class="vp-sw"></span>' })}
            ${this.row({ act: 'send-text', icon: PHONE_ICONS.plane, color: '#f59e0b', title: '비행기 탑승 모드', right: '<span class="vp-sw"></span>' })}
            </div>`,
        };
      case 'wifi':
        return {
          html: `${this.bar('Wi-Fi', ['more'])}<div class="vp-list"><button class="vp-row" data-act="wifi-toggle" ${this.g('wifi:toggle')}><span class="tx"><b>${this.wifiOn ? '사용 중' : '사용 안 함'}</b></span><span class="vp-sw ${this.wifiOn ? 'on' : ''}"></span></button></div>
            ${
              this.wifiOn
                ? `<div class="vp-sub">${this.wifiConnected ? '현재 네트워크' : '사용 가능한 네트워크'}</div><div class="vp-list">${[
                    [
                      'home',
                      '우리집_WiFi',
                      this.wifiConnected ? '연결됨' : '보안',
                    ],
                    ['cafe', 'Cafe_Free', '열린 네트워크'],
                    ['other', 'iptime_5G', '보안'],
                  ]
                    .map(
                      ([id, name, sub]) =>
                        `<button class="vp-row" data-act="wifi-net" data-arg="${id}" ${this.g(`wifi:${id}`)}><span class="ic" style="background:#e8f0fe;color:#2563eb">${PHONE_ICONS.wifi}</span><span class="tx"><b>${name}</b><small class="${sub === '연결됨' ? 'on' : ''}">${sub}</small></span>${id !== 'cafe' ? `<span class="chev">${PHONE_ICONS.lock}</span>` : ''}</button>`,
                    )
                    .join('')}</div>`
                : '<div class="vp-preview" style="color:#6b7280">Wi-Fi를 켜면 사용할 수 있는 네트워크가 보여요.</div>'
            }`,
        };
      case 'wifi-pw':
        return {
          html: `<div class="vp-dimmed">${this.bar('Wi-Fi', [])}<div class="vp-dialog"><h5>우리집_WiFi</h5><span style="color:#6b7280;font-size:.9em">비밀번호</span><div class="pw">●●●●●●●●${PHONE_ICONS.lock}</div><small style="color:#6b7280">공유기 뒷면의 비밀번호를 넣었어요 (연습)</small>
            <div class="btns"><button class="ghost" data-act="back">취소</button><button data-act="wifi-connect" ${this.g('wifipw:connect')}>연결</button></div></div></div>`,
        };
      case 'display':
        return {
          html: `${this.bar('디스플레이', ['search'])}<div class="vp-list">
            ${this.row({ act: 'send-text', icon: PHONE_ICONS.sun, color: '#f59e0b', title: '밝기', sub: '자동' })}
            ${this.row({ act: 'go', arg: 'font', gid: 'display:font', icon: '<b style="font-size:15px">가</b>', color: '#22c55e', title: '글자 크기와 스타일', sub: `${Math.round(this.fontScale * 100)}%`, chev: true })}
            ${this.row({ act: 'send-text', icon: '<b style="font-size:15px">◐</b>', color: '#334155', title: '어두운 화면', right: '<span class="vp-sw"></span>' })}
            </div>`,
        };
      case 'font':
        return {
          html: `${this.bar('글자 크기와 스타일', [])}<div class="vp-preview"><b>미리보기</b><br>가나다라마바사<br>안녕하세요. 글자 크기를 바꾸면 휴대폰의 모든 글자가 함께 바뀌어요.</div>
            <div class="vp-sub">글자 크기</div><div class="vp-list"><div class="vp-slider"><button data-act="font" data-arg="-" ${this.g('font:minus')} aria-label="글자 작게">가-</button><span class="tr"><i style="width:${((this.fontScale - 0.85) / 0.65) * 100}%"></i></span><button data-act="font" data-arg="+" ${this.g('font:plus')} aria-label="글자 크게" style="font-size:1.15em">가+</button></div></div>`,
        };
      case 'contacts':
        return {
          html: `${this.bar('연락처', ['search', 'plus'])}<div class="vp-tabs"><span>키패드</span><span>최근 기록</span><span class="on">연락처</span></div><div class="vp-list">${CONTACTS.map(
            (c) =>
              `<button class="vp-row" data-act="contact" data-arg="${c.id}" ${this.g(`contacts:${c.id}`)}>${this.avatar(c.id)}<span class="tx"><b>${c.name}</b><small>${c.phone}</small></span></button>`,
          ).join('')}</div>`,
        };
      case 'contact': {
        const c = this.contact(s.who)!;
        return {
          html: `${this.bar('', ['edit', 'more'])}<div class="vp-profile">${this.avatar(c.id)}<b>${c.name}</b><small>휴대전화 ${c.phone}</small></div>
            <div class="vp-actions"><button data-act="call" data-arg="${c.id}:voice" ${this.g('contact:voice')}><i style="background:#dcfce7;color:#16a34a">${PHONE_ICONS.phone}</i>전화</button><button data-act="call" data-arg="${c.id}:video" ${this.g('contact:video')}><i>${PHONE_ICONS.video}</i>영상통화</button><button data-act="send-text"><i style="background:#fef3c7;color:#d97706">${PHONE_ICONS.mail}</i>메시지</button></div>
            <div class="vp-list"><div class="vp-row" style="cursor:default"><span class="tx"><small>휴대전화</small><b>${c.phone}</b></span></div></div>`,
        };
      }
      case 'call': {
        const c = this.contact(s.who)!;
        const items: [keyof typeof PHONE_ICONS, string][] = [
          ['record', '녹음'],
          ['video', '영상통화'],
          ['bluetooth', '블루투스'],
          ['sound', '스피커'],
          ['muteMic', '음소거'],
          ['keypad', '키패드'],
        ];
        return {
          dark: true,
          html: `<div class="vp-callscr">${this.avatar(c.id)}<b style="font-size:1.6em;margin-top:12px">${c.name}</b><span class="st">${s.video ? '영상통화 연결 중…' : '전화 거는 중…'}</span><span class="st" style="font-size:.85em">${c.phone}</span>
            <div class="vp-callgrid">${items.map(([k, label]) => `<span><i>${PHONE_ICONS[k]}</i>${label}</span>`).join('')}</div>
            <button class="vp-hang" data-act="hang" ${this.g('call:hang')} aria-label="통화 끊기">${PHONE_ICONS.hangup}</button></div>`,
        };
      }
      case 'clock': {
        const next = this.alarms.find((a) => a.on);
        return {
          html: `${this.bar('알람', ['more'])}<div class="vp-tabs"><span class="on">알람</span><span>세계 시각</span><span>스톱워치</span><span>타이머</span></div>
            <div class="vp-preview" style="text-align:center;background:none;padding:8px 0 4px"><b style="font-size:1.15em">${next ? `${next.h < 12 ? '오전' : '오후'} ${next.h % 12 || 12}:00에 알람이 울려요` : '켜진 알람이 없어요'}</b></div>
            <div class="vp-pad" style="gap:8px">${this.alarms
              .map(
                (a, i) =>
                  `<button class="vp-alarm ${a.on ? '' : 'off'}" data-act="alarm-toggle" data-arg="${i}"><span style="flex:1"><span class="tm"><small>${a.h < 12 ? '오전' : '오후'}</small>${a.h % 12 || 12}:${String(a.m).padStart(2, '0')}</span><span class="days">${['일', '월', '화', '수', '목', '금', '토'].map((d, j) => `<span class="${a.on && j > 0 && j < 6 ? 'on' : ''}">${d}</span>`).join('')}</span></span><span class="vp-sw ${a.on ? 'on' : ''}"></span></button>`,
              )
              .join('')}</div>
            <button class="vp-fab" data-act="alarm-add" ${this.g('clock:add')}>${PHONE_ICONS.plus} 알람 추가</button>`,
        };
      }
      case 'alarm-edit':
        return {
          html: `${this.bar('알람 추가', [])}<div class="vp-list"><div class="vp-time"><span class="ap">${this.draftHour < 12 ? '오전' : '오후'}</span><span class="hm"><button data-act="hour" data-arg="-" aria-label="한 시간 앞으로">▲</button><b>${this.draftHour % 12 || 12}</b><button data-act="hour" data-arg="+" aria-label="한 시간 뒤로">▼</button></span><b style="font-size:3.2em;font-weight:300">:</b><span class="hm"><b>00</b></span></div></div>
            <div class="vp-list">${this.row({ act: 'send-text', icon: PHONE_ICONS.sound, color: '#a855f7', title: '알람음', sub: '아침 햇살' })}${this.row({ act: 'send-text', icon: PHONE_ICONS.clock, color: '#0ea5e9', title: '반복', sub: '월, 화, 수, 목, 금' })}</div>
            <div class="vp-foot" style="background:none;margin-top:auto"><button class="vp-btn gray" style="flex:1" data-act="back">취소</button><button class="vp-btn" style="flex:1" data-act="alarm-save" ${this.g('alarm:save')}>저장</button></div>`,
        };
      case 'browser':
        return {
          html: `<div class="vp-url">${PHONE_ICONS.lock}<span>${esc(s.host)}</span></div><div class="vp-web">${
            s.host === 'search.example'
              ? `<span class="logo">검색</span><span class="box">${PHONE_ICONS.search}검색어를 입력하세요</span><small style="color:#9ca3af">연습용 인터넷 화면이에요</small>`
              : `<b style="font-size:1.2em">${esc(s.host)}</b><p style="margin:0;color:#6b7280">연습용 인터넷 화면이에요. 실제 사이트는 열리지 않아요.</p>`
          }</div>`,
        };
      case 'installer':
        return {
          html: `<div class="vp-dimmed"><div class="vp-dialog"><div style="display:flex;align-items:center;gap:10px"><span class="vp-av" style="background:#64748b;border-radius:14px">${PHONE_ICONS.file}</span><span><h5>보안인증</h5><small style="color:#6b7280">알 수 없는 출처의 앱</small></span></div><span>이 앱을 설치하시겠습니까?</span><div class="btns"><button class="ghost">취소</button><button>설치</button></div></div></div>`,
        };
      case 'ext': {
        const app = this.apps.find((a) => a.id === s.app);
        if (!app) return { html: '' };
        return app.render(s.view, s.data, this.appContext(s.app));
      }
    }
  }

  private overlayHtml() {
    const ov = this.overlay;
    if (!ov) return '';
    if (ov.kind === 'warn') {
      const t = RISK_TEXT[ov.result.riskLevel];
      return `<div class="vp-ov" role="alertdialog" aria-label="${t.title}"><div class="vp-pop">
        <div class="hd"><i style="background:${t.color}">${PHONE_ICONS.shield}</i><span><small>안심 지킴이 · 방금 받은 ${ov.msg.app === 'sms' ? '문자' : '메신저'}</small><h4 style="color:${t.color}">${t.title}</h4></span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:.9em"><span>위험도</span><span style="color:${t.color}">${ov.result.score}%</span></div>
        <div class="meter"><b style="width:${Math.max(4, ov.result.score)}%;background:${t.color}"></b></div>
        <ul>${ov.result.reasons
          .slice(0, 3)
          .map((r) => `<li>${esc(r)}</li>`)
          .join('')}</ul>
        <div class="tip">링크를 누르지 마세요. 돈·인증번호를 요구하면 가족에게 먼저 물어보세요.</div>
        <div class="btns"><button data-act="ov-view">문자 보기</button><button class="main" data-act="ov-close">알겠어요</button></div></div></div>`;
    }
    if (ov.kind === 'qr-warn') {
      const t = RISK_TEXT[ov.result.riskLevel];
      return `<div class="vp-ov" role="alertdialog" aria-label="${QR_RISK_TITLE[ov.result.riskLevel]}"><div class="vp-pop" style="color:#18181b">
        <div class="hd"><i style="background:${t.color}">${PHONE_ICONS.shield}</i><span><small>안심 지킴이 · 카메라로 찍은 QR</small><h4 style="color:${t.color}">${QR_RISK_TITLE[ov.result.riskLevel]}</h4></span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:.9em"><span>위험도</span><span style="color:${t.color}">${ov.result.score}%</span></div>
        <div class="meter"><b style="width:${Math.max(4, ov.result.score)}%;background:${t.color}"></b></div>
        <div class="vp-blockln" style="background:${t.soft};border-color:${t.color};color:${t.color}"><b>🔒 링크 접속을 차단했어요</b><span>${esc(hostOf(ov.content))}</span></div>
        <ul>${ov.result.reasons
          .slice(0, 3)
          .map((r) => `<li>${esc(r)}</li>`)
          .join('')}</ul>
        <div class="tip">${esc(ov.place)}에 붙어 있던 QR이에요.</div>
        <div class="btns"><button data-act="qr-next">다른 QR 비추기</button><button class="main" data-act="ov-close">알겠어요</button></div></div></div>`;
    }
    if (ov.kind === 'msg-menu') {
      return `<div class="vp-ov" data-act="ov-close" role="dialog" aria-label="문자 메뉴"><div class="vp-pop" data-act="noop"><span class="tip" style="max-height:96px;overflow:hidden">${esc(ov.text)}</span>
        <button class="main" data-act="copy">📋 복사</button><button data-act="ov-close">닫기</button></div></div>`;
    }
    if (ov.kind === 'blocked') {
      return `<div class="vp-full" role="alertdialog" aria-label="위험한 사이트를 막았어요"><span class="big">${PHONE_ICONS.shield}</span><h4>위험한 사이트를 막았어요</h4><p>사기 문자에 있던 사이트예요. 열지 않고 막았어요.<br>이름·비밀번호·계좌번호를 넣지 마세요.</p><button data-act="ov-close">알겠어요</button></div>`;
    }
    return `<div class="vp-full" role="alertdialog" aria-label="앱 설치를 멈췄어요"><span class="big">${PHONE_ICONS.shield}</span><h4>잠깐만요!<br>앱을 설치하려고 해요</h4><p>조금 전 사기 의심 문자를 받았어요. 문자 안내로 설치하는 앱은 휴대폰 속 돈과 정보를 빼갈 수 있어요. 가족에게 먼저 물어보세요.</p><button data-act="install-cancel">설치하지 않을래요</button><button class="sub" data-act="install-anyway">제가 원해서 설치해요</button></div>`;
  }

  private render() {
    const s = this.top;
    const { html, dark, wall } = this.screenHtml(s);
    const status = `<div class="vp-status"><span>10:30</span><span class="r">${this.wifiConnected ? PHONE_ICONS.wifi : '<b style="font-size:10px">LTE</b>'}${SIGNAL}${BATTERY}</span></div>`;
    const h = this.heads;
    const heads = h
      ? `<div class="vp-heads" data-act="heads" role="status"><span class="hd"><i style="background:${h.app === 'sms' ? '#2563eb' : '#eab308'}">${h.app === 'sms' ? PHONE_ICONS.mail : PHONE_ICONS.chat}</i>${h.app === 'sms' ? '메시지' : '메신저'}<em>지금</em></span><b>${esc(h.from)}</b><p>${esc(h.text.length > 70 ? `${h.text.slice(0, 70)}…` : h.text)}</p></div>`
      : '';
    const scrClass = wall ? 'vp-wall' : dark ? 'vp-dark' : '';
    const scrStyle = dark && !wall ? 'background:#000;color:#fff;' : '';
    this.root.innerHTML = `<div class="vp" aria-label="연습용 가상 휴대폰"><div class="vp-scr ${scrClass}" style="--vp-font:${this.fontScale};${scrStyle}">
      <span class="vp-cam-hole"></span>${status}<div class="vp-body">${html}</div>
      <div class="vp-nav" style="${wall ? 'background:transparent' : dark ? 'background:#000' : 'background:#f3f4f8'}"><button data-act="recent" aria-label="최근 앱">${ICON.recent}</button><button data-act="home" aria-label="홈">${ICON.home}</button><button data-act="back" aria-label="뒤로">${ICON.back}</button></div>
      ${heads}${this.overlayHtml()}
      ${this.toastText ? `<div class="vp-toast" role="status">${esc(this.toastText)}</div>` : ''}
    </div></div>`;
  }
}
