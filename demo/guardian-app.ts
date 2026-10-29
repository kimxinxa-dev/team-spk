// 시뮬레이션용: 가상 휴대폰에 설치되는 '안심 지킴이' 앱.
// 실제 앱의 채점 AI·안내 목록·키오스크 시나리오를 그대로 쓰고, 기록은 이 페이지 안에만 둔다.
import {
  escapeHtml as esc,
  phoneBar,
  type Analysis,
  type PhoneApp,
  type PhoneGuide,
} from '../src/lib/phone/engine';

type Guide = PhoneGuide & { key: string; tip: string };
type Option = { id: string; label: string; sub?: string; icon?: string };
type Step =
  | {
      kind: 'choice';
      name: string;
      title: string;
      layout: 'grid' | 'list' | 'big';
      options: Option[];
      answer: string;
    }
  | { kind: 'keypad'; name: string; title: string; answer: string }
  | {
      kind: 'pay';
      name: string;
      title: string;
      options: Option[];
      answer: string;
    };
type Scenario = {
  type: string;
  name: string;
  brand: string;
  icon: string;
  mission: string;
  steps: Step[];
  doneTitle: string;
  doneText: string;
};

type Rec = {
  id: number;
  source: string;
  text: string;
  result: Analysis;
  verdict: 'SCAM' | 'SAFE' | null;
};

const COLOR: Record<string, string> = {
  DANGER: '#b91c1c',
  CAUTION: '#b45309',
  SAFE: '#15803d',
};
const LABEL: Record<string, string> = {
  DANGER: '위험',
  CAUTION: '주의',
  SAFE: '안전',
};
const KCOLOR: Record<string, string> = {
  restaurant: '#b91c1c',
  hospital: '#0f766e',
  train: '#1e40af',
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
  guides: Guide[];
  matchGuides: (q: string) => { best: Guide | null };
  scenarios: Scenario[];
  tipFor: (stuck: string | null, mistakes: number) => string;
  onGuide: (g: Guide) => void;
}) {
  const records: Rec[] = [];
  let nextId = 1;
  let askMiss = false;
  const k = {
    sc: null as Scenario | null,
    started: false,
    i: 0,
    miss: [] as number[],
    hint: false,
    msg: '',
    code: '',
    paying: false,
    done: null as null | { sec: number; total: number; stuck: string | null },
    start: 0,
  };

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
      <span><span class="vp-pill" style="background:${COLOR[r.result.riskLevel]}">${LABEL[r.result.riskLevel]} ${r.result.score}점</span> <small style="color:#71717a">${esc(r.source)}</small></span>
      <span style="word-break:break-all">${esc(r.text.length > 80 && !full ? r.text.slice(0, 80) + '…' : r.text)}</span>
      <ul style="margin:0;padding-left:16px;font-size:.9em">${r.result.reasons
        .slice(0, full ? 5 : 2)
        .map((x) => `<li>${esc(x)}</li>`)
        .join('')}</ul>
      <span style="font-size:.85em;font-weight:700">실제로 사기였나요?</span>
      <span class="vp-chips"><button class="vp-mini ${r.verdict === 'SCAM' ? 'on' : ''}" data-act="x:guardian:verdict" data-arg="${r.id}:SCAM">사기 맞아요</button><button class="vp-mini ${r.verdict === 'SAFE' ? 'on' : ''}" data-act="x:guardian:verdict" data-arg="${r.id}:SAFE">아니에요</button><button class="vp-mini" data-act="x:guardian:del" data-arg="${r.id}">지우기</button></span></div>`;
  }

  function kioskBody(): string {
    const sc = k.sc!;
    const color = KCOLOR[sc.type];
    const head = `<div style="background:${color};color:#fff;padding:10px 12px;font-weight:800;display:flex;justify-content:space-between"><span>${sc.icon} ${esc(sc.brand)}</span><span>${!k.started ? '대기' : k.done ? '완료' : `${k.i + 1}/${sc.steps.length}`}</span></div>`;
    if (!k.started)
      return `${head}<button data-act="x:guardian:k-start" style="flex:1;border:0;background:linear-gradient(160deg,${color},#18181b);color:#fff;font:inherit;cursor:pointer;display:grid;place-items:center;text-align:center"><span><span style="font-size:56px">${sc.icon}</span><b style="display:block;font-size:1.3em">${esc(sc.brand)}</b>화면을 눌러 시작하세요 👆</span></button>`;
    if (k.done)
      return `${head}<div class="vp-pad"><div style="text-align:center;font-size:48px">🎉</div><b style="text-align:center;font-size:1.2em">${esc(sc.doneTitle)}</b><span>${esc(sc.doneText)}</span>
        <div class="vp-card SAFE"><b>연습 기록</b><span>${k.done.sec}초 · 실수 ${k.done.total}번${k.done.stuck ? ` · 막힌 곳: ${esc(k.done.stuck)}` : ''}</span><span>💡 ${esc(opts.tipFor(k.done.stuck, k.done.total))}</span></div>
        <button class="vp-btn" data-act="x:guardian:k-again">한 번 더 연습</button></div>`;
    const st = sc.steps[k.i];
    let body = '';
    if (k.paying)
      body = `<div style="text-align:center;padding:30px 0"><div style="font-size:48px">💳</div><b>카드를 투입구에 꽂아 주세요</b><br>결제 중이에요…</div>`;
    else if (st.kind === 'keypad') {
      const nx = st.answer[k.code.length];
      body = `<b>${esc(st.title)}</b><div style="font-size:1.5em;letter-spacing:.3em;text-align:center;background:#fff;border:2px solid #d4d4d8;border-radius:10px;padding:6px">${k.code.padEnd(st.answer.length, '_')}</div>
        <div class="vp-keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '지움', '0', '확인'].map((key) => `<button data-act="x:guardian:k-key" data-arg="${key}" class="${k.hint && (k.code.length === st.answer.length ? key === '확인' : key === nx) ? 'vp-target' : ''}" ${key === '확인' ? `style="background:${color};color:#fff"` : ''}>${key}</button>`).join('')}</div>`;
    } else {
      const grid = st.kind === 'choice' && st.layout === 'grid';
      body = `<b>${esc(st.title)}</b><div class="${grid ? 'vp-k-grid' : ''}" style="${grid ? '' : 'display:grid;gap:8px'}">${st.options.map((o) => `<button class="vp-k-opt ${k.hint && o.id === st.answer ? 'vp-target' : ''}" data-act="x:guardian:k-opt" data-arg="${o.id}">${o.icon ? `<em>${o.icon}</em>` : ''}<span><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span></button>`).join('')}</div>`;
    }
    return `${head}<div style="background:#fffbea;border-bottom:2px solid #facc15;padding:6px 10px;font-size:.85em"><b>과제</b> ${esc(sc.mission)}</div>
      <div class="vp-pad" style="flex:1;background:#fafafa">${body}${k.msg ? `<span style="color:#b45309;font-weight:800">${esc(k.msg)}</span>` : ''}</div>
      <div style="display:flex;gap:6px;padding:8px;background:#fff;border-top:1px solid #e4e4e7"><button class="vp-mini" style="flex:1;min-height:42px" data-act="x:guardian:k-again">처음으로</button><button class="vp-mini" style="flex:1;min-height:42px;background:#facc15;border-color:#facc15" data-act="x:guardian:k-hint">🙋 도와주세요</button></div>`;
  }

  function kNext() {
    k.hint = false;
    k.msg = '';
    k.code = '';
    if (k.i + 1 < k.sc!.steps.length) {
      k.i += 1;
      return;
    }
    const total = k.miss.reduce((a, b) => a + b, 0);
    const worst = k.miss.indexOf(Math.max(...k.miss));
    k.done = {
      sec: Math.max(1, Math.round((Date.now() - k.start) / 1000)),
      total,
      stuck: total ? k.sc!.steps[worst].name : null,
    };
  }

  function kReset(sc: Scenario) {
    Object.assign(k, {
      sc,
      started: false,
      i: 0,
      miss: sc.steps.map(() => 0),
      hint: false,
      msg: '',
      code: '',
      paying: false,
      done: null,
      start: 0,
    });
  }

  let refresh: () => void = () => undefined;

  const app: PhoneApp = {
    id: 'guardian',
    label: '안심 지킴이',
    icon: '🛡️',
    bg: '#1d4ed8',
    render(view, data, ctx) {
      void ctx;
      if (view === 'main') {
        const danger = records.filter(
          (r) => r.result.riskLevel === 'DANGER',
        ).length;
        return {
          html: `${phoneBar('안심 지킴이')}<div class="vp-pad"><div class="vp-card" style="background:#1d4ed8;color:#fff"><b style="font-size:1.1em">🛡️ 문자 지킴이 켜짐</b><span>문자·카톡이 오면 바로 검사해요. 검사 ${records.length}건 · 위험 ${danger}건</span></div></div>
            <div class="vp-menu" style="padding-top:0">
              <button data-act="x:guardian:go" data-arg="guard"><i>🛡️</i><span><b>문자 지킴이</b><small>검사 기록 · 붙여 넣어 검사</small></span></button>
              <button data-act="x:guardian:go" data-arg="qr"><i>📷</i><span><b>QR 검사</b><small>찍기 전에 위험한 주소인지 확인</small></span></button>
              <button data-act="x:guardian:go" data-arg="ask"><i>🎤</i><span><b>말로 물어보기</b><small>누를 곳을 노란 테두리로 안내</small></span></button>
              <button data-act="x:guardian:go" data-arg="kiosk"><i>🍽️</i><span><b>키오스크 연습</b><small>음식점·병원·기차역</small></span></button></div>`,
        };
      }
      if (view === 'guard')
        return {
          html: `${phoneBar('문자 지킴이')}<div class="vp-pad"><div class="vp-card"><b>받은 문자 붙여 넣어 검사</b><textarea class="vp-field" rows="3" data-model="paste" placeholder="받은 문자를 붙여 넣으세요">${esc(ctx.drafts.paste ?? '')}</textarea><button class="vp-btn" data-act="x:guardian:check">검사하기</button></div>
            <b>검사 기록 ${records.length}건</b>${records.length ? records.map((r) => card(r, false)).join('') : '<span style="color:#71717a">아직 기록이 없어요. 왼쪽 [문자 받기]로 문자를 받아 보세요.</span>'}</div>`,
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
            <span style="font-size:.85em;color:#71717a">QR 안의 주소는 열지 않고 먼저 검사해요.</span></div>`,
        };
      if (view === 'ask')
        return {
          html: `${phoneBar('말로 물어보기')}<div class="vp-pad"><button class="vp-btn" style="min-height:70px;font-size:1.1em" data-act="x:guardian:mic">🎤 눌러서 말하기</button>
            <div style="display:flex;gap:6px"><input class="vp-field" data-model="ask" placeholder="예: 사진 보내고 싶어요" value="${esc(ctx.drafts.ask ?? '')}"><button class="vp-btn" data-act="x:guardian:ask">찾기</button></div>
            ${askMiss ? '<span style="color:#b45309;font-weight:700">딱 맞는 안내를 못 찾았어요. 아래에서 골라 보세요.</span>' : ''}
            <b>이런 걸 물어볼 수 있어요</b><div class="vp-chips">${opts.guides.map((g) => `<button class="vp-chip" data-act="x:guardian:guide" data-arg="${g.key}">${esc(g.title)}</button>`).join('')}</div>
            <span style="font-size:.85em;color:#71717a">고르면 홈 화면으로 가서 눌러야 할 곳을 노란 테두리로 알려 드려요.</span></div>`,
        };
      if (view === 'kiosk')
        return {
          html: `${phoneBar('키오스크 연습')}<div class="vp-menu">${opts.scenarios.map((s) => `<button data-act="x:guardian:k-pick" data-arg="${s.type}"><i>${s.icon}</i><span><b>${esc(s.name)}</b><small>${s.steps.length}단계 · ${esc(s.brand)}</small></span></button>`).join('')}</div>`,
        };
      if (view === 'k' && k.sc)
        return {
          html: `<div style="display:flex;flex-direction:column;flex:1">${kioskBody()}</div>`,
        };
      return { html: phoneBar('안심 지킴이') };
    },
    handle(action, arg, ctx) {
      switch (action) {
        case 'go':
          askMiss = false;
          return ctx.push(arg);
        case 'check': {
          const text = (ctx.drafts.paste ?? '').trim();
          if (text.length < 2) {
            ctx.toast('검사할 문자를 넣어 주세요');
            return false;
          }
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
        case 'mic':
          ctx.toast(
            '미리보기에서는 마이크를 쓸 수 없어요. 글로 적거나 아래에서 골라 주세요',
          );
          return false;
        case 'ask': {
          const m = opts.matchGuides(ctx.drafts.ask ?? '');
          askMiss = !m.best;
          if (!m.best) return false;
          ctx.startGuide(m.best);
          opts.onGuide(m.best);
          return;
        }
        case 'guide': {
          const g = opts.guides.find((x) => x.key === arg);
          if (!g) return false;
          ctx.startGuide(g);
          opts.onGuide(g);
          return;
        }
        case 'k-pick': {
          const sc = opts.scenarios.find((s) => s.type === arg);
          if (!sc) return false;
          kReset(sc);
          return ctx.push('k');
        }
        case 'k-start':
          k.started = true;
          k.start = Date.now();
          return;
        case 'k-again':
          return kReset(k.sc!);
        case 'k-hint':
          k.hint = true;
          return;
        case 'k-opt': {
          const st = k.sc!.steps[k.i];
          if (st.kind === 'keypad') return;
          if (arg !== st.answer) {
            k.miss[k.i] += 1;
            k.msg = '괜찮아요, 다시 해 볼까요? 위의 과제를 다시 읽어 보세요.';
            return;
          }
          if (st.kind === 'pay') {
            k.paying = true;
            setTimeout(() => {
              k.paying = false;
              kNext();
              refresh();
            }, 1500);
            return;
          }
          return kNext();
        }
        case 'k-key': {
          const st = k.sc!.steps[k.i];
          if (st.kind !== 'keypad') return;
          if (arg === '지움') k.code = k.code.slice(0, -1);
          else if (arg === '확인') {
            if (k.code === st.answer) return kNext();
            k.miss[k.i] += 1;
            k.msg = `숫자가 달라요. ${st.answer.length}자리를 다시 눌러 보세요.`;
          } else if (k.code.length < st.answer.length) k.code += arg;
          return;
        }
      }
    },
  };

  return {
    app,
    /** 휴대폰에 문자가 도착했을 때 검사 기록에 넣는다. */
    record(source: string, text: string, result: Analysis) {
      add(source, text, result);
    },
    personal,
    setRefresh(fn: () => void) {
      refresh = fn;
    },
  };
}
