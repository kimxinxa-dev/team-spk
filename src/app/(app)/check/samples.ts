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
