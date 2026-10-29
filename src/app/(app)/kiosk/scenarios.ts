/**
 * 키오스크 연습 시나리오. 실제 무인기의 순서와 배치를 따르되,
 * 특정 회사 화면을 베끼지 않은 일반적인 디자인으로 만든다.
 */

export type KioskType = 'restaurant' | 'hospital' | 'train';

export type Option = { id: string; label: string; sub?: string; icon?: string };

export type KioskStep =
  | {
      kind: 'choice';
      name: string;
      title: string;
      layout: 'grid' | 'list' | 'big';
      options: Option[];
      answer: string;
      tabs?: string[];
      tab?: string;
    }
  | {
      kind: 'keypad';
      name: string;
      title: string;
      answer: string;
      mask?: boolean;
    }
  | {
      kind: 'pay';
      name: string;
      title: string;
      options: Option[];
      answer: string;
    };

export type Scenario = {
  type: KioskType;
  name: string;
  brand: string;
  icon: string;
  mission: string;
  theme: string;
  steps: KioskStep[];
  doneTitle: string;
  doneText: string;
};

export const SCENARIOS: Scenario[] = [
  {
    type: 'restaurant',
    name: '음식점 주문',
    brand: '○○버거',
    icon: '🍔',
    mission:
      '불고기버거 세트(음료: 콜라)를 가게에서 먹고 가는 걸로 카드 결제해 보세요.',
    theme: 'bg-red-700',
    doneTitle: '주문 완료!',
    doneText: '주문번호 127번. 번호가 불리면 카운터에서 받아 가세요.',
    steps: [
      {
        kind: 'choice',
        name: '먹고 가기 선택',
        title: '어디에서 드시나요?',
        layout: 'big',
        options: [
          { id: 'here', label: '매장에서 먹고 가기', icon: '🍽️' },
          { id: 'togo', label: '포장해서 가져가기', icon: '🛍️' },
        ],
        answer: 'here',
      },
      {
        kind: 'choice',
        name: '메뉴 찾기',
        title: '메뉴를 고르세요',
        layout: 'grid',
        tabs: ['추천', '버거', '음료', '디저트'],
        tab: '버거',
        options: [
          { id: 'bulgogi', label: '불고기버거', sub: '5,500원', icon: '🍔' },
          { id: 'chicken', label: '치킨버거', sub: '5,800원', icon: '🍗' },
          { id: 'shrimp', label: '새우버거', sub: '5,300원', icon: '🦐' },
          { id: 'cheese', label: '치즈버거', sub: '4,900원', icon: '🧀' },
        ],
        answer: 'bulgogi',
      },
      {
        kind: 'choice',
        name: '세트 선택',
        title: '단품으로 드릴까요, 세트로 드릴까요?',
        layout: 'big',
        options: [
          { id: 'single', label: '단품', sub: '5,500원', icon: '🍔' },
          {
            id: 'set',
            label: '세트 (감자튀김+음료)',
            sub: '7,500원',
            icon: '🍟',
          },
        ],
        answer: 'set',
      },
      {
        kind: 'choice',
        name: '음료 선택',
        title: '세트 음료를 고르세요',
        layout: 'grid',
        options: [
          { id: 'cola', label: '콜라', icon: '🥤' },
          { id: 'cider', label: '사이다', icon: '🫧' },
          { id: 'coffee', label: '커피', sub: '+500원', icon: '☕' },
          { id: 'juice', label: '오렌지주스', sub: '+700원', icon: '🍊' },
        ],
        answer: 'cola',
      },
      {
        kind: 'choice',
        name: '장바구니 확인',
        title: '주문 내역: 불고기버거 세트(콜라) 1개 — 7,500원',
        layout: 'list',
        options: [
          { id: 'more', label: '메뉴 더 담기', icon: '➕' },
          { id: 'clear', label: '전체 취소', icon: '🗑️' },
          { id: 'pay', label: '결제하기', sub: '7,500원', icon: '💳' },
        ],
        answer: 'pay',
      },
      {
        kind: 'pay',
        name: '결제',
        title: '결제 방법을 고르세요',
        options: [
          { id: 'card', label: '신용·체크카드', icon: '💳' },
          { id: 'mobile', label: '간편결제', icon: '📱' },
          { id: 'coupon', label: '쿠폰 사용', icon: '🎟️' },
        ],
        answer: 'card',
      },
    ],
  },
  {
    type: 'hospital',
    name: '병원 접수',
    brand: '○○병원',
    icon: '🏥',
    mission: '다시 오신 환자로, 생년월일 550312를 넣고 내과에 접수해 보세요.',
    theme: 'bg-teal-700',
    doneTitle: '접수 완료!',
    doneText: '대기번호 24번. 내과 앞에서 이름이 불릴 때까지 기다려 주세요.',
    steps: [
      {
        kind: 'choice',
        name: '접수 시작',
        title: '원하시는 업무를 고르세요',
        layout: 'big',
        options: [
          { id: 'reception', label: '진료 접수', icon: '📋' },
          { id: 'pay', label: '진료비 수납', icon: '💳' },
          { id: 'doc', label: '서류 발급', icon: '📄' },
        ],
        answer: 'reception',
      },
      {
        kind: 'choice',
        name: '초진·재진 선택',
        title: '이 병원에 와 보신 적이 있나요?',
        layout: 'big',
        options: [
          { id: 'first', label: '처음 왔어요 (초진)', icon: '🆕' },
          { id: 'again', label: '와 본 적 있어요 (재진)', icon: '🔁' },
        ],
        answer: 'again',
      },
      {
        kind: 'keypad',
        name: '생년월일 입력',
        title: '생년월일 6자리를 눌러 주세요 (예: 550312)',
        answer: '550312',
      },
      {
        kind: 'choice',
        name: '진료과 선택',
        title: '진료받을 과를 고르세요',
        layout: 'grid',
        options: [
          { id: 'internal', label: '내과', icon: '🩺' },
          { id: 'ortho', label: '정형외과', icon: '🦴' },
          { id: 'eye', label: '안과', icon: '👁️' },
          { id: 'derm', label: '피부과', icon: '🧴' },
        ],
        answer: 'internal',
      },
      {
        kind: 'choice',
        name: '접수 확인',
        title: '재진 · 내과로 접수할까요?',
        layout: 'list',
        options: [
          { id: 'back', label: '이전으로', icon: '↩️' },
          { id: 'ok', label: '접수하기', icon: '✔️' },
        ],
        answer: 'ok',
      },
    ],
  },
  {
    type: 'train',
    name: '기차표 예매',
    brand: '○○철도',
    icon: '🚆',
    mission:
      '서울에서 부산 가는 오늘 10시 30분 기차표, 어른 1명을 카드로 사 보세요.',
    theme: 'bg-blue-800',
    doneTitle: '발권 완료!',
    doneText: '서울 → 부산 10:30 출발, 5호차 12A석. 승차권을 꼭 챙기세요.',
    steps: [
      {
        kind: 'choice',
        name: '승차권 구매 시작',
        title: '원하시는 메뉴를 고르세요',
        layout: 'big',
        options: [
          { id: 'buy', label: '승차권 구매', icon: '🎫' },
          { id: 'reserved', label: '예약 승차권 찾기', icon: '🔎' },
          { id: 'refund', label: '반환·취소', icon: '↩️' },
        ],
        answer: 'buy',
      },
      {
        kind: 'choice',
        name: '도착역 선택',
        title: '출발: 서울 → 도착역을 고르세요',
        layout: 'grid',
        options: [
          { id: 'daejeon', label: '대전', icon: '🚉' },
          { id: 'daegu', label: '동대구', icon: '🚉' },
          { id: 'busan', label: '부산', icon: '🚉' },
          { id: 'gwangju', label: '광주송정', icon: '🚉' },
        ],
        answer: 'busan',
      },
      {
        kind: 'choice',
        name: '시간 선택',
        title: '오늘 출발 시간을 고르세요',
        layout: 'list',
        options: [
          {
            id: 't0930',
            label: '09:30 출발 → 12:10 도착',
            sub: '매진',
            icon: '⛔',
          },
          {
            id: 't1030',
            label: '10:30 출발 → 13:12 도착',
            sub: '일반실 59,800원',
            icon: '🕥',
          },
          {
            id: 't1130',
            label: '11:30 출발 → 14:05 도착',
            sub: '일반실 59,800원',
            icon: '🕦',
          },
        ],
        answer: 't1030',
      },
      {
        kind: 'choice',
        name: '인원 선택',
        title: '몇 분이 타시나요?',
        layout: 'grid',
        options: [
          { id: 'adult1', label: '어른 1명', icon: '🧑' },
          { id: 'adult2', label: '어른 2명', icon: '👫' },
          { id: 'senior1', label: '경로 1명', sub: '만 65세 이상', icon: '🧓' },
          { id: 'child1', label: '어린이 1명', icon: '🧒' },
        ],
        answer: 'adult1',
      },
      {
        kind: 'pay',
        name: '결제',
        title: '59,800원 — 결제 방법을 고르세요',
        options: [
          { id: 'card', label: '신용·체크카드', icon: '💳' },
          { id: 'cash', label: '현금 (이 기계는 안 돼요)', icon: '💵' },
        ],
        answer: 'card',
      },
    ],
  },
];

export function findScenario(type: string) {
  return SCENARIOS.find((s) => s.type === type);
}

/** 막힌 단계에 맞춘 다음 연습 조언 */
export function tipFor(stuckStep: string | null, mistakes: number) {
  if (!stuckStep || mistakes === 0)
    return '한 번도 틀리지 않았어요! 다른 키오스크도 연습해 보세요.';
  return `「${stuckStep}」에서 조금 헤매셨어요. 화면 위쪽의 질문을 먼저 천천히 읽고, 같은 연습을 한 번 더 해 보면 금방 익숙해져요.`;
}
