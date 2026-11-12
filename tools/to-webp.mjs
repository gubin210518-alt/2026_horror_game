// PNG/JPG 한 장을 WebP로 바꿔 넣는다. 화면 없는 브라우저의 canvas 를 쓴다 (서버가 켜져 있어야 한다).
// 실행: node tools/to-webp.mjs <원본> <결과.webp> [--key] [--crop=0.68] [--max=1280]
//   --key  초록 배경(#00FF00)을 지워 투명하게   --crop  위에서부터 남길 세로 비율   --max  최대 가로 픽셀
import { writeFileSync, readFileSync } from 'node:fs';
import { open } from '../test/cdp.mjs';

const [src, out, ...flags] = process.argv.slice(2);
if (!src || !out) { console.log('사용법: node tools/to-webp.mjs <원본> <결과.webp> [--key] [--crop=0.68] [--max=1280]'); process.exit(1); }
const opt = n => flags.find(f => f.startsWith(`--${n}=`))?.split('=')[1];
const key = flags.includes('--key'), crop = +opt('crop') || 1, maxW = +opt('max') || 1280;

const page = await open('http://localhost:8080/');
const mime = /\.jpe?g$/i.test(src) ? 'jpeg' : 'png';
const data = await page.ev(`(async () => {
  const img = new Image(); img.src = 'data:image/${mime};base64,${readFileSync(src).toString('base64')}'; await img.decode();
  const k = Math.min(1, ${maxW} / img.width), sh = img.height * ${crop};
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * k), height: Math.round(sh * k) }), g = c.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, img.width, sh, 0, 0, c.width, c.height);
  if (${key}) { // src/engine/gfx.js 가 불러올 때 하는 초록 지우기와 같은 기준
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], gr = p[i + 1], b = p[i + 2];
      if (gr > 140 && r < 130 && b < 130 && gr > r * 1.4 && gr > b * 1.4) { p[i] = p[i + 1] = p[i + 2] = 0; p[i + 3] = 0; }
      else if (gr > r && gr > b) p[i + 1] = Math.max(r, b);
    }
    g.putImageData(d, 0, 0);
  }
  return c.width + 'x' + c.height + ',' + c.toDataURL('image/webp', ${key} ? 0.92 : 0.86).split(',')[1];
})()`);
const [size, body] = data.split(',');
writeFileSync(out, Buffer.from(body, 'base64'));
console.log(out, size, Math.round(body.length * 0.75 / 1024) + 'KB');
page.close(); process.exit(0);
