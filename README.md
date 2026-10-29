# (앱 이름)

프로젝트를 시작하기 전에 [docs/SETUP.md](docs/SETUP.md)를 먼저 읽으세요.

## 프로젝트 개요
- 한 줄 소개: (주제 확정 후 작성 — 진행 중)
- 누구를 위한 앱인가: (주제 확정 후 작성 — 진행 중)
- 어떤 상황에서 쓰는가: (주제 확정 후 작성 — 진행 중)

## 주요 기능
| 과제의 꼭 있어야 하는 기능 | 화면(프론트엔드) | API(백엔드) |
| --- | --- | --- |
| 1. (개발 예정) | | |
| 2. (개발 예정) | | |
| 3. (개발 예정) | | |

더 만든 기능: 아직 없음

## 기술 스택
- 프론트엔드: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, React Hook Form + Zod
- 백엔드: Next.js Server Action·Route Handler, Prisma 7 (`@prisma/adapter-pg`)
- 데이터(어디에, 무엇을): Supabase PostgreSQL — 현재 기본 `User` 모델만 있음 (`prisma/schema.prisma`)

## 실행 방법
<!-- 처음 보는 사람이 그대로 따라 할 수 있게 쓴다. 시작 저장소 그대로라면: npm install → npm run dev → 브라우저에서 http://localhost:3000 -->
1. Node.js 24를 설치하고 저장소를 내려받은 뒤 `npm install`을 실행합니다.
2. DB 기능을 쓰려면 `.env.example`을 `.env`로 복사하고 `DATABASE_URL`(Transaction pooler, 6543)과 `DIRECT_URL`(Session pooler, 5432)에 Supabase 연결 주소를 넣습니다. 자세한 방법은 [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)를 참고합니다.
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
- AI가 만든 것 / 사람이 고친 것:
  - AI: 대회 사이트의 공개 설정에서 본선 규칙·심사 세부 기준을 찾아 [.agent/hackathon.md](.agent/hackathon.md) 작업 지침으로 정리, README 갱신 규칙 추가, DB·API 보안 사고 방지 점검표(비밀값·Supabase RLS·서버 권한 확인) 작성, 이 README 초안 작성
  - 사람: 심사 기준 확인 범위(세부 기준까지)를 다시 확인하도록 요청하고, 지침으로 남길 내용과 README 작성 방식을 정함. 운영진이 강조한 DB·API 보안 사고 주의 사항을 전달해 지침에 반영하게 함
- 결과를 확인한 방법: 대회 사이트 화면의 심사 기준과 정리한 문서를 비교, `npx prettier --check`로 문서 서식 확인, GitHub 저장소에서 커밋 반영 확인

## 팀원 역할
(이름·학번 없이 역할만)
- 기획: (역할 분담 후 작성)
- 프론트엔드: (역할 분담 후 작성)
- 백엔드: (역할 분담 후 작성)
- 검증: (역할 분담 후 작성)

## 아쉬운 점과 다음에 할 일
- 다음에 할 일: 주제와 주요 기능 3개 확정 → 로그인(Supabase Auth) → 주요 기능 CRUD → AI 기능 → Vercel 배포
