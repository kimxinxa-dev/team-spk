/**
 * 말로 물어보기 안내 목록. 단계마다 할 일(instruction)과 가상 휴대폰에서 눌러야 할 곳(target)을 정한다.
 * target은 가상 휴대폰(src/lib/phone/engine.ts) 화면 요소의 data-gid 값이다.
 */

export type GuideStep = { instruction: string; target: string };

export type Guide = {
  key: string;
  title: string;
  keywords: string[];
  steps: GuideStep[];
  tip: string;
};

export const GUIDES: Guide[] = [
  {
    key: 'send-photo',
    title: '메신저로 사진 보내기',
    keywords: ['사진', '보내', '카톡', '카카오', '전송', '그림'],
    tip: '사진을 여러 장 고르면 한 번에 보낼 수 있어요.',
    steps: [
      { instruction: '메신저 앱을 눌러 여세요.', target: 'home:messenger' },
      {
        instruction: '사진을 보낼 딸의 대화방을 누르세요.',
        target: 'messenger:daughter',
      },
      {
        instruction: '글 쓰는 칸 왼쪽의 + 버튼을 누르세요.',
        target: 'chat:plus',
      },
      { instruction: '앨범을 누르세요.', target: 'attach:album' },
      { instruction: '보낼 사진을 눌러 고르세요.', target: 'album:photo-0' },
      {
        instruction: '아래의 전송 버튼을 누르면 끝이에요.',
        target: 'album:send',
      },
    ],
  },
  {
    key: 'font-size',
    title: '글자 크게 만들기',
    keywords: ['글자', '글씨', '크게', '작아', '안보', '안 보'],
    tip: '너무 크면 가- 버튼을 눌러 줄이면 돼요.',
    steps: [
      { instruction: '설정 앱을 눌러 여세요.', target: 'home:settings' },
      { instruction: '디스플레이를 누르세요.', target: 'settings:display' },
      { instruction: '글자 크기와 스타일을 누르세요.', target: 'display:font' },
      { instruction: '가+ 버튼을 눌러 글자를 키우세요.', target: 'font:plus' },
    ],
  },
  {
    key: 'wifi',
    title: '와이파이 연결하기',
    keywords: ['와이파이', '와이 파이', 'wifi', '인터넷', '데이터', '연결'],
    tip: '와이파이 비밀번호는 공유기 뒷면에 적혀 있는 경우가 많아요.',
    steps: [
      { instruction: '설정 앱을 눌러 여세요.', target: 'home:settings' },
      { instruction: '연결을 누르세요.', target: 'settings:connections' },
      { instruction: 'Wi-Fi를 누르세요.', target: 'connections:wifi' },
      { instruction: 'Wi-Fi를 켜세요.', target: 'wifi:toggle' },
      { instruction: '우리집_WiFi를 누르세요.', target: 'wifi:home' },
      { instruction: '연결 버튼을 누르세요.', target: 'wifipw:connect' },
    ],
  },
  {
    key: 'video-call',
    title: '영상통화 걸기',
    keywords: ['영상', '화상', '얼굴', '보면서', '통화'],
    tip: '휴대폰을 얼굴 앞에 세워 들면 상대방이 잘 볼 수 있어요.',
    steps: [
      { instruction: '전화 앱을 눌러 여세요.', target: 'home:phone' },
      { instruction: '연락처에서 아들을 누르세요.', target: 'contacts:son' },
      {
        instruction: '카메라 모양의 영상통화 버튼을 누르세요.',
        target: 'contact:video',
      },
      {
        instruction: '통화를 마치려면 빨간 버튼을 누르세요.',
        target: 'call:hang',
      },
    ],
  },
  {
    key: 'take-photo',
    title: '사진 찍기',
    keywords: ['찍', '촬영', '카메라', '셀카'],
    tip: '찍은 사진은 사진첩 앱에서 다시 볼 수 있어요.',
    steps: [
      { instruction: '카메라 앱을 눌러 여세요.', target: 'home:camera' },
      {
        instruction: '아래 가운데의 둥근 버튼을 누르면 찍혀요.',
        target: 'camera:shutter',
      },
    ],
  },
  {
    key: 'alarm',
    title: '알람 맞추기',
    keywords: ['알람', '깨워', '아침', '시계', '약 먹', '시간 알려'],
    tip: '약 먹는 시간도 알람으로 맞춰 두면 잊지 않아요.',
    steps: [
      { instruction: '시계 앱을 눌러 여세요.', target: 'home:clock' },
      { instruction: '+ 알람 추가를 누르세요.', target: 'clock:add' },
      { instruction: '시간을 고르고 저장을 누르세요.', target: 'alarm:save' },
    ],
  },
];

export function findGuide(key: string): Guide | undefined {
  return GUIDES.find((g) => g.key === key);
}

/**
 * 말한 문장에서 하고 싶은 일을 알아듣는다(낱말 겹침 점수).
 * 가장 비슷한 안내와 그다음 후보 2개를 돌려준다.
 */
export function matchGuides(question: string): {
  best: Guide | null;
  others: Guide[];
} {
  const q = question.replace(/\s+/g, ' ').toLowerCase();
  const scored = GUIDES.map((g) => ({
    g,
    score: g.keywords.reduce((s, k) => s + (q.includes(k) ? k.length : 0), 0),
  })).sort((a, b) => b.score - a.score);
  const best = scored[0].score > 0 ? scored[0].g : null;
  return {
    best,
    others: scored
      .filter((s) => s.g !== best)
      .slice(0, 2)
      .map((s) => s.g),
  };
}
