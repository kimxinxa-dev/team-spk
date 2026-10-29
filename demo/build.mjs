// 로그인 없이 눌러 보는 시뮬레이션 페이지를 만든다.
// - demo/dist/simulation.html: 파일로 보내거나 바탕화면에서 여는 용도
// - public/simulation.html: 배포 주소의 /simulation.html (npm run build가 함께 만든다)
// 실행: npm run demo:build
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = new URL('.', import.meta.url);
const result = await build({
  entryPoints: [fileURLToPath(new URL('entry.ts', dir))],
  bundle: true,
  format: 'iife',
  globalName: 'Sim',
  minify: true,
  write: false,
});
// 코드 안의 "</script" 글자가 페이지의 script 태그를 끝내지 않도록 바꾼다.
const sim = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(new URL('template.html', dir), 'utf8').replace(
  '/*SIM*/',
  () => sim,
);
mkdirSync(new URL('dist/', dir), { recursive: true });
writeFileSync(new URL('dist/simulation.html', dir), html);
writeFileSync(new URL('../public/simulation.html', dir), html);
console.log(
  'demo/dist/simulation.html 과 public/simulation.html 을 만들었어요.',
);
