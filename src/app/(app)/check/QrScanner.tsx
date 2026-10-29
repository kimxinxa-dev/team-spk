'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createQrScan, type CheckResult } from '../scan-actions';
import { DemoQrImage } from '@/components/DemoQrImage';
import { VerdictSheet, type VerdictText } from '@/components/VerdictSheet';
import { DEMO_QR_CODES, pickDemoQr } from './samples';
import { QR_MAX, qrScanSchema } from '@/lib/validation';

// 브라우저 내장 QR 인식기(안드로이드 크롬 지원). 지원하지 않으면 직접 입력으로 검사한다.
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (options: {
      formats: string[];
    }) => BarcodeDetectorLike;
  }
}

type CameraState = 'idle' | 'starting' | 'scanning' | 'unsupported' | 'denied';

const DEMO_SCAN_MS = 1800;

const RESULT_TEXT: VerdictText = {
  DANGER: {
    title: '위험한 QR 코드예요',
    advice:
      '이 주소를 열지 마세요. QR을 붙인 곳(가게·기관)에 전화로 먼저 확인하세요.',
  },
  CAUTION: {
    title: '조심해야 할 QR 코드예요',
    advice: '믿을 수 있는 곳에서 붙인 QR인지 확인한 뒤에만 여세요.',
  },
  SAFE: {
    title: '안전해 보이는 QR 코드예요',
    advice: '그래도 돈을 내거나 개인정보를 넣으라고 하면 멈추고 물어보세요.',
  },
};

/** 안전하다고 나온 인터넷 주소만 열 수 있게 한다(열기 전에 꼭 검사를 거친다). */
/** QR 안의 주소에서 사이트 이름(도메인)만 꺼낸다. 주소가 아니면 null. */
function siteOf(content: string) {
  try {
    const url = new URL(content);
    return ['http:', 'https:'].includes(url.protocol) ? url.hostname : null;
  } catch {
    return null;
  }
}

function safeLink(content: string, result: CheckResult | null) {
  if (!result?.ok || result.riskLevel !== 'SAFE') return null;
  try {
    const url = new URL(content);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [camera, setCamera] = useState<CameraState>('idle');
  const [demoIndex, setDemoIndex] = useState<number | null>(null);
  const [demoFound, setDemoFound] = useState(false);
  const [lastDemo, setLastDemo] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [checked, setChecked] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [pending, startTransition] = useTransition();

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(
    () => () => {
      stopCamera();
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  /** 찍은 QR은 열지 않고, 먼저 서버에서 검사·저장한 뒤 결과 창을 띄운다. */
  function check(content: string) {
    setChecked(content);
    setResult(null);
    startTransition(async () => {
      setResult(await createQrScan({ content }));
    });
  }

  const closeResult = useCallback(() => {
    setChecked(null);
    setResult(null);
    setDemoIndex(null);
    setDemoFound(false);
    triggerRef.current?.focus();
  }, []);

  function startDemo() {
    const index = pickDemoQr(lastDemo);
    setLastDemo(index);
    setDemoIndex(index);
    setDemoFound(false);
    timerRef.current = setTimeout(() => {
      setDemoFound(true);
      check(DEMO_QR_CODES[index].content);
    }, DEMO_SCAN_MS);
  }

  async function startCamera() {
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setCamera('unsupported');
      return;
    }
    setCamera('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return stopCamera();
      video.srcObject = stream;
      await video.play();
      setCamera('scanning');

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!streamRef.current) return;
        const codes = await detector.detect(video).catch(() => []);
        if (codes[0]?.rawValue) {
          stopCamera();
          setCamera('idle');
          check(codes[0].rawValue.slice(0, QR_MAX));
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      stopCamera();
      setCamera('denied');
    }
  }

  function submitInput(event: React.FormEvent) {
    event.preventDefault();
    const parsed = qrScanSchema.safeParse({ content: input });
    if (!parsed.success) {
      setInputError(parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.');
      return;
    }
    setInputError(null);
    setInput('');
    check(parsed.data.content);
  }

  const demo = demoIndex === null ? null : DEMO_QR_CODES[demoIndex];
  const busy = pending || demo !== null || camera === 'starting';
  const link = checked ? safeLink(checked, result) : null;

  return (
    <div className="mt-5 space-y-5">
      {/* 체험용 QR 찍기: 카메라 화면처럼 보여 주고, 인식되면 바로 검사한다 */}
      <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-5">
        <p className="text-lg font-semibold text-blue-950">
          QR을 찍으면 어떻게 알려 주는지 체험해 보세요.
        </p>
        <p className="mt-1 text-base text-blue-900">
          체험용 가짜 QR을 찍어 봅니다. 검사 결과는 아래 기록에 저장돼요.
        </p>
        {demo && (
          <div
            role="status"
            aria-live="polite"
            className="relative mt-4 overflow-hidden rounded-2xl bg-zinc-900 p-6"
          >
            <div className="mx-auto max-w-56 rounded-xl bg-white p-3 text-center motion-safe:animate-[qr-sway_2s_ease-in-out_infinite]">
              <p className="text-sm text-zinc-500">{demo.place}</p>
              <p className="text-base font-bold">{demo.title}</p>
              <div className="mt-2">
                <DemoQrImage content={demo.content} />
              </div>
            </div>
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-8 rounded-2xl border-4 ${
                demoFound ? 'border-green-400' : 'border-white/80'
              }`}
            />
            {!demoFound && (
              <div
                aria-hidden="true"
                className="absolute inset-x-10 top-10 h-1 bg-blue-400 motion-safe:animate-[scan-line_1.2s_ease-in-out_infinite_alternate]"
              />
            )}
            <p className="mt-4 text-center text-lg font-semibold text-white">
              {demoFound ? '✅ QR을 인식했어요' : 'QR 코드를 비추는 중…'}
            </p>
          </div>
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={startDemo}
          disabled={busy}
          className="mt-4 min-h-14 w-full rounded-2xl bg-blue-700 text-xl font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
        >
          🧪 체험용 QR 찍어 보기
        </button>
      </div>

      {/* 실제 카메라로 찍기 */}
      <div className="overflow-hidden rounded-2xl bg-zinc-900">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="QR 코드를 비추는 카메라 화면"
          className={
            camera === 'scanning'
              ? 'aspect-square w-full object-cover'
              : 'hidden'
          }
        />
      </div>
      {camera === 'scanning' ? (
        <button
          type="button"
          onClick={() => {
            stopCamera();
            setCamera('idle');
          }}
          className="min-h-14 w-full rounded-2xl border-2 border-zinc-300 bg-white text-xl font-bold"
        >
          카메라 끄기
        </button>
      ) : (
        <button
          type="button"
          onClick={startCamera}
          disabled={busy}
          className="min-h-14 w-full rounded-2xl border-2 border-blue-700 bg-white text-xl font-bold text-blue-800 hover:bg-blue-50 disabled:opacity-60"
        >
          {camera === 'starting'
            ? '카메라 켜는 중…'
            : '📷 카메라로 진짜 QR 찍기'}
        </button>
      )}
      {camera === 'unsupported' && (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 p-4 text-lg text-amber-900"
        >
          이 브라우저는 QR 찍기를 지원하지 않아요. 아래 칸에 QR 주소를 직접 넣어
          검사해 주세요.
        </p>
      )}
      {camera === 'denied' && (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 p-4 text-lg text-amber-900"
        >
          카메라를 쓸 수 없어요. 휴대폰 설정에서 카메라 권한을 허용하거나, 아래
          칸에 직접 넣어 주세요.
        </p>
      )}

      {/* 직접 입력 */}
      <form onSubmit={submitInput} className="space-y-4" noValidate>
        <div>
          <label htmlFor="qr-content" className="block text-lg font-semibold">
            QR 코드 내용 직접 넣기
          </label>
          <input
            id="qr-content"
            name="content"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={QR_MAX}
            inputMode="url"
            placeholder="예: https://example.com"
            aria-invalid={inputError ? true : undefined}
            aria-describedby="qr-content-error"
            className="mt-2 block min-h-12 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 text-lg"
          />
          {inputError && (
            <p
              id="qr-content-error"
              className="mt-1 text-base font-medium text-red-700"
            >
              {inputError}
            </p>
          )}
        </div>
        <div className="grid">
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 rounded-xl bg-blue-700 px-5 text-lg font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? '검사하는 중…' : '이 주소 검사하기'}
          </button>
        </div>
      </form>

      {checked && (pending || result) && (
        <VerdictSheet
          pending={pending}
          pendingText="QR 코드를 검사하는 중…"
          result={result}
          texts={RESULT_TEXT}
          quoteLabel="찍은 QR 내용"
          blockedSite={siteOf(checked) ?? undefined}
          quote={checked}
          extraAction={
            link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-13 items-center justify-center rounded-2xl text-lg font-bold text-blue-700 hover:bg-blue-50"
              >
                이 주소 열기
              </a>
            )
          }
          onClose={closeResult}
        />
      )}
    </div>
  );
}
