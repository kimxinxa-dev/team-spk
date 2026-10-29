// 로그인 없이 눌러 보는 시뮬레이션 페이지(demo/dist/simulation.html)를 만든다.
// 실행: npm run demo:build
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const result = await build({
  entryPoints: [new URL('entry.ts', dir).pathname.replace(/^\/([A-Z]:)/, '$1')],
  bundle: true,
  format: 'iife',
  globalName: 'Sim',
  minify: true,
  write: false,
});
const sim = result.outputFiles[0].text.replace(/<\/script/gi, '<\/script');
const html = readFileSync(new URL('template.html', dir), 'utf8').replace(
  '/*SIM*/',
  () => sim,
);
mkdirSync(new URL('dist/', dir), { recursive: true });
writeFileSync(new URL('dist/simulation.html', dir), html);
console.log('demo/dist/simulation.html 을 만들었어요.');
