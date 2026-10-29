/**
 * 체험 화면용 QR 모양 그림. 진짜로 읽히는 QR이 아니라, 내용 글자로 모양만 정해 그린다(같은 내용이면 같은 모양).
 * 실제 QR 인식은 카메라 찍기(BarcodeDetector)가 맡는다.
 */
const SIZE = 21;

function isFinder(x: number, y: number) {
  const inBox = (bx: number, by: number) =>
    x >= bx && x < bx + 7 && y >= by && y < by + 7;
  return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7);
}

function finderOn(x: number, y: number) {
  const lx = x % (SIZE - 7) === x ? x : x - (SIZE - 7);
  const ly = y % (SIZE - 7) === y ? y : y - (SIZE - 7);
  const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6;
  const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
  return ring || core;
}

function cells(content: string) {
  let hash = 2166136261;
  for (const ch of content) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  }
  const on: [number, number][] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (isFinder(x, y)) {
        if (finderOn(x, y)) on.push([x, y]);
        continue;
      }
      hash = Math.imul(hash ^ (x * 31 + y), 16777619);
      if ((hash >>> 13) & 1) on.push([x, y]);
    }
  }
  return on;
}

export function DemoQrImage({ content }: { content: string }) {
  return (
    <svg
      viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
      className="block aspect-square w-full"
      aria-hidden="true"
    >
      <rect x={-2} y={-2} width={SIZE + 4} height={SIZE + 4} fill="#ffffff" />
      {cells(content).map(([x, y]) => (
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
