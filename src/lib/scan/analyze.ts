// 규칙 판별(rules.ts)과 학습 AI 채점(model.ts)을 합친 최종 판단.
// 문자: 둘 중 더 위험하다고 본 쪽을 따르고, AI가 찾은 이유(자주 쓰이는 사기 문구, 내 기록과의 유사성)를 덧붙인다.
// QR: 학습 AI는 문장으로 학습해 주소만으로는 판단하기 어려우므로, 주소를 분석하는 규칙 판별을 따른다.
import { analyzeMessage as modelAnalyze, type PersonalExample } from './model';
import {
  analyzeMessage as ruleMessage,
  analyzeQr as ruleQr,
  type Risk,
  type RuleResult,
} from './rules';

export type ScanAnalysis = RuleResult & { score: number };

const RANK: Record<Risk, number> = { SAFE: 0, CAUTION: 1, DANGER: 2 };
/** 위험도마다 보장하는 최소 점수(규칙이 위험이라고 했는데 점수가 낮게 보이지 않게) */
const FLOOR: Record<Risk, number> = { SAFE: 0, CAUTION: 35, DANGER: 60 };
/** QR 주소의 위험도별 점수(규칙 판별만 쓰므로 위험도를 점수로 나타낸다) */
const QR_SCORE: Record<Risk, number> = { SAFE: 5, CAUTION: 50, DANGER: 90 };
/** 사칭 낱말만 있는 문자를 안전으로 볼 때, 학습 AI 점수가 이보다 낮아야 한다. */
const WEAK_WORD_AI_LIMIT = 40;
const NO_RISK_REASON = '알려진 위험 요소를 찾지 못했어요.';

export function analyzeScan(
  kind: 'MESSAGE' | 'QR',
  content: string,
  personal: PersonalExample[] = [],
): ScanAnalysis {
  if (kind === 'QR') {
    const rule = ruleQr(content);
    return {
      riskLevel: rule.riskLevel,
      score: QR_SCORE[rule.riskLevel],
      reasons: rule.reasons.length ? rule.reasons : [NO_RISK_REASON],
    };
  }

  const rule = ruleMessage(content);
  const ai = modelAnalyze(content, null, personal);
  const aiRisk = ai.riskLevel.toUpperCase() as Risk;

  // "엄마 저녁 먹었어?"처럼 사칭에 자주 쓰이는 낱말만 있고 링크·개인정보 요구·앱 설치가 없으며
  // 학습 AI도 안전하다고 보면, 평범한 가족 문자로 보고 경고하지 않는다.
  const onlyWeakWords =
    rule.riskLevel === 'CAUTION' &&
    rule.reasons.every((r) => r.endsWith('문구가 있어요.'));
  if (onlyWeakWords && ai.score < WEAK_WORD_AI_LIMIT) {
    return {
      riskLevel: 'SAFE',
      score: ai.score,
      reasons: [
        '사칭에 쓰이는 낱말이 있지만, 링크·돈·개인정보를 요구하지 않아요.',
      ],
    };
  }

  const riskLevel =
    RANK[aiRisk] > RANK[rule.riskLevel] ? aiRisk : rule.riskLevel;
  const aiReasons = ai.reasons.filter(
    (r) => r.includes('자주 나와요') || r.includes('알려 주신'),
  );
  const reasons = [...new Set([...rule.reasons, ...aiReasons])].slice(0, 5);
  if (reasons.length === 0)
    reasons.push(
      riskLevel === 'SAFE'
        ? NO_RISK_REASON
        : '학습된 사기 문자들과 표현이 비슷해요.',
    );
  return {
    riskLevel,
    score: Math.max(ai.score, FLOOR[riskLevel]),
    reasons,
  };
}
