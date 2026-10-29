// 규칙 기반 스미싱 판별. AI 분석을 연결하기 전에도, AI가 늦거나 실패해도 이 결과로 바로 답한다.
// 순수 함수(DB·네트워크 없음)라 서버 어디서든 쓸 수 있다.

export type Risk = 'SAFE' | 'CAUTION' | 'DANGER';
export type RuleResult = { riskLevel: Risk; reasons: string[] };

const SHORTENER_HOSTS = [
  'bit.ly',
  'han.gl',
  'me2.do',
  'url.kr',
  'vo.la',
  'buly.kr',
  'c11.kr',
  'tinyurl.com',
  'is.gd',
  't.ly',
  'goo.gl',
  'shorturl.at',
];

const SUSPICIOUS_TLDS = [
  'xyz',
  'top',
  'site',
  'shop',
  'click',
  'icu',
  'live',
  'cc',
  'buzz',
  'monster',
];

/** 사칭 유형별 단어. 하나라도 들어 있으면 그 이유를 보여 준다. */
const KEYWORD_GROUPS: { reason: string; words: string[]; weight: number }[] = [
  {
    reason: '택배·배송을 사칭하는 문구가 있어요.',
    words: ['택배', '배송', '반송', '주소지 불일치', '주소 불일치', '운송장'],
    weight: 1,
  },
  {
    reason: '가족·지인을 사칭하는 문구가 있어요.',
    words: [
      '엄마',
      '아빠',
      '폰 고장',
      '액정',
      '폰이 깨져',
      '문화상품권',
      '기프트카드',
    ],
    weight: 1,
  },
  {
    reason: '정부·공공기관을 사칭하는 문구가 있어요.',
    words: [
      '지원금',
      '환급',
      '재난',
      '건강보험',
      '국민연금',
      '연말정산',
      '정부24',
    ],
    weight: 1,
  },
  {
    reason: '벌금·수사기관을 사칭해 겁을 주는 문구가 있어요.',
    words: [
      '과태료',
      '범칙금',
      '미납',
      '연체',
      '압류',
      '검찰',
      '경찰청',
      '출석요구',
    ],
    weight: 1,
  },
  {
    reason: '결제·승인을 사칭하는 문구가 있어요.',
    words: [
      '결제 승인',
      '해외결제',
      '결제완료',
      '본인이 아닐 경우',
      '승인 취소',
    ],
    weight: 1,
  },
  {
    reason: '개인정보나 금융정보를 요구해요.',
    words: [
      '인증번호',
      '비밀번호',
      '계좌번호',
      '주민등록번호',
      '보안카드',
      'OTP',
      '송금',
    ],
    weight: 2,
  },
  {
    reason: '청첩장·부고를 사칭하는 문구가 있어요.',
    words: ['청첩장', '부고', '모바일 초대장', '돌잔치'],
    weight: 1,
  },
];

const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|kr|me|ly|io|gl|do|at|xyz|top|site|shop|click|icu|live|cc|buzz|monster)(?:\/[^\s<>"']*)?/gi;

function toUrl(raw: string): URL | null {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

function levelOf(score: number): Risk {
  if (score >= 3) return 'DANGER';
  if (score >= 1) return 'CAUTION';
  return 'SAFE';
}

/** 주소 하나의 위험 요소 점수와 이유 */
function scoreUrl(raw: string): { score: number; reasons: string[] } {
  const url = toUrl(raw.trim());
  if (!url) return { score: 2, reasons: ['열 수 없는 이상한 주소예요.'] };

  const reasons: string[] = [];
  let score = 0;
  const host = url.hostname.toLowerCase();
  const tld = host.split('.').pop() ?? '';

  if (!['http:', 'https:'].includes(url.protocol)) {
    score += 1;
    reasons.push(
      '인터넷 주소가 아닌 다른 동작(전화·문자·앱 열기 등)을 실행해요.',
    );
  }
  if (url.protocol === 'http:') {
    score += 1;
    reasons.push('암호화되지 않은 주소(http)예요.');
  }
  if (SHORTENER_HOSTS.some((s) => host === s || host.endsWith(`.${s}`))) {
    score += 2;
    reasons.push('진짜 주소를 숨기는 단축 주소예요.');
  }
  if (SUSPICIOUS_TLDS.includes(tld)) {
    score += 2;
    reasons.push(`사기에 자주 쓰이는 주소(.${tld})예요.`);
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    score += 2;
    reasons.push('이름 대신 숫자로 된 주소예요.');
  }
  if (host.includes('xn--')) {
    score += 2;
    reasons.push('진짜 사이트처럼 보이게 꾸민 주소일 수 있어요.');
  }
  if (url.username || raw.includes('@')) {
    score += 2;
    reasons.push('주소 안에 @가 있어 다른 사이트로 갈 수 있어요.');
  }
  if (/\.apk(?:$|[?#])/i.test(url.pathname + url.search)) {
    score += 3;
    reasons.push('앱 설치 파일(.apk)을 내려받게 해요. 절대 설치하지 마세요.');
  }
  return { score, reasons };
}

/** 문자·카톡 메시지 검사 */
export function analyzeMessage(text: string): RuleResult {
  const reasons: string[] = [];
  let score = 0;

  const urls = text.match(URL_PATTERN) ?? [];
  if (urls.length > 0) {
    score += 1;
    reasons.push('누르게 하는 인터넷 주소(링크)가 들어 있어요.');
    for (const raw of urls.slice(0, 5)) {
      const result = scoreUrl(raw);
      score += result.score;
      reasons.push(...result.reasons);
    }
  }

  const compact = text.replace(/\s+/g, ' ');
  for (const group of KEYWORD_GROUPS) {
    if (group.words.some((word) => compact.includes(word))) {
      score += group.weight;
      reasons.push(group.reason);
    }
  }

  if (/\.apk\b/i.test(text) || /앱\s*(?:을|를)?\s*설치/.test(text)) {
    score += 2;
    reasons.push('앱 설치를 하라고 해요. 모르는 앱은 설치하지 마세요.');
  }

  return { riskLevel: levelOf(score), reasons: [...new Set(reasons)] };
}

/** QR 코드 안의 내용 검사 */
export function analyzeQr(content: string): RuleResult {
  const text = content.trim();
  const looksLikeUrl =
    /^[a-z][a-z0-9+.-]*:/i.test(text) || /^www\./i.test(text);
  if (!looksLikeUrl) {
    return {
      riskLevel: 'SAFE',
      reasons: ['인터넷 주소가 아닌 글자만 들어 있어요.'],
    };
  }
  const { score, reasons } = scoreUrl(text);
  return { riskLevel: levelOf(score), reasons: [...new Set(reasons)] };
}
