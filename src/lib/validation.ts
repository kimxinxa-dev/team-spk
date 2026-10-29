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

/** 가입: 비밀번호를 한 번 더 넣어 잘못 친 비밀번호로 가입하지 않게 한다. */
export const signUpSchema = authSchema
  .extend({ passwordConfirm: z.string() })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 서로 달라요. 다시 확인해 주세요.',
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

// ---- 문자 지킴이: 정답 알려 주기·체험 문자 ----

export const verdictSchema = z.object({
  id: z.uuid('잘못된 기록입니다.'),
  verdict: z.enum(['SCAM', 'SAFE', 'NONE'], '정답을 골라 주세요.'),
});

export const demoScanSchema = z.object({
  sampleId: z.string().min(1).max(20),
});
