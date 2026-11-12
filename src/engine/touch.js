// 모바일용 화면 단추와 화면 배치. 터치 기기에서만 동작한다.
// 가로: 게임 화면을 가운데에 두고 양옆 아래에 단추를 얹는다.
// 세로: 게임 화면을 위에 붙이고, 아래 남는 자리에 단추를 크게 놓는다 (게임 화면을 가리지 않는다).
import { press } from './input.js';

let root, buttons = {}, mode = 'all';
export const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function button(label, action, toggle) {
  const b = document.createElement('div');
  b.textContent = label;
  Object.assign(b.style, {
    position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.9)', font: 'bold 15px "Malgun Gothic",sans-serif',
    background: 'rgba(20,20,30,.32)', border: '1px solid rgba(255,255,255,.3)', borderRadius: '50%', pointerEvents: 'auto',
    userSelect: 'none', webkitUserSelect: 'none', touchAction: 'none', boxSizing: 'border-box',
  });
  let on = false;
  const set = v => { on = v; if (action) press(action, v); b.style.background = v ? 'rgba(200,170,90,.55)' : 'rgba(20,20,30,.32)'; };
  if (toggle) b.addEventListener('pointerdown', e => { e.preventDefault(); set(!on); }); // 달리기: 누를 때마다 켜고 끈다
  else if (action) {
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); set(true); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => set(false));
  }
  return b;
}

// 단추 하나의 자리와 크기 (가운데 좌표)
function at(b, cx, cy, w, h = w, radius = '50%', fontPx) {
  Object.assign(b.style, { left: cx - w / 2 + 'px', top: cy - h / 2 + 'px', width: w + 'px', height: h + 'px', borderRadius: radius });
  if (fontPx) b.style.fontSize = fontPx + 'px';
}

function layout() {
  const canvas = document.getElementById('c'), W = innerWidth, H = innerHeight, portrait = H > W * 1.05;
  let cw, ch, cx, cy; // 게임 화면
  if (portrait) { cw = W; ch = W * 9 / 16; cx = 0; cy = 0; }
  else { ch = Math.min(H, W * 9 / 16); cw = ch * 16 / 9; cx = (W - cw) / 2; cy = (H - ch) / 2; }
  Object.assign(canvas.style, { left: cx + 'px', top: cy + 'px', width: cw + 'px', height: ch + 'px', margin: '0', inset: 'auto' });
  canvas.style.left = cx + 'px'; canvas.style.top = cy + 'px';

  const B = buttons;
  if (portrait) { // 화면 아래 빈 자리에 크게
    const y0 = ch, free = H - y0, s = Math.max(52, Math.min(84, W * 0.19, free * 0.2)), g = s * 1.02;
    const my = y0 + Math.min(34, free * 0.07), mw = (W - 16) / 5 - 6; // 메뉴 줄
    ['status', 'inv', 'journal', 'map', 'full'].forEach((k, i) => at(B[k], 8 + mw / 2 + i * (mw + 6), my, mw, 34, '8px', 13));
    const py = y0 + free * 0.58, px = Math.max(W * 0.27, g + s / 2 + 8); // 왼쪽 단추가 화면 밖으로 나가지 않게
    at(B.up, px, py - g, s); at(B.down, px, py + g, s); at(B.left, px - g, py, s); at(B.right, px + g, py, s);
    at(B.ok, W * 0.8, py + s * 0.15, s * 1.3, s * 1.3, '50%', 22); at(B.cancel, W * 0.6, py + s * 1.05, s); at(B.run, W * 0.84, py - s * 1.25, s, s, '50%', 12);
  } else { // 화면 양옆 아래에 작게. 게임 화면 옆 여백이 있으면 그쪽으로 붙는다
    const s = Math.max(44, Math.min(62, H * 0.155)), g = s * 0.98;
    const px = Math.max(s * 1.6, Math.min(cx + s * 0.9, s * 2.2)), py = H - s * 1.75;
    at(B.up, px, py - g, s); at(B.down, px, py + g, s); at(B.left, px - g, py, s); at(B.right, px + g, py, s);
    const rx = W - Math.max(s * 0.95, Math.min(cx * 0.5 + s * 0.6, s * 1.3));
    at(B.ok, rx, H - s * 1.35, s * 1.25, s * 1.25, '50%', 20); at(B.cancel, rx - s * 1.5, H - s * 0.75, s); at(B.run, rx, H - s * 2.85, s * 0.95, s * 0.95, '50%', 11);
    const mw = Math.min(50, W * 0.07);
    ['full', 'map', 'journal', 'inv', 'status'].forEach((k, i) => at(B[k], W - 8 - mw / 2 - i * (mw + 5), 6 + 15, mw, 30, '8px', 12));
  }
}

export function initTouch() {
  if (!isTouch() || root) return;
  root = document.createElement('div');
  Object.assign(root.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 10 });
  buttons = {
    up: button('▲', 'up'), down: button('▼', 'down'), left: button('◀', 'left'), right: button('▶', 'right'),
    ok: button('A', 'ok'), cancel: button('B', 'cancel'), run: button('달리기', 'run', true),
    status: button('상태', 'status'), inv: button('가방', 'inv'), journal: button('일기', 'journal'), map: button('지도', 'map'),
    full: button('전체', null), // 전체 화면 (되는 브라우저에서만)
  };
  buttons.full.addEventListener('pointerdown', e => {
    e.preventDefault();
    const d = document;
    if (d.fullscreenElement) d.exitFullscreen?.();
    else d.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  });
  root.append(...Object.values(buttons));
  document.body.append(root);
  layout();
  addEventListener('resize', layout);
  addEventListener('orientationchange', () => setTimeout(layout, 200));
}

// 어떤 단추를 보일지: 'all' 전부, 'none' 숨김(인트로, 대화 중에는 화면을 누르면 된다), 'menu' 방향과 A/B만 (메뉴 창이 떠 있을 때)
export function showTouch(m) {
  if (!root || m === mode) return;
  mode = m;
  for (const [k, b] of Object.entries(buttons)) {
    const top = ['status', 'inv', 'journal', 'map', 'full'].includes(k);
    b.style.display = m === 'none' ? 'none' : m === 'menu' && (top || k === 'run') ? 'none' : 'flex';
  }
}
