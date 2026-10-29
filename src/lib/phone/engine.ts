/**
 * 자유롭게 조작하는 가상 휴대폰(연습용).
 * 홈·메신저·문자·카메라·사진첩·설정·전화·시계·인터넷 앱을 실제처럼 오가며 쓸 수 있고,
 * 안내 모드에서는 지금 눌러야 할 곳(data-gid)에 노란 테두리를 띄운다.
 * 문자를 받으면 채점 함수로 검사해 위험하면 경고 팝업·링크 차단·설치 가리기를 보여 준다.
 * React 밖의 순수 DOM 코드라 앱(클라이언트 컴포넌트)과 미리보기 페이지가 함께 쓴다.
 */

export type Risk = 'SAFE' | 'CAUTION' | 'DANGER';
export type Analysis = { riskLevel: Risk; score: number; reasons: string[] };
export type PhoneGuide = {
  title: string;
  steps: { instruction: string; target: string }[];
};
export type IncomingMessage = {
  app: 'sms' | 'messenger';
  from: string;
  text: string;
};

export type PhoneEvent =
  | { type: 'guide-step'; index: number }
  | { type: 'guide-done' }
  | { type: 'message-checked'; message: IncomingMessage; result: Analysis };

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
  startGuide(guide: PhoneGuide): void;
  /** 휴대폰 안 입력칸(data-model)의 현재 값 */
  drafts: Record<string, string>;
};

/**
 * 휴대폰에 설치하는 앱. render는 화면 HTML을, handle은 data-act="x:앱id:동작" 버튼의 동작을 맡는다.
 * handle이 false를 돌려주면 안내 단계를 넘기지 않는다.
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
  return `<div class="vp-bar"><button data-act="back" aria-label="뒤로">${ICON.back}</button>${esc(title)}</div>`;
}

export { esc as escapeHtml };

type ChatLine = { me: boolean; text?: string; photo?: string };
type SmsLine = { from: string; text: string; risk?: Analysis };
type Overlay =
  | { kind: 'warn'; msg: IncomingMessage; result: Analysis }
  | { kind: 'blocked' }
  | { kind: 'install-guard' };

const PHOTOS = ['👶', '🌸', '⛰️', '🍚', '🐶', '🌅'];
const CONTACTS = [
  { id: 'son', name: '아들', icon: '👨', phone: '010-1234-5678' },
  { id: 'daughter', name: '딸', icon: '👩', phone: '010-2345-6789' },
  { id: 'clinic', name: '동네병원', icon: '🏥', phone: '02-123-4567' },
];
const APPS = [
  { id: 'phone', label: '전화', icon: '📞', bg: '#22c55e' },
  { id: 'messenger', label: '메신저', icon: '💬', bg: '#facc15' },
  { id: 'sms', label: '문자', icon: '✉️', bg: '#3b82f6' },
  { id: 'camera', label: '카메라', icon: '📷', bg: '#475569' },
  { id: 'gallery', label: '사진첩', icon: '🖼️', bg: '#ec4899' },
  { id: 'settings', label: '설정', icon: '⚙️', bg: '#64748b' },
  { id: 'clock', label: '시계', icon: '⏰', bg: '#0ea5e9' },
  { id: 'browser', label: '인터넷', icon: '🌐', bg: '#8b5cf6' },
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

const RISK_TEXT: Record<Risk, { icon: string; title: string; color: string }> =
  {
    DANGER: {
      icon: '🚨',
      title: '사기 문자일 가능성이 높아요',
      color: '#b91c1c',
    },
    CAUTION: {
      icon: '⚠️',
      title: '조심하세요, 의심스러운 문자예요',
      color: '#b45309',
    },
    SAFE: { icon: '✅', title: '위험한 점을 찾지 못했어요', color: '#15803d' },
  };

const STYLE_ID = 'vp-style';
const CSS = `
.vp{position:relative;width:100%;max-width:var(--vp-max,330px);aspect-ratio:9/18.5;border-radius:44px;background:#0b0b0f;padding:10px;box-sizing:border-box;box-shadow:0 18px 40px rgba(0,0,0,.25);user-select:none;-webkit-tap-highlight-color:transparent}
.vp *{box-sizing:border-box}
.vp-scr{position:relative;width:100%;height:100%;border-radius:34px;overflow:hidden;background:#f2f3f7;color:#16181d;font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;display:flex;flex-direction:column;font-size:calc(13px * var(--vp-font,1))}
.vp-cam-hole{position:absolute;top:8px;left:50%;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#000;z-index:30}
.vp-status{height:28px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 22px;font-size:11px;font-weight:700;z-index:5}
.vp-dark .vp-status{color:#fff}
.vp-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;scrollbar-width:none}
.vp-body::-webkit-scrollbar{display:none}
.vp-nav{height:40px;flex:none;display:flex;justify-content:space-around;align-items:center;background:inherit}
.vp-nav button{width:56px;height:36px;border:0;background:none;cursor:pointer;color:#3f3f46;display:grid;place-items:center;border-radius:10px}
.vp-dark .vp-nav button{color:#e4e4e7}
.vp-nav button:active{background:rgba(0,0,0,.08)}
.vp-wall{background:linear-gradient(160deg,#1e3a8a 0%,#4f46e5 45%,#c084fc 100%)}
.vp-clockw{color:#fff;text-align:center;padding:26px 0 10px}
.vp-clockw b{display:block;font-size:46px;font-weight:300;letter-spacing:-1px}
.vp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px 4px;padding:18px 12px;margin-top:auto}
.vp-app{display:flex;flex-direction:column;align-items:center;gap:5px;border:0;background:none;cursor:pointer;color:#fff;font:inherit;font-size:.85em;font-weight:600;position:relative;border-radius:16px;padding:2px}
.vp-app i{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;font-style:normal;font-size:26px;box-shadow:0 3px 8px rgba(0,0,0,.25)}
.vp-badge{position:absolute;top:-2px;right:6px;min-width:18px;height:18px;border-radius:9px;background:#ef4444;color:#fff;font-size:11px;display:grid;place-items:center;padding:0 4px}
.vp-dock{display:flex;justify-content:space-around;margin:4px 12px 10px;padding:10px 0;border-radius:24px;background:rgba(255,255,255,.18)}
.vp-bar{height:52px;flex:none;display:flex;align-items:center;gap:6px;padding:0 10px;background:#fff;border-bottom:1px solid #e7e7ec;font-weight:800;font-size:1.15em}
.vp-bar button{border:0;background:none;font:inherit;cursor:pointer;width:34px;height:34px;border-radius:50%;display:grid;place-items:center}
.vp-list{background:#fff;margin:10px;border-radius:18px;overflow:hidden}
.vp-row{width:100%;min-height:56px;display:flex;align-items:center;gap:12px;padding:8px 14px;border:0;border-bottom:1px solid #f0f0f4;background:#fff;font:inherit;text-align:left;cursor:pointer;color:inherit}
.vp-row:last-child{border-bottom:0}
.vp-row .ic{width:38px;height:38px;border-radius:50%;background:#eef2ff;display:grid;place-items:center;font-size:20px;flex:none}
.vp-row .tx{flex:1;min-width:0}
.vp-row .tx small{display:block;color:#71717a;font-size:.85em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vp-row .tx b{font-weight:700}
.vp-sw{width:42px;height:24px;border-radius:12px;background:#d4d4d8;position:relative;flex:none}
.vp-sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s}
.vp-sw.on{background:#2563eb}.vp-sw.on::after{left:21px}
.vp-chat{flex:1;background:#b9d3e8;padding:10px;display:flex;flex-direction:column;gap:8px}
.vp-msg{max-width:78%;padding:7px 11px;border-radius:16px;background:#fff;align-self:flex-start;line-height:1.4;word-break:break-all}
.vp-msg.me{align-self:flex-end;background:#fde047}
.vp-msg .ph{font-size:56px;line-height:1}
.vp-input{flex:none;display:flex;align-items:center;gap:6px;padding:6px 8px;background:#fff}
.vp-input .plus{width:36px;height:36px;border-radius:50%;border:0;background:#f4f4f5;font-size:22px;cursor:pointer}
.vp-input .fld{flex:1;height:36px;border-radius:18px;background:#f4f4f5;color:#a1a1aa;display:flex;align-items:center;padding:0 12px}
.vp-input .snd{height:36px;padding:0 12px;border-radius:18px;border:0;background:#facc15;font:inherit;font-weight:800;cursor:pointer}
.vp-sheet{background:#fff;border-radius:22px 22px 0 0;padding:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:auto}
.vp-sheet button{border:0;background:none;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;border-radius:14px;padding:4px}
.vp-sheet i{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:24px}
.vp-pics{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:3px}
.vp-pic{aspect-ratio:1;border:0;background:#e4e4e7;font-size:38px;cursor:pointer;position:relative;display:grid;place-items:center}
.vp-pic.sel::after{content:"✓";position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:#facc15;font-size:13px;display:grid;place-items:center;font-weight:900}
.vp-foot{flex:none;padding:10px;background:#fff;display:flex;justify-content:flex-end}
.vp-btn{min-height:42px;padding:0 18px;border-radius:21px;border:0;background:#2563eb;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.vp-btn.yel{background:#facc15;color:#18181b}
.vp-btn.red{background:#ef4444}
.vp-camv{flex:1;background:radial-gradient(circle at 50% 40%,#3f6212,#14532d 60%,#052e16);display:grid;place-items:center;font-size:90px;position:relative}
.vp-flash{position:absolute;inset:0;background:#fff;animation:vpflash .35s ease-out forwards}
@keyframes vpflash{to{opacity:0}}
.vp-camc{flex:none;height:110px;background:#000;display:flex;align-items:center;justify-content:space-around}
.vp-shut{width:66px;height:66px;border-radius:50%;border:5px solid #d4d4d8;background:#fff;cursor:pointer}
.vp-thumb{width:44px;height:44px;border-radius:12px;border:2px solid #fff;background:#27272a;font-size:24px;cursor:pointer;display:grid;place-items:center}
.vp-flip{width:44px;height:44px;border-radius:50%;border:0;background:#3f3f46;color:#fff;font-size:18px;cursor:pointer}
.vp-callscr{flex:1;background:linear-gradient(#0f172a,#1e293b);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:40px 0 30px}
.vp-callscr .av{width:96px;height:96px;border-radius:50%;background:#334155;display:grid;place-items:center;font-size:52px}
.vp-hang{width:62px;height:62px;border-radius:50%;border:0;background:#ef4444;color:#fff;font-size:26px;cursor:pointer}
.vp-actions{display:flex;justify-content:center;gap:22px;padding:16px}
.vp-actions button{border:0;background:none;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;border-radius:14px;padding:4px}
.vp-actions i{width:52px;height:52px;border-radius:50%;background:#e0e7ff;display:grid;place-items:center;font-size:24px;font-style:normal}
.vp-slider{display:flex;align-items:center;gap:10px;padding:18px 16px}
.vp-slider .tr{flex:1;height:6px;border-radius:3px;background:#d4d4d8;position:relative}
.vp-slider .tr i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:#2563eb}
.vp-slider button{width:44px;height:44px;border-radius:12px;border:0;background:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.vp-preview{margin:10px;padding:14px;border-radius:16px;background:#fff;line-height:1.5}
.vp-time{display:flex;align-items:center;justify-content:center;gap:14px;padding:30px 0;font-size:40px;font-weight:300}
.vp-time button{width:40px;height:40px;border-radius:50%;border:0;background:#e4e4e7;font-size:18px;cursor:pointer}
.vp-web{flex:1;background:#fff;padding:18px;line-height:1.6}
.vp-url{flex:none;margin:8px;padding:8px 12px;border-radius:18px;background:#f4f4f5;font-size:.9em;color:#3f3f46;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vp-link{color:#2563eb;text-decoration:underline;cursor:pointer;background:none;border:0;font:inherit;padding:0;word-break:break-all}
.vp-riskband{font-size:.85em;font-weight:800;color:#b91c1c;background:#fee2e2;border-radius:8px;padding:2px 6px;margin-bottom:4px;display:inline-block}
.vp-heads{position:absolute;left:8px;right:8px;top:30px;z-index:40;background:rgba(255,255,255,.97);border-radius:18px;padding:10px 12px;box-shadow:0 10px 26px rgba(0,0,0,.25);animation:vpdown .4s ease-out;cursor:pointer}
.vp-heads b{display:block;font-size:.8em;color:#71717a}
@keyframes vpdown{from{transform:translateY(-130%)}to{transform:none}}
.vp-ov{position:absolute;inset:0;z-index:50;display:flex;align-items:center;padding:14px;background:rgba(0,0,0,.55)}
.vp-pop{width:100%;background:#fff;border-radius:22px;border:4px solid;padding:16px;display:grid;gap:8px}
.vp-pop h4{margin:0;font-size:1.15em}
.vp-pop ul{margin:0;padding-left:18px}
.vp-pop button{min-height:44px;border-radius:14px;border:2px solid #d4d4d8;background:#fff;font:inherit;font-weight:800;cursor:pointer}
.vp-pop button.main{background:#2563eb;border-color:#2563eb;color:#fff}
.vp-full{position:absolute;inset:0;z-index:50;background:rgba(15,23,42,.97);color:#fff;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:22px}
.vp-full h4{margin:0;font-size:1.3em}
.vp-full button{min-height:46px;border-radius:14px;border:0;background:#facc15;font:inherit;font-weight:800;cursor:pointer;color:#18181b}
.vp-full button.sub{background:transparent;border:2px solid #64748b;color:#e2e8f0}
.vp-guide{position:absolute;left:8px;right:8px;bottom:46px;z-index:45;background:rgba(255,251,234,.96);border:3px solid #facc15;border-radius:18px;padding:8px 12px;box-shadow:0 8px 20px rgba(0,0,0,.2);font-size:14px;pointer-events:none}
.vp-guide.top{top:32px;bottom:auto}
.vp-guide small{color:#78716c;font-weight:700}
.vp-guide p{margin:2px 0 0;font-weight:800;font-size:15px;line-height:1.35}
.vp-guide .hint{margin-top:4px;color:#b45309;font-weight:700;font-size:12.5px}
.vp-target{outline:4px solid #facc15 !important;outline-offset:2px;border-radius:14px;animation:vppulse 1.1s ease-in-out infinite;position:relative;z-index:2}
@keyframes vppulse{0%,100%{box-shadow:0 0 0 0 rgba(250,204,21,.8)}50%{box-shadow:0 0 0 9px rgba(250,204,21,0)}}
.vp-toast{position:absolute;left:50%;bottom:54px;transform:translateX(-50%);z-index:60;background:rgba(24,24,27,.9);color:#fff;border-radius:16px;padding:6px 14px;font-size:12px;white-space:nowrap}
.vp-pad{padding:12px;display:grid;gap:10px;align-content:start}
.vp-card{background:#fff;border-radius:16px;padding:12px;display:grid;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.vp-card.DANGER{border:2px solid #b91c1c;background:#fef2f2}.vp-card.CAUTION{border:2px solid #b45309;background:#fffbeb}.vp-card.SAFE{border:2px solid #15803d;background:#f0fdf4}
.vp-field{width:100%;border:2px solid #d4d4d8;border-radius:12px;padding:8px 10px;font:inherit;background:#fff;color:#18181b;resize:none}
.vp-chips{display:flex;flex-wrap:wrap;gap:6px}
.vp-chip{min-height:38px;padding:0 10px;border-radius:19px;border:2px solid #d4d4d8;background:#fff;font:inherit;font-weight:700;cursor:pointer;color:#18181b}
.vp-menu{display:grid;gap:10px;padding:12px}
.vp-menu button{min-height:72px;border-radius:18px;border:0;background:#fff;font:inherit;cursor:pointer;display:flex;align-items:center;gap:12px;padding:10px 14px;text-align:left;box-shadow:0 1px 3px rgba(0,0,0,.08);color:#18181b}
.vp-menu i{font-style:normal;font-size:30px}
.vp-menu small{display:block;color:#71717a}
.vp-pill{display:inline-block;border-radius:10px;padding:0 7px;color:#fff;font-weight:800;font-size:.8em}
.vp-mini{min-height:34px;padding:0 10px;border-radius:10px;border:1px solid #d4d4d8;background:#fff;font:inherit;font-size:.85em;font-weight:700;cursor:pointer;color:#18181b}
.vp-mini.on{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
.vp-k-opt{min-height:58px;border-radius:12px;border:2px solid #e4e4e7;background:#fff;font:inherit;cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px;text-align:left;color:#18181b}
.vp-k-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.vp-k-grid .vp-k-opt{flex-direction:column;text-align:center;justify-content:center}
.vp-k-opt em{font-style:normal;font-size:26px}
.vp-k-opt small{display:block;color:#71717a;font-size:.8em}
.vp-keys{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.vp-keys button{min-height:46px;border-radius:10px;border:0;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.15);font:inherit;font-size:1.2em;font-weight:800;cursor:pointer;color:#18181b}
.vp-qrposter{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.vp-qrposter button{border:0;border-radius:12px;background:#fff;padding:8px 4px;font:inherit;font-size:.8em;font-weight:700;cursor:pointer;display:grid;gap:4px;justify-items:center;color:#18181b}
.vp-qrposter b{font-size:30px;line-height:1}
@media (prefers-reduced-motion:reduce){.vp-target,.vp-heads,.vp-flash{animation:none}}
`;

const ICON = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="5" width="14" height="14" rx="5"/></svg>',
  recent:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M7 6v12M12 6v12M17 6v12"/></svg>',
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
  private guide: PhoneGuide | null = null;
  private guideIndex = 0;
  private blockedHosts = new Set<string>();
  private apps: PhoneApp[];
  private drafts: Record<string, string> = {};

  constructor(
    root: HTMLElement,
    opts: {
      analyze: (text: string) => Analysis;
      onEvent?: (e: PhoneEvent) => void;
      apps?: PhoneApp[];
    },
  ) {
    this.root = root;
    this.analyze = opts.analyze;
    this.onEvent = opts.onEvent ?? (() => undefined);
    this.apps = opts.apps ?? [];
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

  /** 바깥에서 설치 앱의 자료가 바뀌었을 때 화면을 다시 그린다. */
  refresh() {
    this.render();
  }

  destroy() {
    this.root.removeEventListener('click', this.handleClick);
    this.root.removeEventListener('input', this.handleInput);
    if (this.headsTimer) clearTimeout(this.headsTimer);
    this.root.innerHTML = '';
  }

  // ---------- 바깥에서 쓰는 기능 ----------
  startGuide(guide: PhoneGuide) {
    this.guide = guide;
    this.guideIndex = 0;
    this.stack = [{ id: 'home' }];
    this.overlay = null;
    this.render();
  }

  stopGuide() {
    this.guide = null;
    this.render();
  }

  currentInstruction() {
    return this.guide?.steps[this.guideIndex]?.instruction ?? null;
  }

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

  private push(s: Screen) {
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
      startGuide: (guide) => {
        this.guide = guide;
        this.guideIndex = 0;
        this.overlay = null;
        this.stack = [{ id: 'home' }];
      },
      drafts: this.drafts,
    };
  }

  private handleClick = (e: Event) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || !this.root.contains(el)) return;
    const act = el.dataset.act!;
    const arg = el.dataset.arg ?? '';
    const gid = el.closest<HTMLElement>('[data-gid]')?.dataset.gid;
    const done = this.run(act, arg) !== false;
    // 안내 모드: 눌러야 할 곳을 누르면 다음 단계로
    if (
      done &&
      this.guide &&
      gid &&
      gid === this.guide.steps[this.guideIndex]?.target
    ) {
      this.guideIndex += 1;
      if (this.guideIndex >= this.guide.steps.length) {
        this.guide = null;
        this.onEvent({ type: 'guide-done' });
        this.toast('🎉 끝까지 해냈어요!');
      } else {
        this.onEvent({ type: 'guide-step', index: this.guideIndex });
      }
    }
    this.render();
  };

  /** 동작을 실행한다. 실패해서 안내 단계를 넘기면 안 되면 false를 돌려준다. */
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
      case 'install-anyway':
        this.overlay = null;
        return;
    }
  }

  // ---------- 그리기 ----------
  private g(gid: string) {
    return `data-gid="${gid}"`;
  }

  private bar(title: string) {
    return `<div class="vp-bar"><button data-act="back" aria-label="뒤로">${ICON.back}</button>${esc(title)}</div>`;
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
          `<button class="vp-app" data-act="open" data-arg="${a.id}" ${this.g(`home:${a.id}`)}><i style="background:${a.bg}">${a.icon}</i>${a.label}${badge(a.id)}</button>`;
        return {
          wall: true,
          dark: true,
          html: `<div class="vp-clockw"><b>10:30</b>10월 29일 목요일 · ☀️ 18°</div>
            <div class="vp-grid">${this.apps
              .map(
                (a) =>
                  `<button class="vp-app" data-act="open-ext" data-arg="${a.id}" ${this.g(`home:${a.id}`)}><i style="background:${a.bg}">${a.icon}</i>${esc(a.label)}</button>`,
              )
              .join('')}${APPS.slice(3).map(app).join('')}</div>
            <div class="vp-dock">${APPS.slice(0, 3).map(app).join('')}</div>`,
        };
      }
      case 'messenger':
        return {
          html: `${this.bar('채팅')}<div class="vp-list">${CONTACTS.slice(0, 2)
            .map((c) => {
              const last = this.chats[c.id]?.at(-1);
              const preview = last?.photo ? '사진' : (last?.text ?? '');
              return `<button class="vp-row" data-act="chat" data-arg="${c.id}" ${this.g(`messenger:${c.id}`)}><span class="ic">${c.icon}</span><span class="tx"><b>${c.name}</b><small>${esc(preview)}</small></span></button>`;
            })
            .join('')}
            ${Object.keys(this.chats)
              .filter((k) => !CONTACTS.some((c) => c.id === k))
              .map(
                (k) =>
                  `<button class="vp-row" data-act="chat" data-arg="${esc(k)}"><span class="ic">❔</span><span class="tx"><b>${esc(k)}</b><small>${esc(this.chats[k].at(-1)?.text ?? '')}</small></span></button>`,
              )
              .join('')}</div>`,
        };
      case 'chat': {
        const name = CONTACTS.find((c) => c.id === s.who)?.name ?? s.who;
        const lines = (this.chats[s.who] ?? [])
          .map(
            (l) =>
              `<div class="vp-msg ${l.me ? 'me' : ''}">${l.photo ? `<span class="ph">${l.photo}</span>` : esc(l.text ?? '')}</div>`,
          )
          .join('');
        return {
          html: `${this.bar(name)}<div class="vp-chat">${lines}</div>
            <div class="vp-input"><button class="plus" data-act="plus" data-arg="${s.who}" ${this.g('chat:plus')} aria-label="더하기">+</button><span class="fld">메시지 입력</span><button class="snd" data-act="send-text">전송</button></div>`,
        };
      }
      case 'attach':
        return {
          html: `${this.bar('보내기')}<div class="vp-chat"></div><div class="vp-sheet">
            <button data-act="album" data-arg="${s.who}" ${this.g('attach:album')}><i style="background:#dcfce7">🖼️</i>앨범</button>
            <button data-act="attach-cam" ${this.g('attach:camera')}><i style="background:#e0e7ff">📷</i>카메라</button>
            <button data-act="send-text"><i style="background:#fef3c7">📁</i>파일</button>
            <button data-act="send-text"><i style="background:#fce7f3">👤</i>연락처</button></div>`,
        };
      case 'album':
        return {
          html: `${this.bar('앨범에서 고르기')}<div class="vp-pics" style="flex:1;align-content:start">${this.photos
            .map(
              (p, i) =>
                `<button class="vp-pic ${this.picked.has(i) ? 'sel' : ''}" data-act="pick" data-arg="${i}" ${this.g(`album:photo-${i}`)} aria-label="사진 ${i + 1}">${p}</button>`,
            )
            .join(
              '',
            )}</div><div class="vp-foot"><button class="vp-btn yel" data-act="send-photos" ${this.g('album:send')}>전송 ${this.picked.size || ''}</button></div>`,
        };
      case 'sms':
        return {
          html: `${this.bar('문자')}<div class="vp-list">${[
            ...new Set(this.sms.map((l) => l.from)),
          ]
            .reverse()
            .map((from) => {
              const last = [...this.sms]
                .reverse()
                .find((l) => l.from === from)!;
              return `<button class="vp-row" data-act="sms-thread" data-arg="${esc(from)}"><span class="ic">${last.risk?.riskLevel === 'DANGER' ? '⚠️' : '👤'}</span><span class="tx"><b>${esc(from)}</b><small>${esc(last.text)}</small></span></button>`;
            })
            .join('')}</div>`,
        };
      case 'sms-thread': {
        const lines = this.sms
          .filter((l) => l.from === s.from)
          .map((l) => {
            const body = esc(l.text).replace(
              LINK_RE,
              (m) =>
                `<button class="vp-link" data-act="link" data-arg="${m}">${m}</button>`,
            );
            const band =
              l.risk && l.risk.riskLevel !== 'SAFE'
                ? `<span class="vp-riskband">🛡️ 안심 지킴이: ${l.risk.riskLevel === 'DANGER' ? '사기 의심' : '주의'} ${l.risk.score}점</span><br>`
                : '';
            return `<div class="vp-msg">${band}${body}</div>`;
          })
          .join('');
        return {
          html: `${this.bar(s.from)}<div class="vp-chat" style="background:#f4f4f5">${lines}</div>`,
        };
      }
      case 'camera':
        return {
          dark: true,
          html: `<div class="vp-camv">🌳${this.flash ? '<span class="vp-flash"></span>' : ''}</div><div class="vp-camc">
            <button class="vp-thumb" data-act="go" data-arg="gallery" aria-label="사진첩">${this.photos[0] ?? ''}</button>
            <button class="vp-shut" data-act="shutter" ${this.g('camera:shutter')} aria-label="찍기"></button>
            <button class="vp-flip" data-act="send-text" aria-label="화면 전환">🔄</button></div>`,
        };
      case 'gallery':
        return {
          html: `${this.bar('사진첩')}<div class="vp-pics">${this.photos
            .map(
              (p, i) =>
                `<button class="vp-pic" data-act="photo" data-arg="${i}" aria-label="사진 ${i + 1}">${p}</button>`,
            )
            .join('')}</div>`,
        };
      case 'photo':
        return {
          dark: true,
          html: `<div class="vp-camv" style="background:#000">${this.photos[s.index] ?? ''}</div>`,
        };
      case 'settings':
        return {
          html: `${this.bar('설정')}<div class="vp-list">
            <button class="vp-row" data-act="go" data-arg="connections" ${this.g('settings:connections')}><span class="ic">📶</span><span class="tx"><b>연결</b><small>Wi-Fi · 블루투스</small></span></button>
            <button class="vp-row" data-act="send-text"><span class="ic">🔔</span><span class="tx"><b>소리 및 진동</b></span></button>
            <button class="vp-row" data-act="go" data-arg="display" ${this.g('settings:display')}><span class="ic">🔆</span><span class="tx"><b>디스플레이</b><small>밝기 · 글자 크기</small></span></button>
            <button class="vp-row" data-act="send-text"><span class="ic">🔋</span><span class="tx"><b>배터리</b></span></button></div>`,
        };
      case 'connections':
        return {
          html: `${this.bar('연결')}<div class="vp-list">
            <button class="vp-row" data-act="go" data-arg="wifi" ${this.g('connections:wifi')}><span class="ic">📶</span><span class="tx"><b>Wi-Fi</b><small>${this.wifiConnected ? '우리집_WiFi 연결됨' : this.wifiOn ? '켜짐' : '꺼짐'}</small></span></button>
            <button class="vp-row" data-act="send-text"><span class="ic">🔵</span><span class="tx"><b>블루투스</b></span></button>
            <button class="vp-row" data-act="send-text"><span class="ic">✈️</span><span class="tx"><b>비행기 탑승 모드</b></span></button></div>`,
        };
      case 'wifi':
        return {
          html: `${this.bar('Wi-Fi')}<div class="vp-list"><button class="vp-row" data-act="wifi-toggle" ${this.g('wifi:toggle')}><span class="tx"><b>${this.wifiOn ? '켜짐' : '꺼짐'}</b></span><span class="vp-sw ${this.wifiOn ? 'on' : ''}"></span></button></div>
            ${
              this.wifiOn
                ? `<div class="vp-list">${[
                    [
                      'home',
                      '우리집_WiFi',
                      this.wifiConnected ? '연결됨' : '저장되지 않음',
                    ],
                    ['cafe', 'Cafe_Free', '열린 네트워크'],
                    ['other', 'iptime_5G', '보안'],
                  ]
                    .map(
                      ([id, name, sub]) =>
                        `<button class="vp-row" data-act="wifi-net" data-arg="${id}" ${this.g(`wifi:${id}`)}><span class="ic">📶</span><span class="tx"><b>${name}</b><small>${sub}</small></span></button>`,
                    )
                    .join('')}</div>`
                : ''
            }`,
        };
      case 'wifi-pw':
        return {
          html: `${this.bar('우리집_WiFi')}<div class="vp-preview">비밀번호<br><b style="letter-spacing:4px">●●●●●●●●</b><br><small style="color:#71717a">공유기 뒷면의 비밀번호를 넣었어요 (연습)</small></div>
            <div class="vp-foot"><button class="vp-btn" data-act="wifi-connect" ${this.g('wifipw:connect')}>연결</button></div>`,
        };
      case 'display':
        return {
          html: `${this.bar('디스플레이')}<div class="vp-list">
            <button class="vp-row" data-act="send-text"><span class="ic">☀️</span><span class="tx"><b>밝기</b></span></button>
            <button class="vp-row" data-act="go" data-arg="font" ${this.g('display:font')}><span class="ic">🔠</span><span class="tx"><b>글자 크기와 스타일</b></span></button>
            <button class="vp-row" data-act="send-text"><span class="ic">🌙</span><span class="tx"><b>어두운 화면</b></span></button></div>`,
        };
      case 'font':
        return {
          html: `${this.bar('글자 크기')}<div class="vp-preview">가나다라마바사<br>안녕하세요. 글자 크기를 바꾸면 휴대폰 글자가 모두 바뀌어요.</div>
            <div class="vp-slider"><button data-act="font" data-arg="-" ${this.g('font:minus')}>가-</button><span class="tr"><i style="width:${((this.fontScale - 0.85) / 0.65) * 100}%"></i></span><button data-act="font" data-arg="+" ${this.g('font:plus')}>가+</button></div>`,
        };
      case 'contacts':
        return {
          html: `${this.bar('연락처')}<div class="vp-list">${CONTACTS.map(
            (c) =>
              `<button class="vp-row" data-act="contact" data-arg="${c.id}" ${this.g(`contacts:${c.id}`)}><span class="ic">${c.icon}</span><span class="tx"><b>${c.name}</b><small>${c.phone}</small></span></button>`,
          ).join('')}</div>`,
        };
      case 'contact': {
        const c = CONTACTS.find((x) => x.id === s.who)!;
        return {
          html: `${this.bar(c.name)}<div style="text-align:center;padding:24px 0"><div style="font-size:64px">${c.icon}</div><b style="font-size:1.4em">${c.name}</b><div style="color:#71717a">${c.phone}</div></div>
            <div class="vp-actions"><button data-act="call" data-arg="${c.id}:voice" ${this.g('contact:voice')}><i>📞</i>음성통화</button><button data-act="call" data-arg="${c.id}:video" ${this.g('contact:video')}><i>📹</i>영상통화</button><button data-act="send-text"><i>✉️</i>문자</button></div>`,
        };
      }
      case 'call': {
        const c = CONTACTS.find((x) => x.id === s.who)!;
        return {
          dark: true,
          html: `<div class="vp-callscr"><div style="text-align:center"><div class="av">${c.icon}</div><b style="font-size:1.4em;display:block;margin-top:10px">${c.name}</b>${s.video ? '영상통화 거는 중…' : '전화 거는 중…'}</div><button class="vp-hang" data-act="hang" ${this.g('call:hang')} aria-label="끊기">✕</button></div>`,
        };
      }
      case 'clock':
        return {
          html: `${this.bar('알람')}<div class="vp-list">${this.alarms
            .map(
              (a, i) =>
                `<button class="vp-row" data-act="alarm-toggle" data-arg="${i}"><span class="tx"><b style="font-size:1.6em;font-weight:400">${a.h < 12 ? '오전' : '오후'} ${a.h % 12 || 12}:${String(a.m).padStart(2, '0')}</b></span><span class="vp-sw ${a.on ? 'on' : ''}"></span></button>`,
            )
            .join(
              '',
            )}</div><div class="vp-foot" style="justify-content:center;background:none"><button class="vp-btn" data-act="alarm-add" ${this.g('clock:add')}>+ 알람 추가</button></div>`,
        };
      case 'alarm-edit':
        return {
          html: `${this.bar('알람 추가')}<div class="vp-time"><button data-act="hour" data-arg="-" aria-label="한 시간 앞">▲</button>${this.draftHour < 12 ? '오전' : '오후'} ${this.draftHour % 12 || 12}:00<button data-act="hour" data-arg="+" aria-label="한 시간 뒤">▼</button></div>
            <div class="vp-foot" style="gap:8px;background:none"><button class="vp-btn" style="background:#a1a1aa" data-act="back">취소</button><button class="vp-btn" data-act="alarm-save" ${this.g('alarm:save')}>저장</button></div>`,
        };
      case 'browser':
        return {
          html: `<div class="vp-url">🔒 ${esc(s.host)}</div><div class="vp-web"><b>${esc(s.host)}</b><p>연습용 인터넷 화면이에요. 실제 사이트는 열리지 않아요.</p></div>`,
        };
      case 'ext': {
        const app = this.apps.find((a) => a.id === s.app);
        if (!app) return { html: '' };
        return app.render(s.view, s.data, this.appContext(s.app));
      }
      case 'installer':
        return {
          html: `${this.bar('앱 설치')}<div class="vp-preview">📦 <b>보안인증.apk</b><br>이 앱을 설치하시겠습니까?</div><div class="vp-foot"><button class="vp-btn">설치</button></div>`,
        };
    }
  }

  private overlayHtml() {
    const ov = this.overlay;
    if (!ov) return '';
    if (ov.kind === 'warn') {
      const t = RISK_TEXT[ov.result.riskLevel];
      return `<div class="vp-ov" role="alertdialog" aria-label="${t.title}"><div class="vp-pop" style="border-color:${t.color}">
        <h4 style="color:${t.color}">${t.icon} ${t.title}</h4><b>위험 점수 ${ov.result.score}점</b>
        <ul>${ov.result.reasons
          .slice(0, 3)
          .map((r) => `<li>${esc(r)}</li>`)
          .join('')}</ul>
        <span style="font-size:.9em">링크를 누르지 말고, 돈·인증번호를 요구하면 가족에게 먼저 물어보세요.</span>
        <button data-act="ov-view">문자 보기</button><button class="main" data-act="ov-close">알겠어요</button></div></div>`;
    }
    if (ov.kind === 'blocked') {
      return `<div class="vp-full" role="alertdialog" aria-label="위험한 사이트를 막았어요"><h4>🛡️ 위험한 사이트를 막았어요</h4><p>사기 문자에 있던 사이트예요. 열지 않고 막았어요. 이름·비밀번호·계좌번호를 넣지 마세요.</p><button data-act="ov-close">알겠어요</button></div>`;
    }
    return `<div class="vp-full" role="alertdialog" aria-label="앱 설치를 멈췄어요"><h4>잠깐만요! 앱을 설치하려고 해요</h4><p>조금 전 사기 의심 문자를 받았어요. 문자 안내로 설치하는 앱은 휴대폰 속 돈과 정보를 빼갈 수 있어요. 가족에게 먼저 물어보세요.</p><button data-act="install-cancel">설치하지 않을래요</button><button class="sub" data-act="install-anyway">제가 원해서 설치해요</button></div>`;
  }

  private render() {
    const s = this.top;
    const { html, dark, wall } = this.screenHtml(s);
    const status = `<div class="vp-status"><span>10:30</span><span>${this.wifiConnected ? '📶 Wi-Fi ' : '📶 LTE '}🔋 82%</span></div>`;
    const heads = this.heads
      ? `<div class="vp-heads" data-act="heads" role="status"><b>${this.heads.app === 'sms' ? '✉️ 문자' : '💬 메신저'} · ${esc(this.heads.from)}</b>${esc(this.heads.text.length > 70 ? `${this.heads.text.slice(0, 70)}…` : this.heads.text)}</div>`
      : '';
    const step = this.guide?.steps[this.guideIndex];
    this.root.innerHTML = `<div class="vp ${dark ? 'vp-dark' : ''}" aria-label="연습용 가상 휴대폰"><div class="vp-scr ${wall ? 'vp-wall' : ''} ${dark && !wall ? 'vp-dark' : ''}" style="--vp-font:${this.fontScale};${dark && !wall ? 'background:#000;color:#fff' : ''}">
      <span class="vp-cam-hole"></span>${status}<div class="vp-body">${html}</div>
      <div class="vp-nav" style="${wall ? 'background:transparent' : dark ? 'background:#000' : 'background:#f2f3f7'}"><button data-act="recent" aria-label="최근 앱">${ICON.recent}</button><button data-act="home" aria-label="홈">${ICON.home}</button><button data-act="back" aria-label="뒤로">${ICON.back}</button></div>
      ${heads}${this.overlayHtml()}
      ${step && !this.overlay ? `<div class="vp-guide" role="status"><small>안내 ${this.guideIndex + 1} / ${this.guide!.steps.length}</small><p>${esc(step.instruction)}</p><div class="hint" data-hint></div></div>` : ''}
      ${this.toastText ? `<div class="vp-toast" role="status">${esc(this.toastText)}</div>` : ''}
    </div></div>`;
    if (step && !this.overlay) {
      const target = this.root.querySelector<HTMLElement>(
        `[data-gid="${step.target}"]`,
      );
      if (target) {
        target.classList.add('vp-target');
        // 눌러야 할 곳이 화면 아래쪽이면 안내 상자를 위로 옮겨 가리지 않게 한다.
        const card = this.root.querySelector<HTMLElement>('.vp-guide');
        const screen = this.root.querySelector<HTMLElement>('.vp-scr');
        if (card && screen) {
          const s = screen.getBoundingClientRect();
          const t = target.getBoundingClientRect();
          if (t.top + t.height / 2 > s.top + s.height * 0.5)
            card.classList.add('top');
        }
      }
      const hint = this.root.querySelector<HTMLElement>('[data-hint]');
      if (hint && !target)
        hint.textContent =
          '지금 화면에는 없어요. 아래 ◁ 뒤로 또는 ▢ 홈 버튼을 눌러 보세요.';
    }
  }
}
