// 화면(React Hook Form)과 서버(Server Action)가 함께 쓰는 입력 규칙.
// 서버 전용 모듈(DB·비밀값)을 import하지 않는다. 로그인·소유자 확인은 서버에서 따로 한다.
import { z } from 'zod';

export const MESSAGE_MAX = 1000;
export const QR_MAX = 2000;
export const MEMO_MAX = 200;

export const authSchema = z.object({
  email: z.email('이메일 형식으로 입력해 주세요.'),
  // 비밀번호는 trim 등으로 바꾸지 않는다.
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상으로 입력해 주세요.')
    .max(72, '비밀번호는 72자 이하로 입력해 주세요.'),
});

export const messageScanSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, '검사할 메시지를 붙여 넣어 주세요.')
    .max(MESSAGE_MAX, `메시지는 ${MESSAGE_MAX}자까지 검사할 수 있습니다.`),
  source: z.enum(['SMS', 'KAKAO', 'OTHER'], '메시지를 받은 곳을 골라 주세요.'),
});

export const qrScanSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'QR 코드 내용이 비어 있습니다.')
    .max(QR_MAX, `QR 내용은 ${QR_MAX}자까지 검사할 수 있습니다.`),
});

export const memoSchema = z.object({
  id: z.uuid('잘못된 기록입니다.'),
  memo: z
    .string()
    .trim()
    .max(MEMO_MAX, `메모는 ${MEMO_MAX}자까지 쓸 수 있습니다.`),
});

export const idSchema = z.object({ id: z.uuid('잘못된 요청입니다.') });

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '이름을 입력해 주세요.')
    .max(20, '이름은 20자까지 쓸 수 있습니다.'),
  // 하이픈·공백을 빼고 숫자만 저장한다.
  phone: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .pipe(
      z
        .string()
        .regex(
          /^0\d{8,10}$/,
          '전화번호를 숫자로 입력해 주세요. 예: 010-1234-5678',
        ),
    ),
  relation: z
    .string()
    .trim()
    .max(10, '관계는 10자까지 쓸 수 있습니다.')
    .optional(),
  isGuardian: z.boolean(),
});

export type ContactInput = z.input<typeof contactSchema>;

// ---- 말로 물어보기·키오스크 연습·문자 지킴이 피드백 ----

/** 배움 노트·연습 기록은 [더 보기]마다 이만큼씩 나눠 읽는다. */
export const LIST_PAGE_SIZE = 10;

export const requestIdSchema = z.uuid('잘못된 요청입니다.');
export const offsetSchema = z.number().int().min(0).max(10_000);
export const memoTextSchema = z
  .string()
  .trim()
  .max(MEMO_MAX, `메모는 ${MEMO_MAX}자까지 쓸 수 있습니다.`);

export const verdictSchema = z.object({
  id: z.uuid('잘못된 기록입니다.'),
  verdict: z.enum(['SCAM', 'SAFE', 'NONE'], '정답을 골라 주세요.'),
});

export const demoScanSchema = z.object({
  sampleId: z.string().min(1).max(20),
});

export const guideSaveSchema = z.object({
  guideKey: z.string().min(1).max(40),
  question: z
    .string()
    .trim()
    .min(2, '질문을 두 글자 이상 넣어 주세요.')
    .max(200),
  requestId: requestIdSchema,
});

export const guideRenameSchema = z.object({
  id: z.uuid('잘못된 요청입니다.'),
  title: z
    .string()
    .trim()
    .min(1, '제목을 넣어 주세요.')
    .max(40, '제목은 40자까지 쓸 수 있습니다.'),
});

export const kioskSaveSchema = z.object({
  kioskType: z.enum(['restaurant', 'hospital', 'train']),
  durationSec: z.number().int().min(1).max(7200),
  mistakes: z.number().int().min(0).max(500),
  stuckStep: z.string().max(30).nullable(),
  requestId: requestIdSchema,
});

export const kioskMemoSchema = z.object({
  id: z.uuid('잘못된 요청입니다.'),
  memo: memoTextSchema,
});
