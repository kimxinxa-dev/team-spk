# 안심 지킴이

프로젝트를 시작하기 전에 [docs/SETUP.md](docs/SETUP.md)를 먼저 읽으세요.

## 프로젝트 개요
- 한 줄 소개: 어르신이 받은 문자·카카오톡 메시지와 QR 코드가 스미싱인지 AI가 쉬운 말로 알려 주는 웹앱 (개발 중)
- 누구를 위한 앱인가: 스마트폰 사기 문자에 취약한 어르신과, 어르신을 돌보는 가족(보호자)
- 어떤 상황에서 쓰는가: 택배·가족 사칭·정부 지원금 등 의심스러운 문자나 카톡을 받았을 때, 전단지·우편물의 QR 코드를 찍기 전에, 글씨를 읽거나 누르기 어려워 말로 앱을 쓰고 싶을 때

## 주요 기능
| 과제의 꼭 있어야 하는 기능 | 화면(프론트엔드) | API(백엔드) |
| --- | --- | --- |
| 1. 문자·카톡 메시지 스미싱 검사와 검사 기록 — 메시지를 붙여 넣으면 위험·주의·안전과 이유를 보여 주고 기록으로 저장, 메모 쓰기·고치기, 기록 지우기 | `/check` (`src/app/(app)/check/`) | Server Action `createMessageScan`·`updateScanMemo`·`deleteScan` (`src/app/(app)/scan-actions.ts`), 판별 규칙 `src/lib/scan/rules.ts` |
| 2. QR 코드 스미싱 검사와 검사 기록 — 카메라로 QR을 찍으면 주소를 열지 않고 먼저 검사해 저장(카메라가 안 되면 직접 입력), 메모·지우기 | `/qr` (`src/app/(app)/qr/`) | Server Action `createQrScan`·`updateScanMemo`·`deleteScan` (`src/app/(app)/scan-actions.ts`) |
| 3. 보호자·연락처 관리 — 가족·보호자 추가·고치기·지우기, 바로 전화 걸기 | `/contacts` (`src/app/(app)/contacts/`) | Server Action `createContact`·`updateContact`·`deleteContact` (`src/app/(app)/contacts/actions.ts`) |

- 현재 상태: 화면·서버 처리·DB 모델 뼈대를 만들고 타입 검사·빌드·로그아웃 상태 접근 차단을 확인했습니다. Supabase 프로젝트를 연결하기 전이라 실제 저장·로그인은 아직 확인하지 않았습니다.
- 로그인(이메일·비밀번호, Supabase Auth)해야 위 화면을 쓸 수 있고, 내 기록·연락처는 나만 보입니다(모든 서버 처리가 로그인 확인 → 입력 검증 → 내 자료인지 확인).

더 만든 기능 (개발 예정): AI 메시지 분석(규칙 판별에 더해 쉬운 말 설명), 음성 도우미 — 말로 검사·QR 찍기를 실행하고, 등록한 연락처로 전화 앱 열기

- 메시지는 붙여 넣거나, 홈 화면에 설치한 앱으로 문자·카톡에서 [공유]해 보낼 수 있게 만들 예정입니다.

## 기술 스택
- 프론트엔드: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Zod(입력 규칙), 브라우저 내장 QR 인식(BarcodeDetector)
- 백엔드: Next.js Server Action, Prisma 7 (`@prisma/adapter-pg`), Supabase Auth (`@supabase/ssr`) 로그인, `src/proxy.ts`에서 로그인 세션 갱신·보호된 화면 접근 차단
- 데이터(어디에, 무엇을): Supabase PostgreSQL (`prisma/schema.prisma`) — `users`(회원, Supabase Auth 사용자 id), `scan_records`(메시지·QR 검사 기록: 내용·위험도·이유·메모), `contacts`(보호자·연락처)

## 실행 방법
<!-- 처음 보는 사람이 그대로 따라 할 수 있게 쓴다. 시작 저장소 그대로라면: npm install → npm run dev → 브라우저에서 http://localhost:3000 -->
1. Node.js 24를 설치하고 저장소를 내려받은 뒤 `npm install`을 실행합니다.
2. `.env.example`을 `.env`로 복사하고 Supabase 값을 넣습니다. 자세한 방법은 [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)를 참고합니다.
   - `DATABASE_URL`(Transaction pooler, 6543), `DIRECT_URL`(Session pooler, 5432)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(공개 키만 — secret 키는 넣지 않음)
   - Supabase → Authentication → Sign In / Providers에서 이메일 확인(Confirm email)을 끕니다(가입 후 바로 로그인).
   - (DB 마이그레이션 적용 방법은 마이그레이션을 만든 뒤 추가합니다.)
3. `npm run dev`를 실행하고 브라우저에서 http://localhost:3000 을 엽니다.

배포 주소(있으면): 아직 없음 (Vercel 배포 예정)

## AI 활용 내역
- 사용한 도구: Claude Code (Claude Opus 5.5)
- 주요 프롬프트(그대로 붙여 넣기):
  - "https://skyman200.github.io/vibe/#/me 이게 해커톤 사이트야 안에 규칙이나 채점방식 볼수있어?"
  - "심사기준에 세부심사기준도 열어서 확인했어?"
  - "일단 해당심사내용을 규칙으로 커밋하고 푸시해줘"
  - "업데이트 될때마다 심사기준에 맞게 readme도 작성해줘"
  - "특히나 우리가 최종물을 만들때 DB나 API관련 보안사고를 특히 조심해달라고 강조하시네"
  - "어르신들 핸드폰 문자스미싱 방지를 할거고 기본적으로 문자와 카톡을 방지하는 기능 부가적인 기능으로 qr코드 스미싱방지랑 음성인식을통해서 핸드폰 기본적인 기능제어 할건데 가능할까?"
  - "웹앱을 기본으로 만들어야한대"
  - "배포는 나중에 할거고 api키는 확인하고 나중에 알려줄게 일단 뼈대 만들어줘"
- AI가 만든 것 / 사람이 고친 것:
  - AI: 대회 사이트의 공개 설정에서 본선 규칙·심사 세부 기준을 찾아 [.agent/hackathon.md](.agent/hackathon.md) 작업 지침으로 정리, README 갱신 규칙 추가, DB·API 보안 사고 방지 점검표(비밀값·Supabase RLS·서버 권한 확인) 작성, 이 README 초안 작성
  - AI: 아이디어를 웹에서 가능한 범위로 검토(웹은 문자함 자동 읽기·휴대폰 설정 제어가 불가 → 공유하기·붙여 넣기 검사, 카메라 QR 검사, 음성으로 앱 기능·전화 앱 열기로 조정)하고 심사 기준에 맞춘 주요 기능 3개를 제안
  - AI: 앱 뼈대 작성 — Supabase Auth 로그인·가입·로그아웃, 보호된 화면 접근 차단(proxy + 서버 재확인), DB 모델(검사 기록·연락처), 검사·메모·삭제와 연락처 추가·수정·삭제 Server Action(로그인·Zod 검증·userId 조건), 규칙 기반 스미싱 판별, 어르신용 큰 글씨 화면 3개와 아래 메뉴, 카메라 QR 인식
  - 사람: 심사 기준 확인 범위(세부 기준까지)를 다시 확인하도록 요청하고, 지침으로 남길 내용과 README 작성 방식을 정함. 운영진이 강조한 DB·API 보안 사고 주의 사항을 전달해 지침에 반영하게 함. 서비스 주제(어르신 스미싱 방지)를 정하고, 안드로이드 앱 대신 웹앱을 기본으로 만들라는 운영진 안내를 확인해 방향을 정함
- 결과를 확인한 방법: 대회 사이트 화면의 심사 기준과 정리한 문서를 비교, `npx prettier --check`로 문서 서식 확인, GitHub 저장소에서 커밋 반영 확인. 뼈대는 `npm run typecheck`·`npm run lint`·`npm run db:validate`·`npm run build` 통과, 예시 사기 문자 5개·QR 5개로 판별 결과 확인, 로그아웃 상태로 `/check`를 열면 `/login`으로 가는지 확인

## 팀원 역할
(이름·학번 없이 역할만)
- 기획: (역할 분담 후 작성)
- 프론트엔드: (역할 분담 후 작성)
- 백엔드: (역할 분담 후 작성)
- 검증: (역할 분담 후 작성)

## 아쉬운 점과 다음에 할 일
- 다음에 할 일: Supabase 연결과 DB 마이그레이션(RLS 켜기 포함) → 실제 로그인·저장·수정·삭제 확인 → AI 메시지 분석 → 기록 나눠 읽기(더 보기) → 음성 도우미 → 공유하기(PWA) → Vercel 배포
