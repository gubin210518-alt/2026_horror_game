// 그림 불러오기. 걷기 시트(3칸 x 4줄: 아래, 왼쪽, 오른쪽, 위), 초상화, 큰 그림, 아이콘 시트.
// 게임을 시작하기 전에 preload() 로 모두 불러 두므로, 그림이 뒤늦게 바뀌어 보이지 않는다.
import { D } from './core.js';
import { characterSheet } from './art.js';

const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const pics = {}, sheets = {}, cellCache = {};

// 초록 배경(#00FF00)을 지워야 하는 그림인지: 인물, 초상화, game.json 의 greenScreen 목록
const keyed = url => /assets\/(chars|portraits)\//.test(url) || (D.game.greenScreen || []).includes(url);

function loadImage(url) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url; });
}

// #00FF00 배경을 투명하게 지우고, 가장자리에 남은 초록 물을 뺀 캔버스를 돌려준다
async function loadKeyed(url) {
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

function load(url) {
  if (!(url in pics)) pics[url] = (keyed(url) ? loadKeyed(url) : loadImage(url)).then(c => (pics[url] = c), () => (pics[url] = null));
  return pics[url];
}

// 그림 한 장. 아직 못 읽었거나 파일이 없으면 null
export function pic(url) {
  const v = load(url);
  return v instanceof Promise ? null : v;
}

// 인물 걷기 시트. 그림 파일이 없으면 코드로 그린 시트
export function sheet(name) {
  if (sheets[name]) return sheets[name];
  const a = D.game.actors?.[name] || {}, img = a.sheet && pic(a.sheet);
  if (img) return (sheets[name] = fitSheet(img));
  const drawn = characterSheet(a);
  if (!a.sheet || pics[a.sheet] === null) sheets[name] = drawn; // 파일이 없다고 확정된 뒤에만 고정
  return drawn;
}

// 게임 시작 전에 모든 그림을 불러 둔다. onProgress(끝난 수, 전체 수)
export async function preload(urls, onProgress) {
  let done = 0;
  const list = [...new Set(urls)];
  await Promise.all(list.map(u => Promise.resolve(load(u)).then(() => onProgress?.(++done, list.length))));
  for (const id of Object.keys(D.game.actors || {})) sheet(id);
}

// 한 줄(또는 한 칸)에서 그림이 있는 구간들을 찾는다. count 개가 아니면 null
function bands(counts, count, minGap = 4) {
  const runs = [];
  let start = -1, gap = 0;
  for (let i = 0; i <= counts.length; i++) {
    const on = i < counts.length && counts[i] > 0;
    if (on) { if (start < 0) start = i; gap = 0; }
    else if (start >= 0 && (++gap >= minGap || i === counts.length)) { runs.push([start, i - gap + 1]); start = -1; gap = 0; }
  }
  // 떨어진 작은 조각(손전등 불빛 등)은 가까운 큰 구간에 붙인다
  while (runs.length > count) {
    let k = 0;
    for (let i = 1; i < runs.length; i++) if (runs[i][1] - runs[i][0] < runs[k][1] - runs[k][0]) k = i;
    const to = k === 0 ? 1 : k === runs.length - 1 ? k - 1 : (runs[k][0] - runs[k - 1][1] < runs[k + 1][0] - runs[k][1] ? k - 1 : k + 1);
    runs[to] = [Math.min(runs[to][0], runs[k][0]), Math.max(runs[to][1], runs[k][1])];
    runs.splice(k, 1);
  }
  return runs.length === count ? runs : null;
}

// AI가 만든 시트는 칸이 정확한 격자가 아니다. 빈 줄을 찾아 4줄 x 3칸으로 나누고,
// 가로는 가운데, 세로는 발끝을 맞춰 키 48px의 2배 크기로 다시 그린다.
function fitSheet(src) {
  const W = src.width, H = src.height, p = src.getContext('2d').getImageData(0, 0, W, H).data;
  const on = (x, y) => p[(y * W + x) * 4 + 3] > 40;
  const rowCount = new Array(H).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x += 2) if (on(x, y)) rowCount[y]++;
  const rows = bands(rowCount, 4) || [0, 1, 2, 3].map(i => [Math.round(i * H / 4), Math.round((i + 1) * H / 4)]);
  const cells = [];
  for (const [y0, y1] of rows) {
    const colCount = new Array(W).fill(0);
    for (let x = 0; x < W; x++) for (let y = y0; y < y1; y += 2) if (on(x, y)) colCount[x]++;
    const cols = bands(colCount, 3, 12) || [0, 1, 2].map(i => [Math.round(i * W / 3), Math.round((i + 1) * W / 3)]);
    for (const [x0, x1] of cols) { // 칸 안에서 위아래 여백을 다시 잰다
      let t = y1, b = y0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x += 2) if (on(x, y)) { if (y < t) t = y; if (y > b) b = y; }
      cells.push({ x0, x1, y0: Math.min(t, b), y1: Math.max(t, b) + 1 });
    }
  }
  const mw = Math.max(...cells.map(c => c.x1 - c.x0)), mh = Math.max(...cells.map(c => c.y1 - c.y0));
  const fh = 96, k = fh / mh, fw = Math.ceil(mw * k) + 2, out = canvas(fw * 3, fh * 4), g = out.getContext('2d');
  g.imageSmoothingQuality = 'high';
  cells.forEach((c, i) => {
    const sw = c.x1 - c.x0, sh = c.y1 - c.y0;
    g.drawImage(src, c.x0, c.y0, sw, sh, (i % 3) * fw + (fw - sw * k) / 2, Math.floor(i / 3) * fh + fh - sh * k, sw * k, sh * k);
  });
  return out;
}

// 여러 그림이 격자로 든 시트에서 i번째 칸을 잘라 낸다 (여백 제거). 아직 못 읽었으면 null
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

// 아이템 아이콘. items.json 의 icon: "시트이름:번호" (시트는 game.json sheets). 없으면 null
export function itemIcon(id) {
  const spec = D.items[id]?.icon;
  if (!spec) return null;
  const [name, n] = String(spec).split(':'), s = D.game.sheets?.[name];
  return s ? cell(s.url, s.cols, s.rows, +n) : null;
}
