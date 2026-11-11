// 코드로 그리는 픽셀 아트: 타일, 물건, 문. 그림 파일 없이도 게임이 볼 만하게 한다.
// 물건은 맵 JSON의 "art" 값, 없으면 "label" 글자로 종류를 정한다 (아래 KIND 표).
import { D, TILE } from './core.js';

const T = TILE;
const rnd = (x, y, i = 0) => { const n = Math.sin(x * 127.1 + y * 311.7 + i * 74.7) * 43758.5453; return n - Math.floor(n); };
const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const mix = (c, k) => { // 색을 밝게(k>0) 또는 어둡게(k<0)
  const n = parseInt(c.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + k * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

// ---------- 타일 ----------
function wood(g, px, py, x, y) {
  R(g, '#4e3c2a', px, py, T, T);
  for (let r = 0; r < 4; r++) {
    const off = ((y * 4 + r) % 2) * 16, yy = py + r * 8;
    for (let s = -1; s <= 1; s++) {
      const sx = px + off + s * 32, k = (rnd(x * 2 + s + (off ? 1 : 0), y * 4 + r) - 0.5) * 0.07;
      const x0 = Math.max(px, sx), x1 = Math.min(px + T, sx + 32);
      if (x1 > x0) { R(g, mix('#58432e', k), x0, yy, x1 - x0, 7); if (sx >= px && sx < px + T) R(g, '#44341f', sx, yy, 1, 7); }
    }
    R(g, '#3a2c1d', px, yy + 7, T, 1);
  }
}
function lino(g, px, py, x, y) {
  R(g, (x + y) % 2 ? '#3d444c' : '#434a52', px, py, T, T);
  R(g, '#2c3238', px, py, T, 1); R(g, '#2c3238', px, py, 1, T);
  for (let i = 0; i < 5; i++) R(g, 'rgba(255,255,255,.035)', px + rnd(x, y, i) * 28, py + rnd(y, x, i) * 28, 3, 1);
}
function metal(g, px, py, x, y, tint) {
  R(g, '#30353a', px, py, T, T);
  for (let i = 0; i < 4; i++) R(g, '#22262a', px, py + 3 + i * 8, T, 2);
  R(g, '#3d4349', px, py, T, 1);
  if (tint) { // 끈적한 점액
    g.fillStyle = tint;
    for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(px + rnd(x, y, i) * 30, py + rnd(y, x, i) * 30, 3 + rnd(x, y, i + 9) * 6, 2 + rnd(x, y, i + 5) * 4, 0, 0, 7); g.fill(); }
  }
}
function wall(g, px, py, x, y, m) {
  const isWall = (xx, yy) => '#w'.includes(m.tiles[yy]?.[xx] ?? '#');
  if (y + 1 < m.h && !isWall(x, y + 1)) { // 아래가 방이면 벽의 앞면이 보인다
    R(g, '#59625a', px, py, T, T);
    for (let i = 0; i < 6; i++) R(g, 'rgba(0,0,0,.06)', px + rnd(x, y, i) * 28, py + rnd(y, x, i) * 16, 4, 2);
    R(g, '#3e4640', px, py + 19, T, 13); R(g, '#2a302c', px, py + 19, T, 1); R(g, '#1f2421', px, py + 29, T, 3);
    R(g, '#6a746b', px, py, T, 2);
    if (rnd(x, y, 3) > 0.8) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(px + 9.5, py + 2); g.lineTo(px + 13.5, py + 9); g.lineTo(px + 11.5, py + 15); g.stroke(); }
  } else { // 벽의 윗면
    R(g, '#14161c', px, py, T, T);
    if (!isWall(x - 1, y)) R(g, '#262a33', px, py, 2, T);
    if (!isWall(x + 1, y)) R(g, '#262a33', px + T - 2, py, 2, T);
    if (y > 0 && !isWall(x, y - 1)) R(g, '#262a33', px, py, T, 2);
  }
}
const FLOOR = { '.': wood, ',': lino, s: lino, _: metal, '~': metal, '%': metal };
const UNDER = { d: '.', B: '.', T: '.', c: ',', '=': '.', A: '.' };

function tile(g, ch, x, y, m) {
  const px = x * T, py = y * T;
  if (ch === '#' || ch === ' ') return ch === '#' ? wall(g, px, py, x, y, m) : R(g, '#000', px, py, T, T);
  if (ch === 'w') { // 창문이 난 벽. 벽 앞면이 보이면 가로 창, 윗면만 보이면 세로로 긴 유리
    wall(g, px, py, x, y, m);
    const face = y + 1 < m.h && !'#w'.includes(m.tiles[y + 1]?.[x] ?? '#');
    if (face) { R(g, '#1c2228', px + 3, py + 3, 26, 15); R(g, '#0b1322', px + 5, py + 5, 22, 11); R(g, 'rgba(140,170,220,.2)', px + 5, py + 5, 4, 11); R(g, '#1c2228', px + 15, py + 5, 2, 11); }
    else { R(g, '#0b1322', px + 11, py, 10, T); R(g, 'rgba(140,170,220,.25)', px + 12, py, 2, T); }
    return;
  }
  if (ch === 'h') { // 가로로 난 유리창: 벽 윗면에 유리 띠. 너머의 방이 보인다
    R(g, '#14161c', px, py, T, T); R(g, 'rgba(120,170,190,.3)', px, py + 9, T, 14); R(g, 'rgba(220,240,250,.45)', px, py + 10, T, 1); R(g, '#3a4a52', px, py + 8, T, 1); R(g, '#3a4a52', px, py + 23, T, 1);
    return;
  }
  if (ch === 'g' || ch === 't') { // 창밖 중정. 어두운 잔디와 나무
    R(g, '#0d1a14', px, py, T, T);
    for (let i = 0; i < 6; i++) R(g, 'rgba(60,110,70,.18)', px + rnd(x, y, i) * 30, py + rnd(y, x, i) * 30, 2, 3);
    if (ch === 't') { g.fillStyle = '#081009'; g.beginPath(); g.arc(px + 16, py + 14, 15, 0, 7); g.fill(); g.fillStyle = '#0f1d12'; g.beginPath(); g.arc(px + 12, py + 10, 8, 0, 7); g.fill(); }
    return;
  }
  (FLOOR[UNDER[ch] || ch] || wood)(g, px, py, x, y, ch === '~' ? 'rgba(120,40,52,.45)' : ch === '%' ? 'rgba(140,38,55,.72)' : null);
  if (ch === 's') for (let i = 0; i < 4; i++) { R(g, '#555b62', px + i * 8, py, 7, T); R(g, '#23272b', px + i * 8 + 7, py, 1, T); }
  if (ch === 'd') { // 학생 책상
    R(g, 'rgba(0,0,0,.3)', px + 4, py + 26, 26, 5);
    R(g, '#8a6a42', px + 3, py + 6, 26, 17); R(g, '#a07c4e', px + 3, py + 6, 26, 3); R(g, '#5e4628', px + 3, py + 21, 26, 3);
    R(g, '#3a3a3e', px + 4, py + 24, 2, 5); R(g, '#3a3a3e', px + 26, py + 24, 2, 5);
  }
  if (ch === 'c') { // 넘어진 의자
    R(g, 'rgba(0,0,0,.3)', px + 5, py + 24, 24, 5);
    R(g, '#7a5a3a', px + 6, py + 8, 20, 14); R(g, '#94704a', px + 6, py + 8, 20, 3); R(g, '#3a3a3e', px + 5, py + 20, 3, 8); R(g, '#3a3a3e', px + 24, py + 6, 3, 10);
  }
  if (ch === 'T') { // 실험대
    R(g, '#2a2e33', px, py + 4, T, 26); R(g, '#6d757d', px, py + 2, T, 18); R(g, '#88919a', px, py + 2, T, 2); R(g, '#454b52', px, py + 20, T, 2);
    if (rnd(x, y) > 0.55) { R(g, '#b8d8e0', px + 12, py + 6, 6, 9); R(g, '#6ab0c0', px + 13, py + 10, 4, 4); }
  }
  if (ch === 'A') { // 미술실 작업대. 물감 얼룩이 있다
    R(g, '#3a2c1c', px, py + 4, T, 26); R(g, '#8a6a44', px, py + 1, T, 22); R(g, '#a0804e', px, py + 1, T, 2); R(g, '#5a4228', px, py + 23, T, 3);
    for (let i = 0; i < 3; i++) R(g, ['#8a3030', '#30508a', '#b0a040', '#407a4a'][Math.floor(rnd(x, y, i) * 4)], px + 3 + rnd(x, y, i + 4) * 24, py + 5 + rnd(y, x, i) * 14, 3, 2);
  }
  if (ch === 'B') { // 책장
    R(g, '#2a1c12', px, py, T, T); R(g, '#3d2a1a', px, py, T, 2);
    for (let r = 0; r < 3; r++) {
      let bx = px + 1;
      for (let i = 0; bx < px + 30; i++) {
        const w = 2 + Math.floor(rnd(x, y * 3 + r, i) * 3), h = 6 + Math.floor(rnd(y, x, i + r) * 3);
        R(g, ['#6a2a2a', '#2a4a6a', '#5a5a2a', '#3a5a3a', '#5a3a5a', '#7a6a4a'][Math.floor(rnd(x + i, y + r, 7) * 6)], bx, py + 3 + r * 10 + (9 - h), w, h);
        bx += w + 1;
      }
      R(g, '#1c120a', px, py + 12 + r * 10, T, 1);
    }
  }
  if (ch === '=') { // 유리벽
    R(g, 'rgba(120,170,190,.28)', px + 12, py, 8, T); R(g, 'rgba(220,240,250,.5)', px + 13, py, 1, T); R(g, '#3a4a52', px + 11, py, 1, T); R(g, '#3a4a52', px + 20, py, 1, T);
  }
}

// 맵 한 장을 통째로 미리 그려 둔다 (움직이지 않는 바닥과 벽)
export function mapLayer(m) {
  if (m._layer) return m._layer;
  const c = Object.assign(document.createElement('canvas'), { width: m.w * T, height: m.h * T }), g = c.getContext('2d');
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) tile(g, m.tiles[y][x] ?? ' ', x, y, m);
  return (m._layer = c);
}

// ---------- 문 ----------
export function door(g, e, open, m) {
  const px = e.x * T, py = e.y * T, side = e.x === 0 || e.x === m.w - 1;
  if (side) { // 옆벽의 문
    R(g, '#0a0a0e', px + 8, py - 2, 16, T + 4); R(g, open ? '#7a5a34' : '#3a2a1c', px + 11, py, 10, T);
    R(g, open ? '#94703f' : '#4a3624', px + 11, py, 10, 2); R(g, '#c8b060', px + 15, py + 14, 2, 4);
  } else {
    R(g, '#0a0a0e', px + 2, py + 2, T - 4, T - 2); R(g, open ? '#7a5a34' : '#3a2a1c', px + 5, py + 5, T - 10, T - 5);
    R(g, open ? '#94703f' : '#4a3624', px + 5, py + 5, T - 10, 2); R(g, 'rgba(160,190,200,.35)', px + 9, py + 9, T - 18, 7); R(g, '#c8b060', px + 21, py + 20, 3, 3);
  }
}

// ---------- 물건 ----------
const KIND = {
  칠판: 'board', 시계: 'clock', '3시': 'clock', 시간표: 'paper', 게시: 'paper', 배치표: 'paper', 안내도: 'paper', 쪽지: 'paper',
  교탁: 'desk', 서랍: 'desk', 책상: 'desk', 사물함: 'lockers', 창: 'window', 창문: 'window', 잉크: 'ink', 열쇠: 'key', 손전등: 'flashlight',
  이젤: 'easel', 물감통: 'paintbox', 책장: 'shelf', 책: 'book', 커튼: 'curtain', 스탠드: 'lamp', 쓰레기: 'trash', 액자: 'frame', 의자: 'chair',
  모형: 'model', 비커: 'beaker', 약품: 'chem', 전시장: 'case', 표본: 'jars', 개수대: 'sink', 환풍구: 'ventcover', 촉수: 'tentacle',
  문: 'doorobj', 제1: 'doorobj', 제2: 'doorobj', 엘레나: 'sister', 마리: 'sister', 로제: 'sister', 이네스: 'sister', 사탕: 'candy', 심장: 'organ',
  작품: 'artboard', 주기율표: 'artboard', 정물: 'still', 화판: 'canvas', 캔버스: 'canvas', 건조대: 'rack', 도구함: 'cabinet', 보관함: 'cabinet',
  망치: 'hammer', 선반: 'shelfbox', 상자: 'crate', 청소도구: 'mop', 조각: 'rubble', 현미경: 'scope', 알코올램프: 'burner', 골격: 'skeleton', 석고상: 'bust', 셔터: 'shutter',
  얼룩: 'stain', 벨: 'bell', 발판: 'plate', 일기장: 'book', 테이프: 'paper', 종이: 'paper', 전등: 'flashlight',
};
const shadow = (g, w, h) => R(g, 'rgba(0,0,0,.28)', 4, h - 6, w - 8, 5);
const DRAW = {
  board(g, w, h) { R(g, '#5a4a30', 2, 5, w - 4, 20); R(g, '#1d4034', 4, 7, w - 8, 16); R(g, 'rgba(255,255,255,.12)', 8, 11, w * 0.4, 1); R(g, 'rgba(255,255,255,.1)', 10, 15, w * 0.25, 1); R(g, '#c8c8c0', w - 16, 21, 6, 2); },
  clock(g) { g.fillStyle = '#d8d4c0'; g.beginPath(); g.arc(16, 15, 9, 0, 7); g.fill(); g.strokeStyle = '#2a2a2a'; g.lineWidth = 1.5; g.stroke(); R(g, '#222', 15.5, 8, 1, 7); R(g, '#222', 15.5, 14.5, 5, 1); g.lineWidth = 1; },
  paper(g) { R(g, '#cfc7a8', 8, 6, 16, 19); R(g, '#a89f80', 8, 6, 16, 1); for (let i = 0; i < 5; i++) R(g, '#6a6450', 10, 10 + i * 3, 9 + (i % 2) * 3, 1); R(g, '#a02020', 15, 5, 2, 2); },
  desk(g, w, h) { shadow(g, w, h); R(g, '#7a5a36', 3, 6, w - 6, 18); R(g, '#96703f', 3, 6, w - 6, 3); R(g, '#523a20', 3, 22, w - 6, 3); R(g, '#3a2a18', 12, 13, 8, 2); },
  lockers(g, w, h) { R(g, '#3d4a56', 0, 2, w, h - 4); for (let x = 0; x < w; x += 8) { R(g, '#55646f', x + 1, 4, 6, h - 9); R(g, '#2a333b', x + 7, 2, 1, h - 4); R(g, '#1a2026', x + 2, 8, 4, 1); R(g, '#1a2026', x + 2, 10, 4, 1); R(g, '#b8b080', x + 5, 16, 1, 3); } },
  window(g, w, h) { R(g, '#2a3138', 3, 2, w - 6, h - 4); R(g, '#0b1322', 6, 5, w - 12, h - 10); R(g, 'rgba(120,150,200,.18)', 6, 5, 3, h - 10); R(g, '#2a3138', 6, h / 2 - 1, w - 12, 2); },
  ink(g) { R(g, 'rgba(0,0,0,.3)', 9, 24, 14, 3); R(g, '#2a2a30', 11, 13, 10, 12); R(g, '#8a0f1e', 12, 17, 8, 7); R(g, '#c8283a', 12, 17, 2, 3); R(g, '#555', 13, 9, 6, 4); },
  key(g) { g.strokeStyle = '#d8b84a'; g.lineWidth = 2; g.beginPath(); g.arc(12, 16, 4, 0, 7); g.stroke(); g.lineWidth = 1; R(g, '#d8b84a', 15, 15, 10, 2); R(g, '#d8b84a', 21, 17, 2, 3); R(g, '#d8b84a', 24, 17, 2, 2); },
  flashlight(g) { R(g, 'rgba(0,0,0,.3)', 6, 22, 20, 3); R(g, '#3a3a40', 7, 13, 14, 7); R(g, '#55555c', 7, 13, 14, 2); R(g, '#c8c060', 21, 11, 5, 11); R(g, '#fff8b0', 24, 13, 2, 7); },
  easel(g) { R(g, '#6a4a2a', 9, 2, 2, 28); R(g, '#6a4a2a', 21, 2, 2, 28); R(g, '#d8d0b8', 6, 5, 20, 17); R(g, '#8a6a6a', 11, 9, 10, 6); R(g, '#6a4a2a', 5, 22, 22, 2); },
  paintbox(g) { R(g, 'rgba(0,0,0,.3)', 6, 25, 20, 3); R(g, '#7a4a22', 6, 14, 20, 12); ['#c03030', '#3060c0', '#d8c840', '#40a050'].forEach((c, i) => R(g, c, 8 + i * 4, 16, 3, 3)); R(g, '#c0c0c8', 22, 5, 2, 12); R(g, '#3a2a1a', 21, 15, 4, 4); },
  shelf(g, w, h) { R(g, '#2a1c12', 0, 2, w, h - 4); for (let r = 0; r < 2; r++) { for (let x = 2; x < w - 3; x += 4) R(g, ['#6a2a2a', '#2a4a6a', '#5a5a2a', '#3a5a3a', '#7a6a4a'][Math.floor(rnd(x, r, w) * 5)], x, 5 + r * 12, 3, 9); R(g, '#1c120a', 0, 14 + r * 12, w, 2); } },
  book(g) { R(g, 'rgba(0,0,0,.3)', 8, 23, 17, 3); R(g, '#8a1420', 8, 10, 16, 14); R(g, '#b02030', 8, 10, 16, 2); R(g, '#e8e0c8', 22, 12, 2, 11); R(g, '#3a0810', 11, 14, 8, 1); },
  curtain(g, w, h) { R(g, '#4a2f4a', 2, 2, w - 4, h - 4); for (let x = 4; x < w - 4; x += 5) R(g, '#3a2238', x, 2, 2, h - 4); R(g, '#6a4a66', 2, 2, w - 4, 3); },
  lamp(g) { R(g, 'rgba(0,0,0,.3)', 9, 26, 14, 3); R(g, '#3a3a40', 15, 13, 2, 13); R(g, '#3a3a40', 11, 25, 10, 2); g.fillStyle = '#d8c060'; g.beginPath(); g.moveTo(9, 14); g.lineTo(23, 14); g.lineTo(20, 5); g.lineTo(12, 5); g.fill(); R(g, 'rgba(255,240,160,.25)', 6, 14, 20, 6); },
  trash(g) { R(g, 'rgba(0,0,0,.25)', 8, 22, 16, 4); g.fillStyle = '#b8b0a0'; g.beginPath(); g.arc(14, 19, 5, 0, 7); g.arc(19, 21, 4, 0, 7); g.fill(); R(g, '#8a8478', 12, 17, 3, 1); R(g, '#8a8478', 17, 21, 3, 1); },
  frame(g, w, h) { R(g, '#6a5226', 4, 3, w - 8, h - 6); R(g, '#8a6c34', 4, 3, w - 8, 2); R(g, '#3a4a44', 7, 6, w - 14, h - 12); R(g, '#586a5a', 7, h - 12, w - 14, 6); R(g, '#c8c8a0', w - 13, 9, 3, 3); },
  chair(g, w, h) { shadow(g, w, h); R(g, '#8a6a44', 8, 12, 16, 12); R(g, '#a07e52', 8, 12, 16, 2); R(g, '#6a4e30', 8, 4, 16, 6); R(g, '#3a3a3e', 8, 24, 2, 5); R(g, '#3a3a3e', 22, 24, 2, 5); },
  model(g) { R(g, 'rgba(0,0,0,.3)', 8, 27, 16, 3); g.fillStyle = '#d0c0a8'; g.beginPath(); g.arc(16, 6, 5, 0, 7); g.fill(); R(g, '#d0c0a8', 10, 11, 12, 15); R(g, '#7a1a1a', 13, 13, 6, 10); R(g, '#3a0a0a', 14, 15, 4, 6); R(g, '#555', 15, 26, 2, 3); },
  beaker(g) { R(g, 'rgba(0,0,0,.25)', 5, 25, 22, 3); for (const [x, hh, c] of [[6, 12, '#6ab0c0'], [14, 16, '#9ac06a'], [22, 10, '#c08a6a']]) { R(g, 'rgba(200,230,240,.5)', x, 25 - hh, 6, hh); R(g, c, x + 1, 25 - hh / 2, 4, hh / 2 - 1); } },
  chem(g) { R(g, '#3a2a1a', 3, 4, 26, 24); R(g, '#241a10', 3, 15, 26, 2); for (let i = 0; i < 5; i++) { R(g, ['#9ab040', '#a06a30', '#6a8ab0', '#b0a040', '#7a3a3a'][i], 5 + i * 5, 8, 4, 7); R(g, ['#6a8ab0', '#9ab040', '#7a3a3a', '#a06a30', '#b0a040'][i], 5 + i * 5, 19, 4, 7); } },
  case(g, w, h) { R(g, '#2a2e33', 3, h - 8, w - 6, 6); R(g, 'rgba(140,180,200,.3)', 4, 2, w - 8, h - 9); R(g, 'rgba(230,245,255,.5)', 6, 3, 2, h - 12); R(g, '#3a4a52', 4, 2, w - 8, 1); },
  jars(g) { R(g, '#3a2a1a', 2, 20, 28, 4); for (let i = 0; i < 3; i++) { R(g, 'rgba(190,210,160,.55)', 4 + i * 9, 8, 7, 12); R(g, ['#5a7a3a', '#7a6a5a', '#6a4a4a'][i], 6 + i * 9, 13, 3, 5); R(g, '#555', 4 + i * 9, 6, 7, 2); } },
  sink(g) { R(g, '#7a868c', 3, 6, 26, 20); R(g, '#3a4448', 7, 10, 18, 12); R(g, '#b0bcc2', 14, 3, 4, 8); R(g, '#1a2024', 15, 15, 2, 2); },
  ventcover(g) { R(g, 'rgba(0,0,0,.4)', 5, 6, 24, 22); R(g, '#3a3e44', 4, 4, 24, 22); for (let i = 0; i < 5; i++) R(g, '#15171a', 7, 7 + i * 4, 18, 2); },
  tentacle(g) { g.strokeStyle = '#7a2a3a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(3, 24); g.quadraticCurveTo(12, 8, 18, 20); g.quadraticCurveTo(24, 28, 29, 16); g.stroke(); g.strokeStyle = '#b05a68'; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1; g.lineCap = 'butt'; },
  doorobj(g) { R(g, '#0a0a0e', 2, 2, 28, 30); R(g, '#5a4020', 5, 5, 22, 27); R(g, '#74542a', 5, 5, 22, 2); R(g, '#3a2812', 8, 9, 16, 8); R(g, '#c8b060', 21, 20, 3, 3); },
  candy(g) { R(g, 'rgba(0,0,0,.25)', 9, 22, 14, 3); g.fillStyle = '#e06a9a'; g.beginPath(); g.arc(16, 17, 5, 0, 7); g.fill(); R(g, '#f0a0c0', 8, 15, 4, 4); R(g, '#f0a0c0', 20, 15, 4, 4); R(g, '#fff', 14, 14, 2, 2); },
  organ(g) { R(g, 'rgba(0,0,0,.3)', 9, 23, 14, 3); g.fillStyle = '#9a2020'; g.beginPath(); g.arc(13, 15, 5, 0, 7); g.arc(19, 15, 5, 0, 7); g.fill(); g.beginPath(); g.moveTo(8, 17); g.lineTo(16, 26); g.lineTo(24, 17); g.fill(); R(g, '#c84040', 11, 12, 2, 2); },
  shutter(g, w, h) { R(g, '#3a3e44', 0, 0, w, h); for (let y = 2; y < h; y += 5) { R(g, '#55595f', 0, y, w, 2); R(g, '#23262a', 0, y + 2, w, 1); } R(g, '#b8a040', w / 2 - 3, h - 8, 6, 5); },
  wallpatch(g, w, h) { R(g, '#14161c', 0, 0, w, h); R(g, '#262a33', 0, 0, 2, h); },
  bust(g) { R(g, 'rgba(0,0,0,.3)', 7, 27, 18, 3); R(g, '#8a8478', 9, 23, 14, 5); R(g, '#d8d2c4', 11, 15, 10, 9); g.fillStyle = '#e4dfd2'; g.beginPath(); g.arc(16, 10, 6, 0, 7); g.fill(); R(g, '#b8b2a4', 13, 9, 2, 2); R(g, '#b8b2a4', 17, 9, 2, 2); R(g, '#c8c2b4', 15, 12, 2, 2); R(g, '#f4f0e6', 12, 5, 4, 2); },
  bustshelf(g, w, h) { R(g, '#3a2c1c', 0, 20, w, 4); for (let x = 6; x < w - 8; x += 20) { R(g, '#d8d2c4', x + 3, 12, 8, 8); g.fillStyle = '#e4dfd2'; g.beginPath(); g.arc(x + 7, 8, 5, 0, 7); g.fill(); R(g, '#b0aa9c', x + 5, 7, 1, 2); R(g, '#b0aa9c', x + 8, 7, 1, 2); } },
  artboard(g, w, h) { R(g, '#6a5630', 2, 4, w - 4, 22); R(g, '#b8ac88', 4, 6, w - 8, 18); for (let x = 7; x < w - 12; x += 14) { R(g, ['#8a5a5a', '#5a6a8a', '#7a8a5a', '#8a7a5a'][(x / 14 | 0) % 4], x, 9, 10, 12); R(g, '#1a1a1a', x + 3, 11, 4, 4); } },
  still(g) { R(g, '#e8e0d0', 6, 16, 20, 3); g.fillStyle = '#a03030'; g.beginPath(); g.arc(12, 13, 4, 0, 7); g.fill(); g.fillStyle = '#b89030'; g.beginPath(); g.arc(19, 13, 4, 0, 7); g.fill(); R(g, '#4a6a9a', 14, 4, 5, 9); R(g, '#6a8aba', 14, 4, 2, 9); },
  canvas(g) { R(g, 'rgba(0,0,0,.3)', 5, 26, 22, 3); R(g, '#8a7450', 6, 8, 18, 19); R(g, '#d8ceb4', 8, 6, 18, 19); R(g, '#b0a688', 8, 6, 18, 1); R(g, '#8a7a7a', 12, 11, 9, 8); },
  rack(g, w, h) { R(g, '#4a4034', 2, 4, w - 4, 24); for (let y = 7; y < 26; y += 5) { R(g, '#2a241c', 4, y + 3, w - 8, 1); R(g, '#c8bea4', 6, y, w - 14, 3); } },
  cabinet(g, w, h) { R(g, '#3a4650', 2, 3, w - 4, 26); R(g, '#52606c', 2, 3, w - 4, 2); for (let x = 2; x < w - 4; x += (w - 4) / 2) { R(g, '#46545f', x + 2, 7, (w - 4) / 2 - 4, 20); R(g, '#b8b080', x + (w - 4) / 2 - 6, 16, 2, 4); } R(g, '#1a2026', w / 2 - 0.5, 5, 1, 24); },
  hammer(g) { R(g, 'rgba(0,0,0,.3)', 7, 22, 18, 3); g.save(); g.translate(16, 16); g.rotate(-0.6); R(g, '#7a5a3a', -2, -9, 4, 20); R(g, '#3a2a1a', -1, -2, 2, 1); R(g, '#3a2a1a', 0, 2, 2, 1); R(g, '#6a7078', -7, -13, 14, 6); R(g, '#8a9098', -7, -13, 14, 2); g.restore(); },
  shelfbox(g, w, h) { R(g, '#3a2c1c', 0, 3, w, 26); R(g, '#241a10', 0, 15, w, 2); for (let x = 3; x < w - 10; x += 14) { R(g, '#7a6440', x, 6, 11, 9); R(g, '#5a4a2e', x, 6, 11, 2); R(g, '#6a5838', x + 2, 19, 10, 8); } },
  crate(g) { R(g, 'rgba(0,0,0,.3)', 4, 27, 24, 3); R(g, '#6a5030', 5, 9, 22, 19); R(g, '#86663e', 5, 9, 22, 3); R(g, '#4a3820', 5, 17, 22, 1); R(g, '#4a3820', 15, 9, 1, 19); },
  mop(g) { R(g, 'rgba(0,0,0,.3)', 6, 27, 20, 3); R(g, '#5a6a72', 8, 17, 12, 11); R(g, '#7a8a92', 8, 17, 12, 2); R(g, '#3a1414', 10, 20, 8, 6); R(g, '#8a7450', 21, 3, 2, 22); R(g, '#b8b0a0', 18, 23, 8, 5); },
  rubble(g) { R(g, 'rgba(0,0,0,.25)', 5, 25, 22, 4); for (const [x, y, w2, h2] of [[7, 20, 7, 6], [15, 18, 8, 8], [11, 14, 6, 5], [20, 23, 5, 4]]) { R(g, '#d8d2c4', x, y, w2, h2); R(g, '#a8a294', x, y + h2 - 2, w2, 2); } R(g, '#1a1a1a', 16, 20, 5, 4); },
  scope(g) { R(g, '#2a2e33', 9, 24, 14, 3); R(g, '#3a3e44', 14, 8, 4, 16); R(g, '#55595f', 11, 6, 6, 5); R(g, '#8a9098', 12, 18, 9, 2); R(g, '#b8d8e0', 13, 20, 6, 2); },
  burner(g) { R(g, 'rgba(180,200,220,.5)', 10, 14, 12, 11); R(g, '#6a8ab0', 11, 19, 10, 5); R(g, '#555', 13, 11, 6, 4); R(g, '#e8a040', 15, 6, 2, 5); R(g, '#f8e080', 15, 8, 2, 2); },
  skeleton(g) { R(g, 'rgba(0,0,0,.3)', 8, 28, 16, 3); R(g, '#555', 15, 4, 2, 25); g.fillStyle = '#e0dccc'; g.beginPath(); g.arc(16, 7, 5, 0, 7); g.fill(); R(g, '#1a1a1a', 13, 6, 2, 2); R(g, '#1a1a1a', 17, 6, 2, 2); for (let i = 0; i < 4; i++) R(g, '#e0dccc', 10, 13 + i * 3, 12, 2); R(g, '#e0dccc', 7, 13, 2, 12); R(g, '#e0dccc', 23, 13, 2, 12); R(g, '#e0dccc', 12, 25, 3, 5); R(g, '#e0dccc', 17, 25, 3, 5); },
  stain(g) { g.fillStyle = '#4a0c0c'; g.beginPath(); g.ellipse(16, 18, 11, 7, 0.3, 0, 7); g.fill(); g.fillStyle = '#2a0606'; g.beginPath(); g.ellipse(13, 17, 5, 3, 0, 0, 7); g.fill(); },
  bell(g) { R(g, '#806020', 11, 10, 10, 10); R(g, '#c0a040', 13, 8, 6, 3); R(g, '#3a2a10', 15, 20, 2, 3); },
  plate(g) { R(g, '#2a4a2a', 4, 4, 24, 24); R(g, '#3a6a3a', 6, 6, 20, 20); },
  sister(g, w, h, o) { // 액자 속 인물 한 명
    const hair = { 엘레나: '#3a2418', 마리: '#6a4a20', 로제: '#7a2a2a', 이네스: '#20242e' }[o.label], dress = { 엘레나: '#5a3a5a', 마리: '#3a4a6a', 로제: '#6a3a3a', 이네스: '#3a5a4a' }[o.label];
    R(g, '#6a5226', 3, 0, 26, 32); R(g, '#1c2420', 6, 2, 20, 28);
    R(g, dress, 9, 20, 14, 10); g.fillStyle = '#d8b898'; g.beginPath(); g.arc(16, 13, 6, 0, 7); g.fill();
    g.fillStyle = hair; g.beginPath(); g.arc(16, 11, 7, Math.PI, 0); g.fill(); R(g, hair, 9, 11, 2, 9); R(g, hair, 21, 11, 2, 9);
    R(g, '#1a1a1a', 13, 13, 2, 2); R(g, '#1a1a1a', 17, 13, 2, 2); R(g, '#8a4a4a', 15, 17, 2, 1);
  },
};

const cache = new Map();
// 물건 하나의 그림(캔버스)을 돌려준다. 모르는 종류면 null
export function objectSprite(o) {
  const kind = o.art || KIND[o.label];
  if (!DRAW[kind]) return null;
  const w = (o.w || 1) * T, h = (o.h || 1) * T, key = `${kind}:${w}:${h}:${kind === 'sister' ? o.label : ''}`;
  if (!cache.has(key)) {
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
    DRAW[kind](c.getContext('2d'), w, h, o);
    cache.set(key, c);
  }
  return cache.get(key);
}

// ---------- 인물 걷기 시트 (3칸 x 4줄, 한 칸 32x48) ----------
// style: boy | girl | guard | red.  game.json actors 의 hair, top, bottom 색을 쓴다
export function characterSheet(a = {}) {
  const fw = 32, fh = 48, c = Object.assign(document.createElement('canvas'), { width: fw * 3, height: fh * 4 }), g = c.getContext('2d');
  const style = a.style || 'boy', skin = style === 'red' ? '#9a1c1c' : style === 'guard' ? '#b8a898' : '#e6c4a0';
  const hair = a.hair || '#1c1a1a', top = a.top || a.color || '#3a4a7a', bottom = a.bottom || '#23252e';
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
    const ox = col * fw, oy = row * fh, step = col === 0 ? -1 : col === 2 ? 1 : 0, side = row === 1 ? -1 : row === 2 ? 1 : 0;
    const P = (color, x, y, w, h) => R(g, color, ox + x, oy + y, w, h);
    const hunch = style === 'red' ? 3 : 0;
    P('rgba(0,0,0,.3)', 9, 44, 14, 3);
    // 다리
    const ly = 35, l1 = step === -1 ? 2 : 0, l2 = step === 1 ? 2 : 0;
    if (style === 'girl') { P(skin, 12, ly + 3, 3, 6 - l2); P(skin, 17, ly + 3, 3, 6 - l1); P('#1a1a1e', 12, ly + 9 - l2, 3, 2); P('#1a1a1e', 17, ly + 9 - l1, 3, 2); }
    else { P(style === 'red' ? skin : bottom, 11, ly, 4, 9 - l2); P(style === 'red' ? skin : bottom, 17, ly, 4, 9 - l1); P(style === 'red' ? '#5a0e0e' : '#15151a', 11, ly + 9 - l2, 4, 2); P(style === 'red' ? '#5a0e0e' : '#15151a', 17, ly + 9 - l1, 4, 2); }
    // 몸
    const ty = 22 + hunch;
    P(style === 'red' ? skin : top, 9, ty, 14, 14 - hunch);
    if (style === 'red') { P('#7a1212', 10, ty + 3, 4, 3); P('#b82a2a', 17, ty + 6, 4, 2); }
    else {
      P(mix(top.startsWith('#') ? top : '#3a4a7a', -0.08), 9, ty + 10, 14, 4 - hunch);
      if (row === 0) { P('#e8e4dc', 14, ty, 4, 6); P(style === 'girl' ? '#a02030' : style === 'guard' ? '#c8b060' : '#23304a', 15, ty + 1, 2, 5); }
    }
    if (style === 'girl') { P(bottom, 8, ty + 11, 16, 6); P(mix(bottom.startsWith('#') ? bottom : '#23252e', 0.06), 8, ty + 11, 16, 1); }
    // 팔
    const armC = style === 'red' ? skin : top, armLen = style === 'red' ? 15 : 11;
    if (side === 0) { P(armC, 6, ty + 1 + (step === 1 ? 1 : 0), 3, armLen); P(armC, 23, ty + 1 + (step === -1 ? 1 : 0), 3, armLen); P(skin, 6, ty + armLen, 3, 2); P(skin, 23, ty + armLen, 3, 2); }
    else { P(armC, 14 + step * 2, ty + 2, 4, armLen); P(skin, 14 + step * 2, ty + 1 + armLen, 4, 2); }
    // 머리
    const hy = 7 + hunch * 2;
    P(skin, 9, hy + 2, 14, 12); P(skin, 10, hy + 1, 12, 14);
    if (style !== 'red') {
      if (row === 3) { P(hair, 8, hy, 16, 13); P(hair, 9, hy - 1, 14, 2); }
      else {
        P(hair, 8, hy, 16, 6); P(hair, 9, hy - 1, 14, 2);
        if (row === 0) { P(hair, 8, hy + 5, 2, 5); P(hair, 22, hy + 5, 2, 5); }
        if (row === 1) P(hair, 16, hy + 4, 8, 9);
        if (row === 2) P(hair, 8, hy + 4, 8, 9);
      }
      if (style === 'girl') { // 긴 머리
        if (row === 3) P(hair, 8, hy + 12, 16, 14);
        else if (row === 0) { P(hair, 7, hy + 8, 3, 17); P(hair, 22, hy + 8, 3, 17); }
        else P(hair, row === 1 ? 17 : 8, hy + 12, 7, 13);
      }
      if (style === 'guard') { P('#1c2a4a', 7, hy - 2, 18, 5); P('#0e1830', 7 + (side === 1 ? 6 : side === -1 ? -3 : 0), hy + 2, side ? 15 : 18, 2); P('#c8b060', 15, hy - 1, 2, 2); }
    } else { P('#7a1212', 11, hy + 1, 5, 3); P('#5a0e0e', 17, hy + 9, 4, 3); }
    // 얼굴
    const eye = style === 'guard' ? '#d02020' : style === 'red' ? '#f0e8e0' : '#1a1a20';
    if (row === 0) { P(eye, 12, hy + 8, 2, 3); P(eye, 18, hy + 8, 2, 3); if (style === 'girl') P('#c06a6a', 15, hy + 12, 2, 1); }
    if (row === 1) P(eye, 10, hy + 8, 2, 3);
    if (row === 2) P(eye, 20, hy + 8, 2, 3);
  }
  return c;
}

// 대화창 초상화: 걷기 시트의 정면 얼굴을 크게 잘라 쓴다
export function portrait(sheet) {
  const fw = sheet.width / 3, fh = sheet.height / 4;
  return { sx: fw + fw * 0.19, sy: fh * 0.1, sw: fw * 0.62, sh: fh * 0.46 };
}

export function actorOf(name) { // 말하는 사람 이름 → 인물 id
  return Object.keys(D.game.actors).find(id => D.game.actors[id].name === name);
}
