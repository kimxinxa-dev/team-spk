'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createQrScan } from '../scan-actions';
import { FieldError, FormStatus, SubmitButton } from '@/components/form';
import { INITIAL_RESULT, type ActionResult } from '@/lib/action-result';
import { QR_MAX } from '@/lib/validation';

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

export function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [camera, setCamera] = useState<CameraState>('idle');
  const [content, setContent] = useState('');
  const [result, action] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const next = await createQrScan(prev, formData);
      if (next.ok) setContent('');
      return next;
    },
    INITIAL_RESULT,
  );

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => stopCamera, []);

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
          setContent(codes[0].rawValue.slice(0, QR_MAX));
          // 찍은 주소는 열지 않고 바로 검사만 한다.
          requestAnimationFrame(() => formRef.current?.requestSubmit());
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

  return (
    <div className="mt-5 space-y-5">
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
          disabled={camera === 'starting'}
          className="min-h-14 w-full rounded-2xl bg-blue-700 text-xl font-bold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {camera === 'starting' ? '카메라 켜는 중…' : '📷 카메라로 QR 찍기'}
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

      <form ref={formRef} action={action} className="space-y-4" noValidate>
        <div>
          <label htmlFor="qr-content" className="block text-lg font-semibold">
            QR 코드 내용
          </label>
          <input
            id="qr-content"
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={QR_MAX}
            inputMode="url"
            placeholder="예: https://example.com"
            aria-describedby="qr-content-error"
            className="mt-2 block min-h-12 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 text-lg"
          />
          <FieldError id="qr-content-error" result={result} name="content" />
        </div>
        <FormStatus result={result} />
        <div className="grid">
          <SubmitButton pendingText="검사하는 중…">
            이 주소 검사하기
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
