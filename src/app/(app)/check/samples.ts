/** 체험용 문자(시연·연습용 가짜 문자). 실제 회사·번호·주소가 아니다. */
export type DemoSample = {
  id: string;
  label: string;
  sender: string;
  app: '문자' | '메신저';
  content: string;
};

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'parcel',
    label: '택배 사칭',
    sender: '+82 10-****-1234',
    app: '문자',
    content:
      '[Web발신] [OO택배] 고객님 상품이 주소지 불일치로 반송 예정입니다. 주소 수정: bit.ly/oo-parcel',
  },
  {
    id: 'family',
    label: '가족 사칭',
    sender: '모르는 번호',
    app: '메신저',
    content:
      '엄마 나 폰 액정 깨져서 수리 맡겼어. 급한데 인증번호 좀 보내줄 수 있어? 이 번호로 문자줘',
  },
  {
    id: 'agency',
    label: '기관 사칭',
    sender: '+1 202-***-0188',
    app: '문자',
    content:
      '[국제발신] [건강보험] 미수령 환급금이 있습니다. 보안 앱 설치 후 신청: url.kr/refund-app',
  },
  {
    id: 'normal',
    label: '정상 문자',
    sender: '딸',
    app: '메신저',
    content: '엄마 오늘 저녁 7시쯤 들어갈게요. 반찬 뭐 사 갈까요?',
  },
];

export type DemoQr = {
  /** 이 QR이 붙어 있던 곳(체험 화면의 안내판 글) */
  place: string;
  title: string;
  content: string;
};

/**
 * 체험용 QR. 주소는 모두 가짜(demo·example)다.
 * 위험 → 주의 → 안전 차례로 놓았다. 차례대로 비추면(pickDemoQr) 세 단계가 번갈아 나와 시연에서 모두 보여 줄 수 있다.
 * (판독: 위험 3개 · 주의 3개 · 안전 2개)
 */
export const DEMO_QR_CODES: DemoQr[] = [
  {
    place: '현관문 택배 스티커',
    title: '배송 조회 · 앱 설치',
    content: 'https://parcel-demo.xyz/track.apk',
  },
  {
    place: '아파트 게시판 전단지',
    title: '무료 건강검진 신청',
    content: 'https://bit.ly/demo-health',
  },
  {
    place: '식당 테이블',
    title: '메뉴판 보기',
    content: 'https://www.example.com/menu',
  },
  {
    place: '공영 주차장 기둥',
    title: '주차 요금 간편 결제',
    content: 'http://192.168.0.10/pay',
  },
  {
    place: '엘리베이터 안내문',
    title: '아파트 관리비 조회',
    content: 'http://apt-fee-demo.kr/check',
  },
  {
    place: '복지관 게시판',
    title: '이번 달 프로그램 안내',
    content: 'https://www.example.org/program',
  },
  {
    place: '우편함 안내문',
    title: '지원금 신청 바로가기',
    content: 'https://xn--80ak6aa92e.cc/apply',
  },
  {
    place: '마트 계산대 스티커',
    title: '경품 이벤트 응모',
    content: 'https://me2.do/demo-event',
  },
];

/** 다음 체험용 QR. 처음엔 무작위로 시작하고, 그다음부터는 차례대로(위험→주의→안전이 번갈아) 고른다. */
export function pickDemoQr(previous: number | null): number {
  if (previous === null) {
    return Math.floor(Math.random() * DEMO_QR_CODES.length);
  }
  return (previous + 1) % DEMO_QR_CODES.length;
}
