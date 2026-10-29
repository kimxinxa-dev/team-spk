import { PhoneStage } from './PhoneStage';

export const metadata = { title: '안심 지킴이 — 가상 휴대폰' };

/** 첫 화면은 가상 휴대폰. 로그인과 모든 기능은 휴대폰 안 「안심 지킴이」 앱에 있다. */
export default function Home() {
  return <PhoneStage />;
}
