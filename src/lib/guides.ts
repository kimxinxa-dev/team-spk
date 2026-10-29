/**
 * 말로 물어보기 안내 목록. 단계마다 가상 휴대폰 화면(screen)과 눌러야 할 곳(target)을 정한다.
 * 화면 모양은 특정 회사 앱을 베끼지 않은 일반적인 형태다.
 */

export type ScreenItem = { id: string; label: string; icon?: string };

export type Screen =
  | { kind: 'home'; items: ScreenItem[] }
  | { kind: 'list'; title: string; items: ScreenItem[] }
  | { kind: 'chat'; title: string; messages: string[]; items: ScreenItem[] }
  | { kind: 'grid'; title: string; items: ScreenItem[] }
  | { kind: 'camera'; items: ScreenItem[] }
  | { kind: 'slider'; title: string; items: ScreenItem[] };

export type GuideStep = { instruction: string; screen: Screen; target: string };

export type Guide = {
  key: string;
  title: string;
  keywords: string[];
  steps: GuideStep[];
  tip: string;
};

const HOME: ScreenItem[] = [
  { id: 'phone', label: '전화', icon: '📞' },
  { id: 'messenger', label: '메신저', icon: '💬' },
  { id: 'camera', label: '카메라', icon: '📷' },
  { id: 'gallery', label: '사진첩', icon: '🖼️' },
  { id: 'settings', label: '설정', icon: '⚙️' },
  { id: 'clock', label: '시계', icon: '⏰' },
  { id: 'browser', label: '인터넷', icon: '🌐' },
  { id: 'sms', label: '문자', icon: '✉️' },
];

const home = (): Screen => ({ kind: 'home', items: HOME });

const settingsList = (): Screen => ({
  kind: 'list',
  title: '설정',
  items: [
    { id: 'connections', label: '연결 (Wi-Fi, 블루투스)', icon: '📶' },
    { id: 'sound', label: '소리 및 진동', icon: '🔔' },
    { id: 'display', label: '디스플레이', icon: '🔆' },
    { id: 'battery', label: '배터리', icon: '🔋' },
  ],
});

export const GUIDES: Guide[] = [
  {
    key: 'send-photo',
    title: '메신저로 사진 보내기',
    keywords: ['사진', '보내', '카톡', '카카오', '전송', '그림'],
    tip: '사진을 여러 장 고르면 한 번에 보낼 수 있어요.',
    steps: [
      {
        instruction: '메신저 앱을 눌러 여세요.',
        screen: home(),
        target: 'messenger',
      },
      {
        instruction: '사진을 보낼 사람의 대화방을 누르세요.',
        screen: {
          kind: 'list',
          title: '채팅',
          items: [
            { id: 'daughter', label: '딸 (오늘 저녁에 갈게요)', icon: '👩' },
            { id: 'friend', label: '경로당 친구들', icon: '👥' },
            { id: 'son', label: '아들', icon: '👨' },
          ],
        },
        target: 'daughter',
      },
      {
        instruction: '글 쓰는 칸 왼쪽의 + 버튼을 누르세요.',
        screen: {
          kind: 'chat',
          title: '딸',
          messages: ['엄마 사진 좀 보내 주세요'],
          items: [
            { id: 'plus', label: '+' },
            { id: 'input', label: '메시지 입력' },
            { id: 'send', label: '전송' },
          ],
        },
        target: 'plus',
      },
      {
        instruction: '앨범을 누르세요.',
        screen: {
          kind: 'grid',
          title: '보내기',
          items: [
            { id: 'album', label: '앨범', icon: '🖼️' },
            { id: 'cam', label: '카메라', icon: '📷' },
            { id: 'file', label: '파일', icon: '📁' },
            { id: 'contact', label: '연락처', icon: '👤' },
          ],
        },
        target: 'album',
      },
      {
        instruction: '보낼 사진을 눌러 고르세요.',
        screen: {
          kind: 'grid',
          title: '앨범',
          items: [
            { id: 'p1', label: '손주', icon: '👶' },
            { id: 'p2', label: '꽃', icon: '🌸' },
            { id: 'p3', label: '산', icon: '⛰️' },
            { id: 'p4', label: '밥상', icon: '🍚' },
          ],
        },
        target: 'p1',
      },
      {
        instruction: '전송 버튼을 누르면 끝이에요.',
        screen: {
          kind: 'chat',
          title: '딸',
          messages: ['엄마 사진 좀 보내 주세요', '[사진 1장 선택됨]'],
          items: [
            { id: 'plus', label: '+' },
            { id: 'input', label: '메시지 입력' },
            { id: 'send', label: '전송' },
          ],
        },
        target: 'send',
      },
    ],
  },
  {
    key: 'font-size',
    title: '글자 크게 만들기',
    keywords: ['글자', '글씨', '크게', '작아', '안보', '안 보'],
    tip: '너무 크면 막대를 왼쪽으로 조금 돌리면 돼요.',
    steps: [
      {
        instruction: '설정 앱을 눌러 여세요.',
        screen: home(),
        target: 'settings',
      },
      {
        instruction: '디스플레이를 누르세요.',
        screen: settingsList(),
        target: 'display',
      },
      {
        instruction: '글자 크기와 스타일을 누르세요.',
        screen: {
          kind: 'list',
          title: '디스플레이',
          items: [
            { id: 'bright', label: '밝기', icon: '☀️' },
            { id: 'font', label: '글자 크기와 스타일', icon: '🔠' },
            { id: 'dark', label: '어두운 화면', icon: '🌙' },
          ],
        },
        target: 'font',
      },
      {
        instruction: '+ 쪽을 눌러 글자를 키우세요.',
        screen: {
          kind: 'slider',
          title: '글자 크기',
          items: [
            { id: 'minus', label: '가-' },
            { id: 'plus', label: '가+' },
          ],
        },
        target: 'plus',
      },
    ],
  },
  {
    key: 'wifi',
    title: '와이파이 연결하기',
    keywords: ['와이파이', '와이 파이', 'wifi', '인터넷', '데이터', '연결'],
    tip: '와이파이 비밀번호는 공유기 뒷면에 적혀 있는 경우가 많아요.',
    steps: [
      {
        instruction: '설정 앱을 눌러 여세요.',
        screen: home(),
        target: 'settings',
      },
      {
        instruction: '연결을 누르세요.',
        screen: settingsList(),
        target: 'connections',
      },
      {
        instruction: 'Wi-Fi를 누르세요.',
        screen: {
          kind: 'list',
          title: '연결',
          items: [
            { id: 'wifi', label: 'Wi-Fi', icon: '📶' },
            { id: 'bt', label: '블루투스', icon: '🔵' },
            { id: 'plane', label: '비행기 탑승 모드', icon: '✈️' },
          ],
        },
        target: 'wifi',
      },
      {
        instruction: '우리 집 와이파이 이름을 누르고 비밀번호를 넣으세요.',
        screen: {
          kind: 'list',
          title: 'Wi-Fi',
          items: [
            { id: 'home', label: '우리집_WiFi', icon: '🏠' },
            { id: 'cafe', label: 'Cafe_Free', icon: '☕' },
            { id: 'other', label: 'iptime_5G', icon: '📶' },
          ],
        },
        target: 'home',
      },
    ],
  },
  {
    key: 'video-call',
    title: '영상통화 걸기',
    keywords: ['영상', '화상', '얼굴', '보면서', '통화'],
    tip: '휴대폰을 얼굴 앞에 세워 들면 상대방이 잘 볼 수 있어요.',
    steps: [
      {
        instruction: '전화 앱을 눌러 여세요.',
        screen: home(),
        target: 'phone',
      },
      {
        instruction: '연락처에서 통화할 사람을 누르세요.',
        screen: {
          kind: 'list',
          title: '연락처',
          items: [
            { id: 'son', label: '아들', icon: '👨' },
            { id: 'daughter', label: '딸', icon: '👩' },
            { id: 'clinic', label: '동네병원', icon: '🏥' },
          ],
        },
        target: 'son',
      },
      {
        instruction: '카메라 모양의 영상통화 버튼을 누르세요.',
        screen: {
          kind: 'grid',
          title: '아들',
          items: [
            { id: 'voice', label: '음성통화', icon: '📞' },
            { id: 'video', label: '영상통화', icon: '📹' },
            { id: 'msg', label: '문자', icon: '✉️' },
          ],
        },
        target: 'video',
      },
    ],
  },
  {
    key: 'take-photo',
    title: '사진 찍기',
    keywords: ['찍', '촬영', '카메라', '셀카'],
    tip: '찍기 전에 화면을 한 번 눌러 초점을 맞추면 더 선명해요.',
    steps: [
      {
        instruction: '카메라 앱을 눌러 여세요.',
        screen: home(),
        target: 'camera',
      },
      {
        instruction: '아래 가운데의 둥근 버튼을 누르면 찍혀요.',
        screen: {
          kind: 'camera',
          items: [
            { id: 'gallery', label: '사진첩' },
            { id: 'shutter', label: '찍기' },
            { id: 'flip', label: '전환' },
          ],
        },
        target: 'shutter',
      },
    ],
  },
  {
    key: 'alarm',
    title: '알람 맞추기',
    keywords: ['알람', '깨워', '아침', '시계', '약 먹', '시간 알려'],
    tip: '약 먹는 시간도 알람으로 맞춰 두면 잊지 않아요.',
    steps: [
      {
        instruction: '시계 앱을 눌러 여세요.',
        screen: home(),
        target: 'clock',
      },
      {
        instruction: '+ 버튼을 눌러 새 알람을 만드세요.',
        screen: {
          kind: 'list',
          title: '알람',
          items: [
            { id: 'a1', label: '오전 7:00 (꺼짐)', icon: '⏰' },
            { id: 'add', label: '+ 알람 추가', icon: '➕' },
          ],
        },
        target: 'add',
      },
      {
        instruction: '시간을 고르고 저장을 누르세요.',
        screen: {
          kind: 'grid',
          title: '오전 8:00',
          items: [
            { id: 'cancel', label: '취소', icon: '✖️' },
            { id: 'save', label: '저장', icon: '✔️' },
          ],
        },
        target: 'save',
      },
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
