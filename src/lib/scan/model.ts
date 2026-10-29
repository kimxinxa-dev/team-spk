import { SAFE_EXAMPLES, SCAM_EXAMPLES } from './dataset';

/**
 * 스미싱 위험 채점 AI.
 * 1) 학습 데이터로 만든 나이브 베이즈 분류기(단어·두 글자 조각의 등장 빈도)
 * 2) 링크·단축 주소·해외 발신 같은 규칙 검사
 * 를 합쳐 0~100점으로 채점한다. 사용자가 "사기 맞아요/아니에요"로 알려 준 기록은
 * 그 사람의 학습 데이터에 더해(가중치 3배) 판단이 점점 그 사람에게 맞춰진다.
 */

export type RiskLevel = 'safe' | 'caution' | 'danger';

export type ScamAnalysis = {
  score: number;
  riskLevel: RiskLevel;
  reasons: string[];
  domains: string[];
};

export type PersonalExample = { content: string; verdict: 'scam' | 'safe' };

const URL_RE = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;
const SHORTENERS = new Set([
  'bit.ly',
  'han.gl',
  'me2.do',
  'url.kr',
  'vo.la',
  't.ly',
  'tinyurl.com',
  'buly.kr',
  'c11.kr',
  'shorturl.at',
  'is.gd',
]);
const TRUSTED = [
  'go.kr',
  'gov.kr',
  'naver.com',
  'kakao.com',
  'daum.net',
  'korail.com',
  'nhis.or.kr',
];
const PERSONAL_WEIGHT = 3;

function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' 링크 ')
    .split(/[^0-9a-z가-힣]+/)
    .filter((w) => w.length >= 2);
  const bigrams: string[] = [];
  for (const w of words) {
    if (!/[가-힣]/.test(w)) continue;
    for (let i = 0; i < w.length - 1; i += 1)
      bigrams.push(`#${w.slice(i, i + 2)}`);
  }
  return [...new Set([...words, ...bigrams])];
}

type Counts = { docs: number; total: number; freq: Map<string, number> };

function emptyCounts(): Counts {
  return { docs: 0, total: 0, freq: new Map() };
}

function addDoc(counts: Counts, text: string, weight: number) {
  counts.docs += weight;
  for (const t of tokenize(text)) {
    counts.freq.set(t, (counts.freq.get(t) ?? 0) + weight);
    counts.total += weight;
  }
}

type Model = { scam: Counts; safe: Counts; vocab: Set<string> };

function train(personal: PersonalExample[]): Model {
  const scam = emptyCounts();
  const safe = emptyCounts();
  SCAM_EXAMPLES.forEach((t) => addDoc(scam, t, 1));
  SAFE_EXAMPLES.forEach((t) => addDoc(safe, t, 1));
  personal.forEach((p) =>
    addDoc(p.verdict === 'scam' ? scam : safe, p.content, PERSONAL_WEIGHT),
  );
  const vocab = new Set([...scam.freq.keys(), ...safe.freq.keys()]);
  return { scam, safe, vocab };
}

/** 기본 학습 모델은 한 번만 만들어 재사용한다. */
const baseModel = train([]);

function classify(model: Model, text: string) {
  const v = model.vocab.size;
  const logPrior = Math.log(model.scam.docs / model.safe.docs);
  let logOdds = logPrior;
  const contributions: Array<[string, number]> = [];
  for (const t of tokenize(text)) {
    if (!model.vocab.has(t)) continue;
    const pScam = ((model.scam.freq.get(t) ?? 0) + 1) / (model.scam.total + v);
    const pSafe = ((model.safe.freq.get(t) ?? 0) + 1) / (model.safe.total + v);
    const c = Math.log(pScam / pSafe);
    logOdds += c;
    contributions.push([t, c]);
  }
  const probability = 1 / (1 + Math.exp(-logOdds));
  const topWords = contributions
    .filter(([t, c]) => c > 0.7 && !t.startsWith('#') && /[가-힣]/.test(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
  return { probability, topWords };
}

export function domainOf(raw: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function ruleCheck(text: string, sender: string | null) {
  let score = 0;
  const reasons: string[] = [];
  const domains = [
    ...new Set(
      [...text.matchAll(URL_RE)]
        .map((m) => domainOf(m[1]))
        .filter((d): d is string => !!d),
    ),
  ];
  const untrusted = domains.filter(
    (d) => !TRUSTED.some((t) => d === t || d.endsWith(`.${t}`)),
  );
  if (untrusted.length > 0) {
    score += 35;
    reasons.push('모르는 사이트 주소가 들어 있어요');
  }
  if (untrusted.some((d) => SHORTENERS.has(d))) {
    score += 25;
    reasons.push('주소를 짧게 줄여 진짜 사이트를 숨기고 있어요');
  }
  if (/\.apk\b|앱\s*설치|원격/.test(text)) {
    score += 40;
    reasons.push('앱을 설치하게 하는 문자는 매우 위험해요');
  }
  if (/인증번호|비밀번호|신분증|계좌/.test(text)) {
    score += 25;
    reasons.push('개인정보나 돈을 요구하고 있어요');
  }
  if (
    /국제발신|해외발신/.test(text) ||
    (sender?.startsWith('+') && !sender.startsWith('+82'))
  ) {
    score += 15;
    reasons.push('해외에서 보낸 문자예요');
  }
  return { score, reasons, domains: untrusted };
}

export function analyzeMessage(
  text: string,
  sender: string | null,
  personal: PersonalExample[] = [],
): ScamAnalysis {
  const model = personal.length > 0 ? train(personal) : baseModel;
  const { probability, topWords } = classify(model, text);
  const rules = ruleCheck(text, sender);

  const score = Math.round(
    Math.min(100, probability * 70 + Math.min(rules.score, 60) * 0.6),
  );
  const reasons = [...rules.reasons];
  if (topWords.length > 0 && probability > 0.5) {
    reasons.push(
      `'${topWords.join("', '")}' 같은 말이 사기 문자에 자주 나와요`,
    );
  }
  if (personal.length > 0 && probability > 0.5) {
    reasons.push('전에 알려 주신 사기 문자와 비슷해요');
  }
  const riskLevel: RiskLevel =
    score >= 60 ? 'danger' : score >= 35 ? 'caution' : 'safe';
  if (riskLevel === 'safe' && reasons.length === 0)
    reasons.push('특별히 위험한 점을 찾지 못했어요');
  return {
    score,
    riskLevel,
    reasons: reasons.slice(0, 4),
    domains: rules.domains,
  };
}
