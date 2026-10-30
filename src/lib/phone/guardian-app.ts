// 가상 휴대폰에 설치되는 '안심 지킴이' 앱. 시뮬레이션(simulation.html)과 실제 앱(/)이 함께 쓴다.
// 로그인·가입, 검사 기록, QR 검사, 붙여 넣은 문자 검사, 보호자·연락처, 로그아웃을 모두 휴대폰 안에서 한다.
// 저장은 store가 맡는다: 실제 앱은 서버(Server Action), 시뮬레이션은 페이지 안 메모리.
// 주요 기능: ① 실시간 문자 감지·차단(검사 기록) ② QR 감지 ③ 붙여 넣은 문자의 AI 판단
import {
  escapeHtml as esc,
  PHONE_ICONS as I,
  phoneBar,
  type Analysis,
  type PhoneApp,
  type PhoneAppContext,
} from './engine';
import { DEMO_QR_CODES } from '../../app/(app)/check/samples';
import { demoQrSvg } from '../scan/demo-qr';
import {
  authSchema,
  contactSchema,
  signUpSchema,
  type AiExplanation,
} from '../validation';

/** 검사 기록이 들어온 곳(서버의 source 값과 같다) */
export type ScanSource = 'SMS' | 'KAKAO' | 'OTHER' | 'QR';
export type Verdict = 'SCAM' | 'SAFE';

/** 저장된 검사 기록 */
export type StoredScan = {
  id: string;
  source: ScanSource;
  content: string;
  result: Analysis;
  verdict: Verdict | null;
  /** 붙여 넣은 문자에 붙인 Claude 설명 */
  ai?: AiExplanation | null;
};

/** Claude 설명 요청 결과 */
export type ExplainResult =
  { ok: true; explanation: AiExplanation } | { ok: false; message: string };

export type GuardianContact = {
  id: string;
  name: string;
  phone: string;
  relation: string | null;
  isGuardian: boolean;
};

/** 로그인·가입·연락처 저장처럼 입력 칸별 안내가 있을 수 있는 결과 */
export type FormResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** 로그인 결과: 성공하면 로그인한 이메일, 가입 확인 메일이 필요하면 email 없이 안내만 */
export type AuthResult =
  | { ok: true; email: string | null; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** 안심 지킴이가 기록을 저장하는 곳 */
export type GuardianStore = {
  /** 이미 로그인해 있으면 그 이메일 */
  session(): Promise<string | null>;
  signIn(input: { email: string; password: string }): Promise<AuthResult>;
  signUp(input: {
    email: string;
    password: string;
    passwordConfirm: string;
  }): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** 내 검사 기록(최신순) */
  listScans(): Promise<StoredScan[]>;
  /** 검사 결과를 저장하고 기록 id를 돌려준다(저장하지 못하면 null) */
  saveScan(input: {
    source: ScanSource;
    content: string;
  }): Promise<string | null>;
  /** 붙여 넣은 문자를 외부 AI에게도 물어 저장한다(없거나 실패하면 null → 기존 판정을 쓴다) */
  aiScan?(
    content: string,
  ): Promise<{ id: string | null; result: Analysis } | null>;
  setVerdict(id: string, verdict: Verdict | null): Promise<boolean>;
  deleteScan(id: string): Promise<boolean>;
  /** 내 검사 기록을 모두 지운다 */
  deleteAllScans(): Promise<boolean>;
  /** 붙여 넣은 문자 기록에 Claude 설명을 받는다(없으면 설명 없이 학습 AI 결과만) */
  explainScan?(id: string): Promise<ExplainResult>;
  listContacts(): Promise<GuardianContact[]>;
  addContact(input: {
    name: string;
    phone: string;
    relation?: string;
    isGuardian: boolean;
  }): Promise<FormResult>;
  deleteContact(id: string): Promise<boolean>;
};

type Rec = {
  /** 화면에서 쓰는 이름표(저장 전후로 바뀌지 않는다) */
  key: string;
  /** 저장된 기록 id */
  serverId: string | null;
  /** 저장 중이면 그 결과 */
  saving: Promise<string | null> | null;
  source: ScanSource;
  text: string;
  result: Analysis;
  verdict: Verdict | null;
  /** QR 판독이 위험이라 그 주소를 막았는지 */
  blocked?: boolean;
  /** Claude 설명: 받는 중 · 받음 · 실패(안내 문구) */
  ai?:
    | { state: 'loading' }
    | { state: 'done'; explanation: AiExplanation }
    | { state: 'failed'; message: string };
};

const SOURCE_LABEL: Record<ScanSource, string> = {
  SMS: '문자',
  KAKAO: '메신저',
  OTHER: '붙여 넣기',
  QR: 'QR 코드',
};

/** 01012345678 → 010-1234-5678 */
function phoneText(digits: string) {
  if (/^02\d{7,8}$/.test(digits))
    return digits.replace(/^(02)(\d{3,4})(\d{4})$/, '$1-$2-$3');
  return digits.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
}

/** 휴대폰 안 로그인·연락처 입력 화면 모양 */
const FORM_STYLE = `<style>
.gl{box-sizing:border-box;width:100%;padding:10px 16px 16px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;align-content:start}
.gl-brand{display:grid;justify-items:center;gap:4px;text-align:center;margin:2px 0}
.gl-brand i{width:52px;height:52px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(160deg,#3b82f6,#1e40af);color:#fff;box-shadow:0 8px 20px rgba(29,78,216,.3)}
.gl-brand i svg{width:30px;height:30px}
.gl-brand b{font-size:1.35em}
.gl-brand span{color:#52525b;font-size:.92em}
.gl-tabs{display:grid;grid-template-columns:1fr 1fr;background:#e7e9ee;border-radius:14px;padding:4px}
.gl-tabs button{min-height:42px;border:0;border-radius:11px;background:none;font:inherit;font-weight:800;color:#52525b;cursor:pointer}
.gl-tabs button[aria-selected=true]{background:#fff;color:#1d4ed8;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.gl label{display:grid;gap:5px;font-weight:700;min-width:0}
.gl label small{font-weight:400;color:#6b7280}
.gl-in{display:flex;align-items:center;gap:6px;min-width:0;min-height:48px;border:2px solid #d4d4d8;border-radius:14px;padding:0 10px;background:#fff}
.gl-in:focus-within{border-color:#1d4ed8}
.gl-in.bad{border-color:#dc2626}
.gl-in svg{width:22px;height:22px;flex:none;color:#71717a}
.gl-in input{flex:1;min-width:0;width:100%;border:0;outline:0;font:inherit;background:none;color:#111;min-height:44px}
.gl-eye{border:0;background:none;color:#1d4ed8;font:inherit;font-weight:800;cursor:pointer;min-height:40px;white-space:nowrap}
.gl-err{color:#b91c1c;font-size:.85em;font-weight:700;margin:0}
.gl-st{border-radius:12px;padding:9px 11px;font-size:.9em;margin:0;background:#fef2f2;color:#991b1b}
.gl-st.ok{background:#f0fdf4;color:#166534}
.gl-st button{border:0;background:none;padding:0;font:inherit;font-weight:800;color:#1d4ed8;text-decoration:underline;cursor:pointer}
.gl-submit{min-height:50px;border:0;border-radius:16px;background:#1d4ed8;color:#fff;font:inherit;font-weight:800;font-size:1.05em;cursor:pointer}
.gl-submit:disabled{opacity:.6}
.gl-note{font-size:.82em;color:#6b7280;text-align:center;margin:0}
.gl-toggle{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:50px;border:2px solid #d4d4d8;border-radius:14px;padding:0 12px;background:#fff;font:inherit;font-weight:700;cursor:pointer;color:#111}
.gl-toggle em{font-style:normal;width:44px;height:26px;border-radius:13px;background:#d4d4d8;position:relative;flex:none}
.gl-toggle em::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s}
.gl-toggle[aria-pressed=true] em{background:#1d4ed8}
.gl-toggle[aria-pressed=true] em::after{left:21px}
.gl-acct{display:flex;align-items:center;gap:8px;margin:10px 14px 0;color:#fff;font-size:.88em}
.gl-acct span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.9}
.gl-acct button{border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.12);color:#fff;border-radius:999px;font:inherit;font-weight:700;padding:5px 12px;cursor:pointer;flex:none}
.gl-ct{display:flex;gap:10px;align-items:center}
.gl-ct .tx{flex:1;min-width:0;display:grid;gap:2px}
.gl-ct small{color:#6b7280}
.gl-ct a{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#16a34a;color:#fff}
.gl-ct a svg{width:22px;height:22px}
.gl-tag{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:#dbeafe;color:#1e40af;font-size:.75em;font-weight:800;vertical-align:1px}
</style>`;

/** QR 안의 주소에서 사이트 이름(도메인)만 꺼낸다. 주소가 아니면 그대로. */
function siteOf(raw: string) {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `http://${raw}`)
      .hostname;
  } catch {
    return raw;
  }
}
/** 안전할 때만 열 수 있는 인터넷 주소인지 */
const isWebLink = (raw: string) => /^https?:\/\//i.test(raw);

const COLOR: Record<string, string> = {
  DANGER: '#dc2626',
  CAUTION: '#d97706',
  SAFE: '#16a34a',
};
const LABEL: Record<string, string> = {
  DANGER: '위험',
  CAUTION: '주의',
  SAFE: '안전',
};

/** 결과 창 문구(실제 앱 QR 감지와 같음) */
const QR_TEXT: Record<string, { title: string; advice: string }> = {
  DANGER: {
    title: '위험한 QR 코드예요',
    advice: '이 주소를 열지 마세요. QR을 붙인 곳에 전화로 먼저 확인하세요.',
  },
  CAUTION: {
    title: '조심해야 할 QR 코드예요',
    advice: '믿을 수 있는 곳에서 붙인 QR인지 확인한 뒤에만 여세요.',
  },
  SAFE: {
    title: '안전해 보이는 QR 코드예요',
    advice: '그래도 돈을 내거나 개인정보를 넣으라고 하면 멈추고 물어보세요.',
  },
};
const CHIP: Record<string, string> = {
  DANGER: '⛔ 위험한 QR',
  CAUTION: '⚠️ 조심할 QR',
  SAFE: '✓ 안전한 QR',
};
const GLYPH: Record<string, string> = {
  DANGER:
    '<path d="M12 6.5v7" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.7" fill="#fff"/>',
  CAUTION:
    '<path d="M12 6.5v7" stroke="#1c1917" stroke-width="2.8" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.7" fill="#1c1917"/>',
  SAFE: '<path d="m6.5 12.5 3.6 3.6 7.4-8" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
};
const RISK_TONE: Record<
  string,
  { solid: string; ink: string; tint: string; word: string; tag: string }
> = {
  DANGER: {
    solid: '#dc2626',
    ink: '#fff',
    tint: '#fef2f2',
    word: '#b91c1c',
    tag: 'background:#fee2e2;color:#991b1b',
  },
  CAUTION: {
    solid: '#f97316',
    ink: '#1c1917',
    tint: '#fffbeb',
    word: '#92400e',
    tag: 'background:#fef3c7;color:#92400e',
  },
  SAFE: {
    solid: '#22c55e',
    ink: '#052e16',
    tint: '#f0fdf4',
    word: '#15803d',
    tag: 'background:#dcfce7;color:#166534',
  },
};

/**
 * QR 찍기 연출. 휴대폰 화면은 버튼을 누를 때만 다시 그려지므로, 비추기(0~1.6초) → 인식(1.6초) → 판독(2.4초) → 결과 창(3초)을
 * CSS 시간차로 한 화면 안에서 보여 준다. 판독 결과는 화면을 그리기 전에 이미 계산해 기록에 넣어 둔다.
 * 판독할 때 모서리 틀은 QR 그림(130px)에 앞뒤 4px 여백을 두고 맞춰 조여진다(138px). 위치(아래로 21px)는
 * 안내판(.gq-board)의 위쪽 글자 높이(17px+21px+4px)만큼 그림이 안내판 가운데보다 아래에 있어서 생긴 값이다.
 */
const QR_STYLE = `<style>
.gq-vf{position:relative;height:200px;flex:none;background:radial-gradient(80% 60% at 50% 45%,#57534e 0%,#292524 55%,#0c0a09 100%);display:grid;place-items:center;overflow:hidden;color:#fff}
.gq-vf.live{flex:1;height:auto;min-height:420px}
.gq-hint,.gq-cap{position:absolute;top:12px;left:50%;transform:translateX(-50%);font-size:13px;background:rgba(0,0,0,.45);padding:5px 12px;border-radius:999px;white-space:nowrap}
.gq-cap{animation:gq-out .25s 1.6s both}
.gq-float{animation:gq-float 3.6s ease-in-out .5s infinite}
.gq-board{width:150px;box-sizing:border-box;background:#fff;color:#18181b;border-radius:12px;padding:10px;text-align:center;box-shadow:0 16px 36px rgba(0,0,0,.5);animation:gq-in .5s cubic-bezier(.2,.8,.2,1) both}
.gq-board p{margin:0;font-size:12px;line-height:17px;color:#71717a}
.gq-board b{display:block;font-size:14px;line-height:21px;margin-bottom:4px}
.gq-board svg{display:block;width:130px;height:130px}
.gq-br{position:absolute;left:50%;top:50%;width:150px;height:150px;transform:translate(-50%,-50%)}
.gq-vf.live .gq-br{width:190px;height:240px;animation:gq-lock .38s cubic-bezier(.2,.8,.2,1) 1.6s both}
.gq-br i{position:absolute;width:28px;height:28px;border:4px solid rgba(255,255,255,.75)}
.gq-vf.live .gq-br i{animation:gq-yellow .2s 1.6s both}
.gq-br i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0;border-radius:9px 0 0 0}
.gq-br i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0;border-radius:0 9px 0 0}
.gq-br i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0;border-radius:0 0 0 9px}
.gq-br i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0;border-radius:0 0 9px 0}
.gq-chip{position:absolute;left:50%;bottom:14px;max-width:88%;box-sizing:border-box;display:flex;gap:8px;align-items:center;padding:9px 14px;border-radius:999px;font-size:13px;white-space:nowrap;background:#facc15;color:#1c1917;animation:gq-chip .3s cubic-bezier(.2,.8,.2,1) 1.6s both,gq-risk .35s ease 2.4s both}
.gq-chip .lb{display:grid;flex:none}
.gq-chip .lb b{grid-area:1/1}
.gq-chip .a{animation:gq-out .2s 2.4s both}
.gq-chip .b{animation:gq-show .2s 2.4s both}
.gq-chip .u{min-width:0;overflow:hidden;text-overflow:ellipsis}
.gq-cover{position:absolute;inset:0;z-index:5;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;padding:10px;animation:gq-show .3s 3s both}
.gq-sheet{width:100%;max-height:92%;overflow:auto;background:#fff;color:#18181b;border-radius:24px;padding-bottom:14px;animation:gq-up .35s cubic-bezier(.2,.8,.2,1) 3s both}
.gq-hero{display:grid;justify-items:center;gap:4px;text-align:center;padding:22px 16px 16px;border-radius:24px 24px 0 0}
.gq-ico{width:56px;height:56px;border-radius:50%;display:grid;place-items:center}
.gq-ico svg{width:30px;height:30px}
.gq-hero small{margin-top:6px;font-weight:800;letter-spacing:.08em}
.gq-hero b{font-size:1.25em}
.gq-hero span{font-size:.92em;color:#3f3f46;max-width:28ch}
.gq-sec{margin:12px 14px 6px;font-size:.8em;font-weight:700;color:#52525b;display:flex;justify-content:space-between;gap:8px}
.gq-block{margin:12px 14px 0;display:grid;gap:2px;border:2px solid;border-radius:14px;padding:10px 12px}
.gq-block b{font-size:1.02em}
.gq-block span{font-size:.82em;font-weight:700;word-break:break-all;opacity:.85}
.gq-block .gq-tags{margin:6px 0 0;padding-top:8px;border-top:1px solid currentColor}
.gq-block .gq-tags span{opacity:1}
.gq-open{position:absolute;left:50%;bottom:62px;transform:translateX(-50%);border:0;border-radius:999px;background:#fff;color:#1d4ed8;font:inherit;font-size:13px;font-weight:800;padding:8px 16px;cursor:pointer;animation:gq-show .25s .9s both}
.gq-msg{margin:0 14px;background:#f4f4f5;border-radius:6px 16px 16px 16px;padding:10px 12px;font-size:.88em;word-break:break-all}
.gq-tags{margin:0 14px;display:flex;flex-wrap:wrap;gap:6px}
.gq-tags span{padding:4px 10px;border-radius:999px;font-size:.82em;font-weight:700}
.gq-acts{display:grid;gap:4px;margin:14px 14px 0}
.gq-acts button{min-height:46px;border-radius:14px;border:0;font:inherit;font-weight:800;cursor:pointer}
.gq-list{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gq-list button{border:0;border-radius:16px;background:#fff;padding:10px;font:inherit;text-align:left;cursor:pointer;display:grid;gap:2px;box-shadow:inset 0 0 0 1px #e4e4e7;color:#18181b}
.gq-list small{color:#71717a;font-size:.75em}
@keyframes gq-in{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
@keyframes gq-float{50%{transform:translateY(-4px)}}
@keyframes gq-lock{to{width:138px;height:138px;transform:translate(-50%,calc(-50% + 21px))}}
@keyframes gq-yellow{to{border-color:#facc15;width:20px;height:20px}}
@keyframes gq-chip{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes gq-risk{to{background:var(--risk);color:var(--risk-ink)}}
@keyframes gq-out{to{opacity:0}}
@keyframes gq-show{from{opacity:0;visibility:hidden}to{opacity:1;visibility:visible}}
@keyframes gq-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
.gq-vf.cam{background:#000}
.gq-vf.cam::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent calc(33.33% - .5px),rgba(255,255,255,.22) calc(33.33% - .5px),rgba(255,255,255,.22) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.22) calc(66.66% - .5px),rgba(255,255,255,.22) calc(66.66% + .5px),transparent calc(66.66% + .5px)),linear-gradient(transparent calc(33.33% - .5px),rgba(255,255,255,.22) calc(33.33% - .5px),rgba(255,255,255,.22) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.22) calc(66.66% - .5px),rgba(255,255,255,.22) calc(66.66% + .5px),transparent calc(66.66% + .5px))}
.gq-vf.cam{flex:1;height:auto;min-height:0}
.gq-vf.cam .gq-br{width:190px;height:240px}
.gq-vf.now .gq-board{animation:none!important}
.gq-vf.now .gq-float{animation-play-state:paused}
.gq-vf.now .gq-br{animation-delay:0s}
.gq-vf.now .gq-br i{animation-delay:0s}
.gq-vf.now .gq-cap{animation-delay:0s}
.gq-vf.now .gq-chip{animation-delay:.1s,.8s}
.gq-vf.now .gq-chip .a,.gq-vf.now .gq-chip .b{animation-delay:.8s}
@media (prefers-reduced-motion:reduce){.gq-float{animation:none}.gq-board,.gq-chip,.gq-vf.live .gq-br,.gq-vf.live .gq-br i,.gq-cap,.gq-cover,.gq-sheet,.gq-chip .a,.gq-chip .b{animation-duration:.01s!important}}
</style>`;

export function createGuardianApp(opts: {
  analyzeMessage: (
    text: string,
    personal: { content: string; verdict: 'scam' | 'safe' }[],
  ) => Analysis;
  analyzeQr: (text: string) => Analysis;
  store: GuardianStore;
}) {
  const { store } = opts;
  let records: Rec[] = [];
  let contacts: GuardianContact[] = [];
  let nextKey = 1;
  /** 로그인 상태: 처음 앱을 열 때 한 번 확인한다 */
  let phase: 'unknown' | 'checking' | 'ready' = 'unknown';
  let email: string | null = null;
  const auth = {
    mode: 'signIn' as 'signIn' | 'signUp',
    show: false,
    busy: false,
    failed: false,
    errors: {} as Record<string, string>,
    status: null as { ok: boolean; text: string } | null,
  };
  /** 붙여 넣은 문자를 AI가 판단하는 중 */
  let aiBusy = false;
  /** 감지 기록 [모두 지우기]를 눌러 확인을 묻는 중 */
  let clearAsk = false;
  const cform = {
    busy: false,
    errors: {} as Record<string, string>,
    status: null as string | null,
  };

  const personal = () =>
    records
      .filter((r) => r.verdict)
      .map((r) => ({
        content: r.text,
        verdict: r.verdict === 'SCAM' ? ('scam' as const) : ('safe' as const),
      }));

  const find = (key: string) => records.find((r) => r.key === key);

  /** 로그인해 있으면 저장한다. 저장한 id는 나중에 정답 알려 주기·지우기에 쓴다. */
  function persist(r: Rec) {
    if (!email || r.serverId || r.saving) return;
    r.saving = store
      .saveScan({ source: r.source, content: r.text })
      .catch(() => null)
      .then((id) => {
        r.serverId = id;
        r.saving = null;
        return id;
      });
  }

  async function serverIdOf(r: Rec) {
    return r.serverId ?? (r.saving ? await r.saving : null);
  }

  /** serverId를 주면 이미 서버에 저장된 기록이라 다시 저장하지 않는다. */
  function add(
    source: ScanSource,
    text: string,
    result: Analysis,
    serverId: string | null = null,
  ) {
    const r: Rec = {
      key: `r${nextKey++}`,
      serverId,
      saving: null,
      source,
      text,
      result,
      verdict: null,
    };
    records.unshift(r);
    if (!serverId) persist(r);
    return r;
  }

  const fromStored = (s: StoredScan): Rec => ({
    key: `r${nextKey++}`,
    serverId: s.id,
    saving: null,
    source: s.source,
    text: s.content,
    result: s.result,
    verdict: s.verdict,
    ...(s.ai ? { ai: { state: 'done' as const, explanation: s.ai } } : {}),
  });

  /** 붙여 넣은 문자를 저장한 뒤 Claude 설명을 받아 결과 화면에 붙인다. 실패해도 학습 AI 결과는 그대로 둔다. */
  async function explain(ctx: PhoneAppContext, r: Rec) {
    if (!store.explainScan || !email) return;
    // 받는 중이거나 이미 받은 설명은 다시 부르지 않는다.
    if (r.ai?.state === 'loading' || r.ai?.state === 'done') return;
    r.ai = { state: 'loading' };
    const id = await serverIdOf(r);
    const res = id
      ? await store
          .explainScan(id)
          .catch(() => ({ ok: false as const, message: '' }))
      : { ok: false as const, message: '' };
    r.ai = res.ok
      ? { state: 'done', explanation: res.explanation }
      : {
          state: 'failed',
          message:
            res.message ||
            'AI 설명을 받지 못했어요. 위 판단 결과는 그대로 믿으셔도 돼요.',
        };
    ctx.refresh();
  }

  function aiBox(r: Rec) {
    if (!r.ai) return '';
    if (r.ai.state === 'loading')
      return `<div class="vp-card" role="status" style="background:#eff6ff;color:#1e3a8a">🤖 AI가 이유와 대처 방법을 정리하는 중이에요…</div>`;
    if (r.ai.state === 'failed')
      return `<div class="vp-card" role="alert" style="background:#f4f4f5;color:#3f3f46;font-size:.9em">${esc(r.ai.message)}</div>`;
    const e = r.ai.explanation;
    const list = (items: string[]) =>
      `<ul style="margin:0;padding-left:16px;font-size:.9em">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `<div class="vp-card" style="background:#eff6ff;color:#1e3a8a"><b>🤖 AI 설명 · ${esc(e.summary)}</b><span style="font-size:.85em;font-weight:700">왜 그렇게 봤나요?</span>${list(e.reasons)}<span style="font-size:.85em;font-weight:700">지금 이렇게 하세요</span>${list(e.actions)}</div>`;
  }

  /** 로그인한 뒤: 로그인 전에 받은 문자 기록을 저장하고, 내 기록·연락처를 불러온다. */
  async function loadMine() {
    const unsaved = records.filter((r) => !r.serverId);
    for (const r of unsaved.reverse()) {
      persist(r);
      await r.saving;
    }
    const [scans, list] = await Promise.all([
      store.listScans().catch(() => null),
      store.listContacts().catch(() => null),
    ]);
    if (scans) {
      const blocked = new Set(
        records.filter((r) => r.blocked).map((r) => r.serverId),
      );
      records = scans.map((s) => ({
        ...fromStored(s),
        blocked: blocked.has(s.id),
      }));
    }
    if (list) contacts = list;
  }

  function resetAuthForm(ctx: PhoneAppContext, mode: 'signIn' | 'signUp') {
    auth.mode = mode;
    auth.show = false;
    auth.failed = false;
    auth.errors = {};
    auth.status = null;
    ctx.drafts['gl-pw'] = '';
    ctx.drafts['gl-pw2'] = '';
  }

  function card(r: Rec, full: boolean) {
    return `<div class="vp-card ${r.result.riskLevel}">
      <span><span class="vp-pill" style="background:${COLOR[r.result.riskLevel]}">${LABEL[r.result.riskLevel]} · 위험도 ${r.result.score}%</span> <small style="color:#6b7280">${esc(SOURCE_LABEL[r.source])}</small>${r.blocked ? ' <small style="color:#b91c1c;font-weight:800">🔒 링크 차단</small>' : ''}</span>
      <span style="word-break:break-all">${esc(r.text.length > 80 && !full ? `${r.text.slice(0, 80)}…` : r.text)}</span>
      <ul style="margin:0;padding-left:16px;font-size:.9em">${r.result.reasons
        .slice(0, full ? 5 : 2)
        .map((x) => `<li>${esc(x)}</li>`)
        .join('')}</ul>
      <span style="font-size:.85em;font-weight:700">실제로 사기였나요?</span>
      <span class="vp-chips"><button class="vp-mini ${r.verdict === 'SCAM' ? 'on' : ''}" data-act="x:guardian:verdict" data-arg="${r.key}:SCAM">사기 맞아요</button><button class="vp-mini ${r.verdict === 'SAFE' ? 'on' : ''}" data-act="x:guardian:verdict" data-arg="${r.key}:SAFE">아니에요</button><button class="vp-mini" data-act="x:guardian:del" data-arg="${r.key}">지우기</button></span>${!full && store.explainScan && r.source !== 'QR' && r.result.riskLevel !== 'SAFE' ? `<button class="vp-mini" style="justify-self:start" data-act="x:guardian:ai" data-arg="${r.key}">🤖 AI 설명 보기</button>` : ''}</div>`;
  }

  /** 아이콘이 든 입력칸 */
  function field(
    ctx: PhoneAppContext,
    o: {
      model: string;
      err: string;
      label: string;
      hint?: string;
      icon: string;
      type: string;
      attrs: string;
      enter?: string;
      trailing?: string;
    },
  ) {
    const err = auth.errors[o.err] ?? cform.errors[o.err];
    return `<label><span>${o.label}${o.hint ? ` <small>${o.hint}</small>` : ''}</span>
      <span class="gl-in ${err ? 'bad' : ''}">${o.icon}<input type="${o.type}" data-model="${o.model}" value="${esc(ctx.drafts[o.model] ?? '')}" ${o.attrs} ${o.enter ? `data-enter="${o.enter}"` : ''} ${err ? 'aria-invalid="true"' : ''}>${o.trailing ?? ''}</span>
      ${err ? `<p class="gl-err" role="alert">${esc(err)}</p>` : ''}</label>`;
  }

  /** 앱을 열었는데 로그인하지 않았을 때의 로그인·가입 화면 */
  function loginView(ctx: PhoneAppContext) {
    const up = auth.mode === 'signUp';
    const t = auth.show ? 'text' : 'password';
    const submit = 'x:guardian:auth';
    return `${FORM_STYLE}${phoneBar(up ? '가입하기' : '로그인')}<div class="gl">
      <div class="gl-brand"><i>${I.shield}</i><b>안심 지킴이</b><span>문자·QR 사기를 먼저 막아 드려요</span></div>
      <div class="gl-tabs" role="tablist" aria-label="로그인 또는 가입"><button role="tab" aria-selected="${!up}" data-act="x:guardian:mode" data-arg="signIn">로그인</button><button role="tab" aria-selected="${up}" data-act="x:guardian:mode" data-arg="signUp">가입하기</button></div>
      ${field(ctx, { model: 'gl-email', err: 'email', label: '이메일', icon: I.mail, type: 'email', attrs: 'inputmode="email" autocomplete="email" placeholder="예: hong@naver.com"', enter: submit })}
      ${field(ctx, { model: 'gl-pw', err: 'password', label: '비밀번호', hint: '(8자 이상)', icon: I.lock, type: t, attrs: `autocomplete="${up ? 'new-password' : 'current-password'}"`, enter: submit, trailing: `<button type="button" class="gl-eye" data-act="x:guardian:eye" aria-pressed="${auth.show}">${auth.show ? '숨기기' : '보기'}</button>` })}
      ${up ? field(ctx, { model: 'gl-pw2', err: 'passwordConfirm', label: '비밀번호 한 번 더', icon: I.lock, type: t, attrs: 'autocomplete="new-password"', enter: submit }) : ''}
      ${auth.status ? `<p class="gl-st ${auth.status.ok ? 'ok' : ''}" role="alert">${esc(auth.status.text)}${!up && auth.failed ? ' 처음 오셨다면 <button data-act="x:guardian:mode" data-arg="signUp">가입하기</button>를 눌러 주세요.' : ''}</p>` : ''}
      <button class="gl-submit" data-act="${submit}" ${auth.busy ? 'disabled' : ''}>${auth.busy ? (up ? '가입하는 중…' : '로그인하는 중…') : up ? '가입하고 시작하기' : '로그인'}</button>
      <p class="gl-note">🔒 내 검사 기록과 연락처는 나만 볼 수 있어요</p>
    </div>`;
  }

  /** 입력값 검사 실패를 칸별 안내로 */
  function issues(error: {
    issues: { path: PropertyKey[]; message: string }[];
  }) {
    const out: Record<string, string> = {};
    for (const i of error.issues)
      out[String(i.path[0] ?? 'form')] ??= i.message;
    return out;
  }

  /**
   * QR 찍기 화면(비추기 → 인식 → 판독). withSheet이면 3초 뒤 결과 창까지 띄우고(앱 안 QR 검사),
   * 아니면 아래 주소 표시의 색으로만 알린다(휴대폰 카메라 앱).
   * camera이면 검은 화면+격자 모양이고, 셔터를 누른 순간 바로 인식·판독한다.
   */
  function qrScanView(r: Rec, idx: number, withSheet: boolean, camera = false) {
    const q = DEMO_QR_CODES[idx];
    const lv = r.result.riskLevel;
    const t = RISK_TONE[lv];
    const sheet = withSheet
      ? `<div class="gq-cover"><div class="gq-sheet" role="alertdialog" aria-label="${QR_TEXT[lv].title}">
          <div class="gq-hero" style="background:${t.tint}"><span class="gq-ico" style="background:${t.solid}"><svg viewBox="0 0 24 24" aria-hidden="true">${GLYPH[lv]}</svg></span>
            <small style="color:${t.word}">${LABEL[lv]} · 위험도 ${r.result.score}%</small><b>${QR_TEXT[lv].title}</b><span>${QR_TEXT[lv].advice}</span></div>
          ${lv !== 'SAFE' ? `<div class="gq-block" style="background:${t.tint};border-color:${t.solid};color:${t.word}"><b>${lv === 'DANGER' ? '🔒 링크 접속을 차단했어요' : '⚠️ 바로 열지 않았어요'}</b><span>${esc(siteOf(q.content))}</span>${r.result.reasons.length ? `<div class="gq-tags">${r.result.reasons.map((x) => `<span style="${t.tag}">${esc(x)}</span>`).join('')}</div>` : ''}</div>` : ''}
          <div class="gq-sec"><span>찍은 QR 내용</span><span>${esc(q.place)}</span></div><div class="gq-msg">${esc(q.content)}</div>
          ${lv === 'SAFE' && r.result.reasons.length ? `<div class="gq-sec"><span>왜 그런가요?</span></div><div class="gq-tags">${r.result.reasons.map((x) => `<span style="${t.tag}">${esc(x)}</span>`).join('')}</div>` : ''}
          <div class="gq-acts"><button style="background:#18181b;color:#fff" data-act="back">확인했어요</button>${lv === 'SAFE' && isWebLink(q.content) ? `<button style="background:none;color:#1d4ed8" data-act="qr-open" data-arg="${esc(q.content)}">이 주소 열기</button>` : ''}${lv === 'CAUTION' && isWebLink(q.content) ? `<button style="background:none;color:#6b7280;text-decoration:underline;min-height:36px" data-act="qr-ask" data-arg="${esc(q.content)}">그래도 열기</button>` : ''}<button style="background:none;color:#1d4ed8" data-act="x:guardian:go" data-arg="guard">기록 보기</button></div>
        </div></div>`
      : '';
    // 카메라에서 위험·주의는 경고 팝업이 알리므로 주소 표시는 색을 바꾸지 않는다(정상만 초록).
    const quiet = camera && lv !== 'SAFE';
    const chipColor = quiet
      ? '--risk:#facc15;--risk-ink:#1c1917'
      : `--risk:${t.solid};--risk-ink:${t.ink}`;
    const chipLabel = quiet
      ? 'QR 인식됨'
      : `${CHIP[lv]} · 위험도 ${r.result.score}%`;
    return `${QR_STYLE}<div class="gq-vf live${camera ? ' cam now' : ''}" style="${chipColor}">
        <span class="gq-cap">QR 코드를 화면 가운데에 비추세요</span>
        <div class="gq-float"><div class="gq-board"><p>${esc(q.place)}</p><b>${esc(q.title)}</b>${demoQrSvg(q.content)}</div></div>
        <span class="gq-br" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span class="gq-chip" role="status"><span class="lb"><b class="a">판독 중…</b><b class="b">${chipLabel}</b></span><span class="u">${esc(q.content)}</span></span>
        ${camera && lv === 'SAFE' && isWebLink(q.content) ? `<button class="gq-open" data-act="qr-open" data-arg="${esc(q.content)}">이 주소 열기</button>` : ''}
        ${sheet}
      </div>`;
  }

  const menu = (
    view: string,
    color: string,
    icon: string,
    title: string,
    sub: string,
  ) =>
    `<button data-act="x:guardian:go" data-arg="${view}"><i style="background:${color}">${icon}</i><span><b>${title}</b><small>${sub}</small></span><span style="color:#c4c7cf;flex:none">${I.chevron}</span></button>`;

  function screen(
    view: string,
    data: string,
    ctx: PhoneAppContext,
  ): { html: string; dark?: boolean } {
    if (view === 'main') {
      const danger = records.filter(
        (r) => r.result.riskLevel === 'DANGER',
      ).length;
      return {
        html: `${FORM_STYLE}<div style="background:linear-gradient(160deg,#2563eb,#1e3a8a);padding-bottom:18px;border-radius:0 0 28px 28px">
              <div class="vp-appbar"><button data-act="back" aria-label="뒤로" style="border:0;background:none;color:#fff;cursor:pointer;padding:0;width:32px;height:32px;display:grid;place-items:center">←</button>${I.shield}<b>안심 지킴이</b></div>
              <div style="margin:0 14px;padding:14px;border-radius:22px;background:rgba(255,255,255,.14);color:#fff;display:grid;gap:4px">
                <span style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:1.05em"><span style="width:10px;height:10px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 4px rgba(74,222,128,.3)"></span>실시간 감지 켜짐</span>
                <span style="opacity:.9">문자·카톡이 오는 순간 검사하고 위험하면 막아요</span>
                <span style="display:flex;gap:16px;margin-top:6px"><span><b style="font-size:1.5em">${records.length}</b> 검사</span><span><b style="font-size:1.5em;color:#fca5a5">${danger}</b> 위험 막음</span></span>
              </div>
              <div class="gl-acct">${I.user}<span>${esc(email ?? '')}</span><button data-act="x:guardian:logout">로그아웃</button></div></div>
            <div class="vp-sub">스미싱 차단</div>
            <div class="vp-menu" style="padding-top:0">
              ${menu('guard', '#2563eb', I.shield, '실시간 감지 기록', '받은 문자 검사 결과 · 정답 알려 주기')}
              ${menu('qr', '#0ea5e9', I.camera, 'QR 검사', '찍기 전에 위험한 주소인지 확인')}
              ${menu('paste', '#f59e0b', I.mail, '붙여 넣어 검사', '복사한 문자를 AI가 판단')}
            </div>
            <div class="vp-sub">가족 지키기</div>
            <div class="vp-menu" style="padding-top:0">
              ${menu('contacts', '#16a34a', I.user, '보호자·연락처', `${contacts.length}명 · 위험할 때 바로 전화`)}
            </div>`,
      };
    }
    if (view === 'guard')
      return {
        html: `${phoneBar('실시간 감지 기록')}<div class="vp-pad"><span style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b>검사 기록 ${records.length}건</b>${records.length && !clearAsk ? '<button class="vp-mini" data-act="x:guardian:clear-ask">모두 지우기</button>' : ''}</span>${
          clearAsk && records.length
            ? `<div class="vp-card" role="alertdialog" style="background:#fef2f2;color:#7f1d1d"><b>기록 ${records.length}건을 모두 지울까요?</b><span style="font-size:.88em">지운 기록과 알려 주신 정답은 되돌릴 수 없어요.</span><span class="vp-chips"><button class="vp-mini" style="background:#b91c1c;color:#fff" data-act="x:guardian:clear">모두 지우기</button><button class="vp-mini" data-act="x:guardian:clear-cancel">취소</button></span></div>`
            : ''
        }${
          records.length
            ? records.map((r) => card(r, false)).join('')
            : '<span style="color:#6b7280">아직 기록이 없어요. 휴대폰 위의 [문자 받기]로 문자를 받아 보세요.</span>'
        }</div>`,
      };
    if (view === 'paste')
      return {
        html: `${phoneBar('붙여 넣어 검사')}<div class="vp-pad"><div class="vp-card"><b>받은 문자를 붙여 넣으세요</b><span style="font-size:.88em;color:#6b7280">메시지 앱에서 문자를 눌러 [복사]한 뒤, 아래 [붙여넣기]를 누르면 AI가 스미싱인지 판단해요.</span><textarea class="vp-field" rows="4" data-model="paste" placeholder="예: [OO은행] 계좌가 정지되었습니다 확인 bit.ly/xx">${esc(ctx.drafts.paste ?? '')}</textarea><span style="display:flex;gap:8px"><button class="vp-btn" style="flex:1;background:#eef0f4;color:#111318" data-act="x:guardian:paste-clip">📋 붙여넣기</button><button class="vp-btn" style="flex:1" data-act="x:guardian:check" ${aiBusy ? 'disabled' : ''}>${aiBusy ? 'AI가 판단하는 중…' : 'AI로 검사하기'}</button></span></div></div>`,
      };
    if (view === 'result') {
      const r = find(data);
      return {
        html: `${phoneBar('검사 결과')}<div class="vp-pad">${r ? `${card(r, true)}${aiBox(r)}` : '지운 기록이에요.'}</div>`,
      };
    }
    if (view === 'qr')
      return {
        html: `${QR_STYLE}${phoneBar('QR 검사')}<div class="gq-vf"><span class="gq-br"><i></i><i></i><i></i><i></i></span><span class="gq-hint">아래 체험용 QR 중 하나를 골라 찍어 보세요</span></div>
            <div class="vp-pad"><div class="gq-list">${DEMO_QR_CODES.map((q, i) => `<button data-act="x:guardian:qr" data-arg="${i}"><small>${esc(q.place)}</small><b>${esc(q.title)}</b></button>`).join('')}</div>
            <span style="font-size:.85em;color:#6b7280">QR 안의 주소는 열지 않고 먼저 검사해요.</span></div>`,
      };
    if (view === 'qrscan') {
      const [key, idx] = data.split(':');
      const r = find(key);
      const q = DEMO_QR_CODES[Number(idx)];
      if (!r || !q)
        return {
          html: `${phoneBar('QR 검사')}<div class="vp-pad">지운 기록이에요.</div>`,
        };
      return {
        html: `${phoneBar('QR 검사')}${qrScanView(r, Number(idx), true)}`,
      };
    }
    if (view === 'contacts')
      return {
        html: `${FORM_STYLE}${phoneBar('보호자·연락처')}<div class="vp-pad">
          <span style="font-size:.9em;color:#52525b">위험한 문자를 받으면 여기 있는 가족에게 바로 전화해 물어보세요.</span>
          ${
            contacts.length
              ? contacts
                  .map(
                    (c) =>
                      `<div class="vp-card"><div class="gl-ct"><span class="tx"><b>${esc(c.name)}${c.isGuardian ? '<span class="gl-tag">보호자</span>' : ''}</b><small>${c.relation ? `${esc(c.relation)} · ` : ''}${esc(phoneText(c.phone))}</small></span><a href="tel:${esc(c.phone)}" aria-label="${esc(c.name)}에게 전화">${I.phone}</a></div><span class="vp-chips"><button class="vp-mini" data-act="x:guardian:cdel" data-arg="${esc(c.id)}">지우기</button></span></div>`,
                  )
                  .join('')
              : '<span style="color:#6b7280">아직 등록한 연락처가 없어요.</span>'
          }
          <button class="vp-btn" data-act="x:guardian:go" data-arg="contact-new">＋ 연락처 추가</button></div>`,
      };
    if (view === 'contact-new') {
      const guard = ctx.drafts['gc-guard'] === '1';
      const submit = 'x:guardian:cadd';
      return {
        html: `${FORM_STYLE}${phoneBar('연락처 추가')}<div class="gl">
          ${field(ctx, { model: 'gc-name', err: 'name', label: '이름', icon: I.user, type: 'text', attrs: 'autocomplete="name" placeholder="예: 김영희"', enter: submit })}
          ${field(ctx, { model: 'gc-phone', err: 'phone', label: '전화번호', icon: I.phone, type: 'tel', attrs: 'inputmode="tel" autocomplete="tel" placeholder="예: 010-1234-5678"', enter: submit })}
          ${field(ctx, { model: 'gc-rel', err: 'relation', label: '관계', hint: '(선택)', icon: I.user, type: 'text', attrs: 'placeholder="예: 딸, 아들, 복지사"', enter: submit })}
          <button type="button" class="gl-toggle" data-act="x:guardian:cguard" aria-pressed="${guard}">위험할 때 알릴 보호자예요<em></em></button>
          ${cform.status ? `<p class="gl-st" role="alert">${esc(cform.status)}</p>` : ''}
          <button class="gl-submit" data-act="${submit}" ${cform.busy ? 'disabled' : ''}>${cform.busy ? '저장하는 중…' : '저장하기'}</button>
        </div>`,
      };
    }
    return { html: phoneBar('안심 지킴이') };
  }

  const app: PhoneApp = {
    id: 'guardian',
    label: '안심 지킴이',
    icon: I.shield,
    bg: 'linear-gradient(160deg,#3b82f6,#1e40af)',
    render(view, data, ctx) {
      if (phase !== 'ready') {
        if (phase === 'unknown') {
          phase = 'checking';
          store
            .session()
            .catch(() => null)
            .then(async (e) => {
              email = e;
              if (e) await loadMine();
            })
            .finally(() => {
              phase = 'ready';
              ctx.refresh();
            });
        }
        return {
          html: `${phoneBar('안심 지킴이')}<div class="vp-pad" style="justify-items:center;padding-top:40px;color:#6b7280">불러오는 중…</div>`,
        };
      }
      // 어느 화면이든 로그인하지 않았으면 로그인 화면을 먼저 보여 주고, 로그인하면 그 화면으로 이어진다.
      if (!email) return { html: loginView(ctx) };
      return screen(view, data, ctx);
    },
    handle(action, arg, ctx) {
      switch (action) {
        case 'go':
          if (arg === 'contact-new') {
            cform.errors = {};
            cform.status = null;
          }
          return ctx.push(arg);
        case 'mode':
          return resetAuthForm(ctx, arg === 'signUp' ? 'signUp' : 'signIn');
        case 'eye':
          auth.show = !auth.show;
          return;
        case 'auth': {
          if (auth.busy) return;
          const up = auth.mode === 'signUp';
          const values = {
            email: (ctx.drafts['gl-email'] ?? '').trim(),
            password: ctx.drafts['gl-pw'] ?? '',
            passwordConfirm: ctx.drafts['gl-pw2'] ?? '',
          };
          const parsed = up
            ? signUpSchema.safeParse(values)
            : authSchema.safeParse({
                email: values.email,
                password: values.password,
              });
          auth.failed = false;
          if (!parsed.success) {
            auth.errors = issues(parsed.error);
            auth.status = { ok: false, text: '입력한 내용을 확인해 주세요.' };
            return;
          }
          auth.errors = {};
          auth.status = null;
          auth.busy = true;
          (up
            ? store.signUp(values)
            : store.signIn({ email: values.email, password: values.password })
          )
            .catch((): AuthResult => ({
              ok: false,
              message: '연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
            }))
            .then(async (res) => {
              auth.busy = false;
              if (!res.ok) {
                auth.errors = res.fieldErrors ?? {};
                auth.status = { ok: false, text: res.message };
                auth.failed = !up && !res.fieldErrors;
                ctx.drafts['gl-pw'] = '';
                return;
              }
              if (!res.email) {
                auth.status = { ok: true, text: res.message ?? '' };
                return;
              }
              email = res.email;
              resetAuthForm(ctx, 'signIn');
              await loadMine();
              ctx.toast(up ? '가입했어요. 환영해요!' : '로그인했어요');
            })
            .finally(() => ctx.refresh());
          return;
        }
        case 'logout':
          store
            .signOut()
            .catch(() => undefined)
            .finally(() => {
              email = null;
              records = [];
              contacts = [];
              resetAuthForm(ctx, 'signIn');
              ctx.toast('로그아웃했어요');
              ctx.refresh();
            });
          return;
        case 'paste-clip':
          if (!ctx.clipboard)
            return ctx.toast('먼저 메시지 앱에서 문자를 눌러 복사해 주세요');
          ctx.drafts.paste = ctx.clipboard;
          return;
        case 'check': {
          const text = (ctx.drafts.paste ?? '').trim();
          if (aiBusy) return;
          if (text.length < 2) return ctx.toast('검사할 문자를 넣어 주세요');
          const local = () =>
            add('OTHER', text, opts.analyzeMessage(text, personal()));
          if (!email || !store.aiScan) {
            ctx.drafts.paste = '';
            return ctx.push('result', local().key);
          }
          // 외부 AI에게도 묻는다. 답이 없으면 기존 판정(규칙 + 학습 AI)으로 보여 준다.
          aiBusy = true;
          store
            .aiScan(text)
            .catch(() => null)
            .then((ai) => {
              const r = ai ? add('OTHER', text, ai.result, ai.id) : local();
              ctx.drafts.paste = '';
              ctx.push('result', r.key);
            })
            .finally(() => {
              aiBusy = false;
              ctx.refresh();
            });
          return;
        }
        case 'ai': {
          // 실시간 감지 기록: 팝업은 학습 AI로 바로 띄우고, Claude 설명은 원할 때 받아 결과 화면에 붙인다.
          const r = find(arg);
          if (!r) return;
          void explain(ctx, r);
          return ctx.push('result', r.key);
        }
        case 'verdict': {
          const [key, v] = arg.split(':');
          const r = find(key);
          if (!r) return;
          r.verdict = r.verdict === v ? null : (v as Verdict);
          const verdict = r.verdict;
          void serverIdOf(r).then((id) =>
            id ? store.setVerdict(id, verdict).catch(() => false) : false,
          );
          return ctx.toast('알려 주셔서 고마워요. 다음 검사부터 반영할게요');
        }
        case 'del': {
          const r = find(arg);
          if (!r) return;
          records = records.filter((x) => x !== r);
          void serverIdOf(r).then((id) =>
            id ? store.deleteScan(id).catch(() => false) : false,
          );
          return ctx.toast('기록을 지웠어요');
        }
        case 'clear-ask':
          clearAsk = true;
          return;
        case 'clear-cancel':
          clearAsk = false;
          return;
        case 'clear': {
          clearAsk = false;
          const removed = records;
          records = [];
          // 저장 중인 기록까지 끝난 뒤 지운다. 실패하면 서버 기록을 다시 불러와 보여 준다.
          void Promise.all(removed.map(serverIdOf))
            .then(() => store.deleteAllScans())
            .catch(() => false)
            .then(async (ok) => {
              if (ok) return;
              ctx.toast('기록을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요');
              const scans = await store.listScans().catch(() => null);
              if (scans) records = scans.map(fromStored);
              ctx.refresh();
            });
          return ctx.toast('기록을 모두 지웠어요');
        }
        case 'qr': {
          const q = DEMO_QR_CODES[Number(arg)];
          if (!q) return;
          const r = add('QR', q.content, opts.analyzeQr(q.content));
          if (r.result.riskLevel === 'DANGER') {
            r.blocked = true;
            ctx.blockLink(q.content);
          }
          return ctx.push('qrscan', `${r.key}:${arg}`);
        }
        case 'cguard':
          ctx.drafts['gc-guard'] = ctx.drafts['gc-guard'] === '1' ? '' : '1';
          return;
        case 'cadd': {
          if (cform.busy) return;
          const input = {
            name: ctx.drafts['gc-name'] ?? '',
            phone: ctx.drafts['gc-phone'] ?? '',
            relation: (ctx.drafts['gc-rel'] ?? '').trim() || undefined,
            isGuardian: ctx.drafts['gc-guard'] === '1',
          };
          const parsed = contactSchema.safeParse(input);
          if (!parsed.success) {
            cform.errors = issues(parsed.error);
            cform.status = '입력한 내용을 확인해 주세요.';
            return;
          }
          cform.errors = {};
          cform.status = null;
          cform.busy = true;
          store
            .addContact(input)
            .catch((): FormResult => ({
              ok: false,
              message: '저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
            }))
            .then(async (res) => {
              cform.busy = false;
              if (!res.ok) {
                cform.errors = res.fieldErrors ?? {};
                cform.status = res.message;
                return;
              }
              for (const k of ['gc-name', 'gc-phone', 'gc-rel', 'gc-guard'])
                ctx.drafts[k] = '';
              contacts = (await store.listContacts().catch(() => null)) ?? [
                ...contacts,
              ];
              ctx.back();
              ctx.toast('연락처를 저장했어요');
            })
            .finally(() => ctx.refresh());
          return;
        }
        case 'cdel': {
          const before = contacts;
          contacts = contacts.filter((c) => c.id !== arg);
          store
            .deleteContact(arg)
            .catch(() => false)
            .then((ok) => {
              if (ok) return ctx.toast('연락처를 지웠어요');
              contacts = before;
              ctx.toast('지우지 못했어요. 다시 시도해 주세요');
            })
            .finally(() => ctx.refresh());
          return;
        }
      }
    },
  };

  return {
    app,
    /** 휴대폰 카메라에 무작위로 비출 수 있는 체험용 QR 수 */
    qrCount: DEMO_QR_CODES.length,
    /** 휴대폰 위 [QR 코드 받기] 고르기 목록 */
    qrLabels: DEMO_QR_CODES.map((q) => `${q.place} · ${q.title}`),
    /** 카메라에 QR이 비춰진 화면(아직 판독 전, 검은 화면+격자) */
    qrPreview(index: number) {
      const q = DEMO_QR_CODES[index];
      if (!q) return '';
      return `${QR_STYLE}<div class="gq-vf cam">
        <span class="gq-hint">셔터를 누르면 QR을 판독해요</span>
        <div class="gq-float"><div class="gq-board"><p>${esc(q.place)}</p><b>${esc(q.title)}</b>${demoQrSvg(q.content)}</div></div>
        <span class="gq-br" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      </div>`;
    },
    /** 셔터를 누르면 판독해 기록에 넣고, 판독 화면과 결과(위험·주의면 휴대폰이 경고 팝업을 띄운다)를 돌려준다. */
    scanQr(index: number) {
      const q = DEMO_QR_CODES[index];
      if (!q) return null;
      const r = add('QR', q.content, opts.analyzeQr(q.content));
      // 주소를 막는 일은 카메라(엔진)가 맡는다. 기록에는 막았다고 남긴다.
      if (r.result.riskLevel === 'DANGER') r.blocked = true;
      return {
        html: qrScanView(r, index, false, true),
        result: r.result,
        content: q.content,
        place: q.place,
      };
    },
    /** 휴대폰에 문자가 도착했을 때 실시간 감지 기록에 넣는다(로그인해 있으면 저장). */
    record(app: 'sms' | 'messenger', text: string, result: Analysis) {
      add(app === 'sms' ? 'SMS' : 'KAKAO', text, result);
    },
    personal,
  };
}
