'use client';

import { useEffect, useRef, useState } from 'react';
import { VirtualPhone } from '@/lib/phone/engine';
import {
  createGuardianApp,
  type GuardianStore,
} from '@/lib/phone/guardian-app';
import { analyzeScan } from '@/lib/scan/analyze';
import { DEMO_SAMPLES } from './(app)/check/samples';
import {
  phoneAddContact,
  phoneAiScan,
  phoneDeleteContact,
  phoneDeleteScan,
  phoneListContacts,
  phoneListScans,
  phoneSaveScan,
  phoneSession,
  phoneSetVerdict,
  phoneSignIn,
  phoneSignOut,
  phoneSignUp,
} from './phone-actions';

/** 휴대폰 안 안심 지킴이의 저장소: 서버 기능을 그대로 부른다. */
const serverStore: GuardianStore = {
  session: phoneSession,
  signIn: phoneSignIn,
  signUp: phoneSignUp,
  signOut: phoneSignOut,
  listScans: phoneListScans,
  saveScan: phoneSaveScan,
  aiScan: (content) => phoneAiScan({ content }),
  setVerdict: (id, verdict) => phoneSetVerdict({ id, verdict }),
  deleteScan: (id) => phoneDeleteScan({ id }),
  listContacts: phoneListContacts,
  addContact: phoneAddContact,
  deleteContact: (id) => phoneDeleteContact({ id }),
};

/**
 * 첫 화면: 가상 휴대폰 하나가 전부다. 휴대폰 위 작은 막대로 체험 문자(카메라를 켜면 체험 QR)만 받고,
 * 로그인·검사 기록·QR 검사·붙여 넣기 검사·연락처·로그아웃은 휴대폰 안 「안심 지킴이」 앱에서 한다.
 * 주소에 ?app=guardian&view=qr 처럼 적으면 그 화면을 바로 연다(로그인 전이면 로그인 화면부터).
 */
export function PhoneStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<VirtualPhone | null>(null);
  const [mode, setMode] = useState<'sms' | 'qr'>('sms');
  const [sampleId, setSampleId] = useState(DEMO_SAMPLES[0].id);
  const [qrIndex, setQrIndex] = useState(0);
  const [qrLabels, setQrLabels] = useState<string[]>([]);

  useEffect(() => {
    if (!hostRef.current) return;
    const guardian = createGuardianApp({
      analyzeMessage: (text, personal) =>
        analyzeScan('MESSAGE', text, personal),
      analyzeQr: (text) => analyzeScan('QR', text),
      store: serverStore,
    });
    setQrLabels(guardian.qrLabels);
    const phone = new VirtualPhone(hostRef.current, {
      apps: [guardian.app],
      qr: {
        count: guardian.qrCount,
        preview: (i) => guardian.qrPreview(i),
        scan: (i) => guardian.scanQr(i),
      },
      analyze: (text) => analyzeScan('MESSAGE', text, guardian.personal()),
      onEvent: (e) => {
        if (e.type === 'screen') setMode(e.screen === 'camera' ? 'qr' : 'sms');
        if (e.type === 'message-checked')
          guardian.record(e.message.app, e.message.text, e.result);
      },
    });
    phoneRef.current = phone;
    const params = new URLSearchParams(window.location.search);
    if (params.get('app') === 'guardian')
      phone.openApp('guardian', params.get('view') ?? 'main');
    return () => phone.destroy();
  }, []);

  function receive() {
    const phone = phoneRef.current;
    if (!phone) return;
    if (mode === 'qr') return phone.showQr(qrIndex);
    const s = DEMO_SAMPLES.find((x) => x.id === sampleId) ?? DEMO_SAMPLES[0];
    phone.receiveMessage({
      app: s.app === '문자' ? 'sms' : 'messenger',
      from: s.sender,
      text: s.content,
    });
  }

  const qr = mode === 'qr';
  return (
    <main className="phone-stage">
      <h1 className="sr-only">안심 지킴이 — 가상 휴대폰</h1>
      <div
        role="group"
        aria-label={qr ? 'QR 코드 받기' : '문자 받기'}
        className="stage-bar flex w-full items-center gap-1.5 rounded-xl border-2 border-line bg-white p-1.5"
      >
        <label htmlFor="stage-pick" className="sr-only">
          {qr ? '카메라에 비출 QR' : '받아 볼 문자'}
        </label>
        <select
          id="stage-pick"
          value={qr ? String(qrIndex) : sampleId}
          onChange={(e) =>
            qr
              ? setQrIndex(Number(e.target.value))
              : setSampleId(e.target.value)
          }
          className="min-h-[40px] min-w-0 flex-1 rounded-lg border-2 border-line bg-white px-2 text-base"
        >
          {qr
            ? qrLabels.map((l, i) => (
                <option key={l} value={i}>
                  {l}
                </option>
              ))
            : DEMO_SAMPLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
        </select>
        <button
          type="button"
          onClick={receive}
          className="min-h-[40px] rounded-lg bg-navy px-4 text-base font-bold whitespace-nowrap text-white"
        >
          {qr ? 'QR 비추기' : '문자 받기'}
        </button>
      </div>
      <div
        ref={hostRef}
        className="phone-host grid w-full justify-items-center"
      />
    </main>
  );
}
