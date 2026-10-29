// 규칙 판별(rules.ts)과 학습 AI 채점(model.ts)을 합친 최종 판단.
// 둘 중 더 위험하다고 본 쪽을 따르고, AI가 찾은 이유(자주 쓰이는 사기 문구, 내 기록과의 유사성)를 덧붙인다.
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

export function analyzeScan(
  kind: 'MESSAGE' | 'QR',
  content: string,
  personal: PersonalExample[] = [],
): ScanAnalysis {
  const rule = kind === 'MESSAGE' ? ruleMessage(content) : ruleQr(content);
  const ai = modelAnalyze(content, null, personal);
  const aiRisk = ai.riskLevel.toUpperCase() as Risk;
  const riskLevel =
    RANK[aiRisk] > RANK[rule.riskLevel] ? aiRisk : rule.riskLevel;
  const aiReasons = ai.reasons.filter(
    (r) => r.includes('자주 나와요') || r.includes('알려 주신'),
  );
  return {
    riskLevel,
    score: Math.max(ai.score, FLOOR[riskLevel]),
    reasons: [...new Set([...rule.reasons, ...aiReasons])].slice(0, 5),
  };
}
