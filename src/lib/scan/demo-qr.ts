// 체험 화면용 QR 모양. 진짜로 읽히는 QR이 아니라 내용 글자로 모양만 정한다.
// 실제 앱(DemoQrImage)과 시뮬레이션(demo/guardian-app.ts)이 함께 쓴다.
export const DEMO_QR_SIZE = 21;
const SIZE = DEMO_QR_SIZE;

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

/** 내용 글자로 정한 QR 모양의 검은 칸 좌표(같은 내용이면 같은 모양) */
export function demoQrCells(content: string) {
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

/** 같은 모양을 SVG 글로 만든다(시뮬레이션처럼 HTML 글로 화면을 그리는 곳에서 쓴다). */
export function demoQrSvg(content: string) {
  const rects = demoQrCells(content)
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1"/>`)
    .join('');
  return `<svg viewBox="-2 -2 ${SIZE + 4} ${SIZE + 4}" aria-hidden="true"><rect x="-2" y="-2" width="${SIZE + 4}" height="${SIZE + 4}" fill="#fff"/><g fill="#18181b">${rects}</g></svg>`;
}
