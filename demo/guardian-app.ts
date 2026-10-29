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
const QR_POSTERS = [
  {
    icon: '📦',
    label: '택배 조회 전단',
    content: 'http://bit.ly/parcel-check',
  },
  {
    icon: '🏛️',
    label: '주민센터 안내문',
    content: 'https://www.gov.kr/portal/main',
  },
  {
    icon: '🎁',
    label: '경품 당첨 스티커',
    content: 'https://free-gift.xyz/win.apk',
  },
];

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
          html: `${phoneBar('붙여 넣어 검사')}<div class="vp-pad"><div class="vp-card"><b>받은 문자를 붙여 넣으세요</b><span style="font-size:.88em;color:#6b7280">문자를 길게 눌러 복사한 뒤 아래 칸에 붙여 넣으면 AI가 스미싱인지 판단해요.</span><textarea class="vp-field" rows="4" data-model="paste" placeholder="예: [OO은행] 계좌가 정지되었습니다 확인 bit.ly/xx">${esc(ctx.drafts.paste ?? '')}</textarea><button class="vp-btn" data-act="x:guardian:check">AI로 검사하기</button></div></div>`,
        };
      if (view === 'result') {
        const r = records.find((x) => x.id === Number(data));
        return {
          html: `${phoneBar('검사 결과')}<div class="vp-pad">${r ? card(r, true) : '지운 기록이에요.'}</div>`,
        };
      }
      if (view === 'qr')
        return {
          html: `${phoneBar('QR 검사')}<div class="vp-camv" style="flex:none;height:150px;font-size:16px;color:#fff;text-align:center">📷 카메라에 QR 코드를 비춰 주세요<br>(아래 전단지 중 하나를 눌러 찍어 보세요)</div>
            <div class="vp-pad"><div class="vp-qrposter">${QR_POSTERS.map((p, i) => `<button data-act="x:guardian:qr" data-arg="${i}"><b>${p.icon}</b>${p.label}<span style="font-size:22px">▦</span></button>`).join('')}</div>
            <span style="font-size:.85em;color:#6b7280">QR 안의 주소는 열지 않고 먼저 검사해요.</span></div>`,
        };
      return { html: phoneBar('안심 지킴이') };
    },
    handle(action, arg, ctx) {
      switch (action) {
        case 'go':
          return ctx.push(arg);
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
          const p = QR_POSTERS[Number(arg)];
          const r = add('QR 코드', p.content, opts.analyzeQr(p.content));
          return ctx.push('result', String(r.id));
        }
      }
    },
  };

  return {
    app,
    /** 휴대폰에 문자가 도착했을 때 실시간 감지 기록에 넣는다. */
    record(source: string, text: string, result: Analysis) {
      add(source, text, result);
    },
    personal,
  };
}
