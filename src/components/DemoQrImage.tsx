/**
 * 체험 화면용 QR 모양 그림. 진짜로 읽히는 QR이 아니라, 내용 글자로 모양만 정해 그린다(같은 내용이면 같은 모양).
 * 실제 QR 인식은 카메라 찍기(BarcodeDetector)가 맡는다.
 */
import { DEMO_QR_SIZE as SIZE, demoQrCells } from '@/lib/scan/demo-qr';

export function DemoQrImage({ content }: { content: string }) {
  return (
    <svg
      viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
      className="block aspect-square w-full"
      aria-hidden="true"
    >
      <rect x={-2} y={-2} width={SIZE + 4} height={SIZE + 4} fill="#ffffff" />
      {demoQrCells(content).map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill="#18181b"
        />
      ))}
    </svg>
  );
}
