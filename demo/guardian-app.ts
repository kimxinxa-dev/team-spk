// 시뮬레이션용: 가상 휴대폰에 설치되는 '안심 지킴이' 앱.
// 실제 앱의 채점 AI를 그대로 쓰고, 기록은 이 페이지 안에만 둔다.
// 주요 기능: ① 실시간 문자 감지·차단(검사 기록) ② QR 감지 ③ 붙여 넣은 문자의 AI 판단
import {
  escapeHtml as esc,
  PHONE_ICONS as I,
  phoneBar,
  type Analysis,
  type PhoneApp,
} from '../src/lib/phone/engine';
import { DEMO_QR_CODES } from '../src/app/(app)/check/samples';
import { demoQrSvg } from '../src/lib/scan/demo-qr';

type Rec = {
  id: number;
  source: string;
  text: string;
  result: Analysis;
  verdict: 'SCAM' | 'SAFE' | null;
};

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
 * 틀이 QR 그림에 맞게 조여지는 크기·위치(152px, 아래로 21px)는 안내판(.gq-board)의 글자 높이·그림 크기에서 나온 값이다.
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
@keyframes gq-lock{to{width:152px;height:152px;transform:translate(-50%,calc(-50% + 21px))}}
@keyframes gq-yellow{to{border-color:#facc15}}
@keyframes gq-chip{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes gq-risk{to{background:var(--risk);color:var(--risk-ink)}}
@keyframes gq-out{to{opacity:0}}
@keyframes gq-show{from{opacity:0;visibility:hidden}to{opacity:1;visibility:visible}}
@keyframes gq-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
.gq-vf.cam{background:#000}
.gq-vf.cam::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent calc(33.33% - .5px),rgba(255,255,255,.22) calc(33.33% - .5px),rgba(255,255,255,.22) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.22) calc(66.66% - .5px),rgba(255,255,255,.22) calc(66.66% + .5px),transparent calc(66.66% + .5px)),linear-gradient(transparent calc(33.33% - .5px),rgba(255,255,255,.22) calc(33.33% - .5px),rgba(255,255,255,.22) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.22) calc(66.66% - .5px),rgba(255,255,255,.22) calc(66.66% + .5px),transparent calc(66.66% + .5px))}
.gq-vf.cam{flex:1;height:auto}
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
}) {
  const records: Rec[] = [];
  let nextId = 1;

  const personal = () =>
    records
      .filter((r) => r.verdict)
      .map((r) => ({
        content: r.text,
        verdict: r.verdict === 'SCAM' ? ('scam' as const) : ('safe' as const),
      }));

  function add(source: string, text: string, result: Analysis) {
    records.unshift({ id: nextId++, source, text, result, verdict: null });
    return records[0];
  }

  function card(r: Rec, full: boolean) {
    return `<div class="vp-card ${r.result.riskLevel}">
      <span><span class="vp-pill" style="background:${COLOR[r.result.riskLevel]}">${LABEL[r.result.riskLevel]} · 위험도 ${r.result.score}%</span> <small style="color:#6b7280">${esc(r.source)}</small></span>
      <span style="word-break:break-all">${esc(r.text.length > 80 && !full ? `${r.text.slice(0, 80)}…` : r.text)}</span>
      <ul style="margin:0;padding-left:16px;font-size:.9em">${r.result.reasons
        .slice(0, full ? 5 : 2)
        .map((x) => `<li>${esc(x)}</li>`)
        .join('')}</ul>
      <span style="font-size:.85em;font-weight:700">실제로 사기였나요?</span>
      <span class="vp-chips"><button class="vp-mini ${r.verdict === 'SCAM' ? 'on' : ''}" data-act="x:guardian:verdict" data-arg="${r.id}:SCAM">사기 맞아요</button><button class="vp-mini ${r.verdict === 'SAFE' ? 'on' : ''}" data-act="x:guardian:verdict" data-arg="${r.id}:SAFE">아니에요</button><button class="vp-mini" data-act="x:guardian:del" data-arg="${r.id}">지우기</button></span></div>`;
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
          <div class="gq-sec"><span>찍은 QR 내용</span><span>${esc(q.place)}</span></div><div class="gq-msg">${esc(q.content)}</div>
          ${r.result.reasons.length ? `<div class="gq-sec"><span>왜 그런가요?</span></div><div class="gq-tags">${r.result.reasons.map((x) => `<span style="${t.tag}">${esc(x)}</span>`).join('')}</div>` : ''}
          <div class="gq-acts"><button style="background:#18181b;color:#fff" data-act="back">확인했어요</button><button style="background:none;color:#1d4ed8" data-act="x:guardian:go" data-arg="guard">기록 보기</button></div>
        </div></div>`
      : '';
    return `${QR_STYLE}<div class="gq-vf live${camera ? ' cam now' : ''}" style="--risk:${t.solid};--risk-ink:${t.ink}">
        <span class="gq-cap">QR 코드를 화면 가운데에 비추세요</span>
        <div class="gq-float"><div class="gq-board"><p>${esc(q.place)}</p><b>${esc(q.title)}</b>${demoQrSvg(q.content)}</div></div>
        <span class="gq-br" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span class="gq-chip" role="status"><span class="lb"><b class="a">판독 중…</b><b class="b">${CHIP[lv]} · 위험도 ${r.result.score}%</b></span><span class="u">${esc(q.content)}</span></span>
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

  const app: PhoneApp = {
    id: 'guardian',
    label: '안심 지킴이',
    icon: I.shield,
    bg: 'linear-gradient(160deg,#3b82f6,#1e40af)',
    render(view, data, ctx) {
      if (view === 'main') {
        const danger = records.filter(
          (r) => r.result.riskLevel === 'DANGER',
        ).length;
        return {
          html: `<div style="background:linear-gradient(160deg,#2563eb,#1e3a8a);padding-bottom:18px;border-radius:0 0 28px 28px">
              <div class="vp-appbar"><button data-act="back" aria-label="뒤로" style="border:0;background:none;color:#fff;cursor:pointer;padding:0;width:32px;height:32px;display:grid;place-items:center">←</button>${I.shield}<b>안심 지킴이</b></div>
              <div style="margin:0 14px;padding:14px;border-radius:22px;background:rgba(255,255,255,.14);color:#fff;display:grid;gap:4px">
                <span style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:1.05em"><span style="width:10px;height:10px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 4px rgba(74,222,128,.3)"></span>실시간 감지 켜짐</span>
                <span style="opacity:.9">문자·카톡이 오는 순간 검사하고 위험하면 막아요</span>
                <span style="display:flex;gap:16px;margin-top:6px"><span><b style="font-size:1.5em">${records.length}</b> 검사</span><span><b style="font-size:1.5em;color:#fca5a5">${danger}</b> 위험 막음</span></span>
              </div></div>
            <div class="vp-sub">스미싱 차단</div>
            <div class="vp-menu" style="padding-top:0">
              ${menu('guard', '#2563eb', I.shield, '실시간 감지 기록', '받은 문자 검사 결과 · 정답 알려 주기')}
              ${menu('qr', '#0ea5e9', I.camera, 'QR 검사', '찍기 전에 위험한 주소인지 확인')}
              ${menu('paste', '#f59e0b', I.mail, '붙여 넣어 검사', '복사한 문자를 AI가 판단')}
            </div>`,
        };
      }
      if (view === 'guard')
        return {
          html: `${phoneBar('실시간 감지 기록')}<div class="vp-pad"><b>검사 기록 ${records.length}건</b>${
            records.length
              ? records.map((r) => card(r, false)).join('')
              : '<span style="color:#6b7280">아직 기록이 없어요. 왼쪽 [문자 받기]로 문자를 받아 보세요.</span>'
          }</div>`,
        };
      if (view === 'paste')
        return {
          html: `${phoneBar('붙여 넣어 검사')}<div class="vp-pad"><div class="vp-card"><b>받은 문자를 붙여 넣으세요</b><span style="font-size:.88em;color:#6b7280">메시지 앱에서 문자를 눌러 [복사]한 뒤, 아래 [붙여넣기]를 누르면 AI가 스미싱인지 판단해요.</span><textarea class="vp-field" rows="4" data-model="paste" placeholder="예: [OO은행] 계좌가 정지되었습니다 확인 bit.ly/xx">${esc(ctx.drafts.paste ?? '')}</textarea><span style="display:flex;gap:8px"><button class="vp-btn" style="flex:1;background:#eef0f4;color:#111318" data-act="x:guardian:paste-clip">📋 붙여넣기</button><button class="vp-btn" style="flex:1" data-act="x:guardian:check">AI로 검사하기</button></span></div></div>`,
        };
      if (view === 'result') {
        const r = records.find((x) => x.id === Number(data));
        return {
          html: `${phoneBar('검사 결과')}<div class="vp-pad">${r ? card(r, true) : '지운 기록이에요.'}</div>`,
        };
      }
      if (view === 'qr')
        return {
          html: `${QR_STYLE}${phoneBar('QR 검사')}<div class="gq-vf"><span class="gq-br"><i></i><i></i><i></i><i></i></span><span class="gq-hint">아래 체험용 QR 중 하나를 골라 찍어 보세요</span></div>
            <div class="vp-pad"><div class="gq-list">${DEMO_QR_CODES.map((q, i) => `<button data-act="x:guardian:qr" data-arg="${i}"><small>${esc(q.place)}</small><b>${esc(q.title)}</b></button>`).join('')}</div>
            <span style="font-size:.85em;color:#6b7280">QR 안의 주소는 열지 않고 먼저 검사해요.</span></div>`,
        };
      if (view === 'qrscan') {
        const [id, idx] = data.split(':').map(Number);
        const r = records.find((x) => x.id === id);
        const q = DEMO_QR_CODES[idx];
        if (!r || !q)
          return {
            html: `${phoneBar('QR 검사')}<div class="vp-pad">지운 기록이에요.</div>`,
          };
        return { html: `${phoneBar('QR 검사')}${qrScanView(r, idx, true)}` };
      }
      return { html: phoneBar('안심 지킴이') };
    },
    handle(action, arg, ctx) {
      switch (action) {
        case 'go':
          return ctx.push(arg);
        case 'paste-clip':
          if (!ctx.clipboard)
            return ctx.toast('먼저 메시지 앱에서 문자를 눌러 복사해 주세요');
          ctx.drafts.paste = ctx.clipboard;
          return;
        case 'check': {
          const text = (ctx.drafts.paste ?? '').trim();
          if (text.length < 2) return ctx.toast('검사할 문자를 넣어 주세요');
          const r = add(
            '붙여 넣기',
            text,
            opts.analyzeMessage(text, personal()),
          );
          ctx.drafts.paste = '';
          return ctx.push('result', String(r.id));
        }
        case 'verdict': {
          const [id, v] = arg.split(':');
          const r = records.find((x) => x.id === Number(id));
          if (r) r.verdict = r.verdict === v ? null : (v as 'SCAM' | 'SAFE');
          return ctx.toast('알려 주셔서 고마워요. 다음 검사부터 반영할게요');
        }
        case 'del': {
          const i = records.findIndex((x) => x.id === Number(arg));
          if (i >= 0) records.splice(i, 1);
          return ctx.toast('기록을 지웠어요');
        }
        case 'qr': {
          const q = DEMO_QR_CODES[Number(arg)];
          if (!q) return;
          const r = add('QR 코드', q.content, opts.analyzeQr(q.content));
          return ctx.push('qrscan', `${r.id}:${arg}`);
        }
      }
    },
  };

  return {
    app,
    /** 휴대폰 카메라에 무작위로 비출 수 있는 체험용 QR 수 */
    qrCount: DEMO_QR_CODES.length,
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
    /** 셔터를 누르면 판독해 기록에 넣고, 판독 화면(색 표시만, 결과 창 없음)을 돌려준다. */
    scanQr(index: number) {
      const q = DEMO_QR_CODES[index];
      if (!q) return '';
      const r = add('카메라 QR', q.content, opts.analyzeQr(q.content));
      return qrScanView(r, index, false, true);
    },
    /** 휴대폰에 문자가 도착했을 때 실시간 감지 기록에 넣는다. */
    record(source: string, text: string, result: Analysis) {
      add(source, text, result);
    },
    personal,
  };
}
