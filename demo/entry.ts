// 시뮬레이션(미리보기) 페이지에 넣을 코드 묶음. 실제 앱의 채점 AI·안내·키오스크·가상 휴대폰을 그대로 쓴다.
export { analyzeScan } from '../src/lib/scan/analyze';
export { GUIDES, matchGuides } from '../src/lib/guides';
export { SCENARIOS, tipFor } from '../src/app/(app)/kiosk/scenarios';
export { DEMO_SAMPLES } from '../src/app/(app)/check/samples';
export { VirtualPhone } from '../src/lib/phone/engine';
export { createGuardianApp } from './guardian-app';
