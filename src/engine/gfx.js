// 그림 불러오기. 걷기 시트(3칸 x 4줄: 아래, 왼쪽, 오른쪽, 위)와 초상화, 큰 그림.
// game.json actors 에 sheet 경로가 있으면 그 파일을, 없거나 못 읽으면 코드로 그린 시트를 쓴다.
import { D } from './core.js';
import { characterSheet } from './art.js';

const cache = {};
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

export function sheet(name) {
  if (cache[name]) return cache[name];
  const a = D.game.actors?.[name] || {};
  cache[name] = characterSheet(a);
  if (a.sheet) loadKeyed(a.sheet).then(c => { cache[name] = fitSheet(c); }).catch(() => { /* 파일이 없으면 코드로 그린 시트 유지 */ });
  return cache[name];
}

// 그림 한 장(초상화, 액자, 배경 등). 아직 못 읽었거나 파일이 없으면 null
// key 가 true 면 초록 배경을 지운다
const pics = {};
export function pic(url, key = true) {
  if (!(url in pics)) {
    pics[url] = null;
    (key ? loadKeyed(url) : loadImage(url)).then(c => { pics[url] = c; }).catch(() => { /* 파일 없음 */ });
  }
  return pics[url];
}

function loadImage(url) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url; });
}

// #00FF00 배경을 투명하게 지우고, 가장자리에 남은 초록 물을 뺀 캔버스를 돌려준다
export async function loadKeyed(url) {
  const img = await loadImage(url);
  const c = canvas(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], gr = p[i + 1], b = p[i + 2];
    if (gr > 140 && r < 130 && b < 130 && gr > r * 1.4 && gr > b * 1.4) p[i + 3] = 0;
    else if (gr > r && gr > b) p[i + 1] = Math.max(r, b); // 초록이 가장 센 픽셀은 초록을 눌러 준다
  }
  g.putImageData(d, 0, 0);
  return c;
}

// AI가 만든 시트는 칸 안에 여백이 크다. 12칸의 그림 영역을 구해 같은 틀로 잘라 내고,
// 화면에 그릴 크기(키 48px의 2배)로 미리 줄여 둔다.
function fitSheet(src) {
  const cw = src.width / 3, ch = src.height / 4, p = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
  // 칸마다 그림이 차지한 영역을 구한다 (AI 그림은 칸 가운데에서 조금씩 어긋나 있다)
  const cells = Array.from({ length: 12 }, () => ({ x0: 1e9, y0: 1e9, x1: -1, y1: -1 }));
  for (let y = 0; y < src.height; y += 2) for (let x = 0; x < src.width; x += 2) {
    if (p[(y * src.width + x) * 4 + 3] < 40) continue;
    const b = cells[Math.min(3, (y / ch) | 0) * 3 + Math.min(2, (x / cw) | 0)];
    if (x < b.x0) b.x0 = x;
    if (x > b.x1) b.x1 = x;
    if (y < b.y0) b.y0 = y;
    if (y > b.y1) b.y1 = y;
  }
  if (cells.some(b => b.x1 < 0)) return src; // 빈 칸이 있으면 손대지 않는다
  const W = Math.max(...cells.map(b => b.x1 - b.x0)), H = Math.max(...cells.map(b => b.y1 - b.y0));
  const fh = 96, k = fh / H, fw = Math.ceil(W * k) + 2, out = canvas(fw * 3, fh * 4), g = out.getContext('2d');
  g.imageSmoothingQuality = 'high';
  cells.forEach((b, i) => { // 가로는 가운데, 세로는 발끝을 맞춰서 걸을 때 흔들리지 않게 한다
    const sw = b.x1 - b.x0, sh = b.y1 - b.y0, c = i % 3, r = (i / 3) | 0;
    g.drawImage(src, b.x0, b.y0, sw, sh, c * fw + (fw - sw * k) / 2, r * fh + fh - sh * k, sw * k, sh * k);
  });
  return out;
}

// 여러 그림이 격자로 든 시트에서 i번째 칸을 잘라 낸다 (여백 제거). 아직 못 읽었으면 null
const cellCache = {};
export function cell(url, cols, rows, i) {
  const key = url + '#' + i;
  if (key in cellCache) return cellCache[key];
  const src = pic(url);
  if (!src) return null;
  const cw = Math.floor(src.width / cols), ch = Math.floor(src.height / rows), ox = (i % cols) * cw, oy = Math.floor(i / cols) * ch;
  const p = src.getContext('2d').getImageData(ox, oy, cw, ch).data;
  let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
  for (let y = 0; y < ch; y += 2) for (let x = 0; x < cw; x += 2) {
    if (p[(y * cw + x) * 4 + 3] < 40) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const c = canvas(Math.max(1, x1 - x0), Math.max(1, y1 - y0));
  c.getContext('2d').drawImage(src, ox + x0, oy + y0, c.width, c.height, 0, 0, c.width, c.height);
  return (cellCache[key] = c);
}
