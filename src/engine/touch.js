// 모바일용 화면 단추: 방향 패드, A(조사), B(취소), 달리기, 메뉴 단추들.
// 터치 기기에서만 만든다. 인트로(마우스로 조작하는 가짜 바탕화면)에서는 숨긴다.
import { press } from './input.js';

let root;
const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function button(label, action, style, toggle) {
  const b = document.createElement('div');
  b.textContent = label;
  Object.assign(b.style, {
    position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', font: 'bold 15px "Malgun Gothic",sans-serif',
    background: 'rgba(20,20,30,.45)', border: '1px solid rgba(255,255,255,.35)', borderRadius: '50%', pointerEvents: 'auto',
    userSelect: 'none', webkitUserSelect: 'none', touchAction: 'none', ...style,
  });
  let on = false;
  const set = v => { on = v; press(action, v); b.style.background = v ? 'rgba(200,170,90,.6)' : 'rgba(20,20,30,.45)'; };
  if (toggle) b.addEventListener('pointerdown', e => { e.preventDefault(); set(!on); }); // 달리기: 누를 때마다 켜고 끈다
  else {
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); set(true); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => set(false));
  }
  return b;
}

export function initTouch() {
  if (!isTouch() || root) return;
  root = document.createElement('div');
  Object.assign(root.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 10 });
  const S = 'min(13vh, 60px)', G = 'min(13.5vh, 62px)'; // 단추 크기와 간격
  const pad = (dx, dy) => ({ width: S, height: S, left: `calc(3vw + ${G} * ${dx})`, bottom: `calc(4vh + ${G} * ${dy})` });
  root.append(
    button('▲', 'up', pad(1, 2)), button('▼', 'down', pad(1, 0)), button('◀', 'left', pad(0, 1)), button('▶', 'right', pad(2, 1)),
    button('A', 'ok', { width: 'min(17vh, 78px)', height: 'min(17vh, 78px)', right: '4vw', bottom: '9vh', fontSize: '20px' }),
    button('B', 'cancel', { width: S, height: S, right: 'calc(4vw + min(19vh, 88px))', bottom: '4vh' }),
    button('달리기', 'run', { width: S, height: S, right: '4vw', bottom: 'calc(9vh + min(19vh, 88px))', fontSize: '11px' }, true),
  );
  [['상태', 'status'], ['가방', 'inv'], ['일기', 'journal'], ['지도', 'map']].forEach(([label, a], i) =>
    root.append(button(label, a, { width: 'min(11vh, 48px)', height: 'min(8vh, 34px)', right: `calc(2vw + min(12vh, 52px) * ${i})`, top: '2vh', borderRadius: '8px', fontSize: '12px' })));
  // 세로로 들고 있으면 안내
  const tip = document.createElement('div');
  tip.textContent = '화면을 가로로 돌려 주세요';
  Object.assign(tip.style, { position: 'absolute', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.85)', color: '#fff', font: '18px "Malgun Gothic",sans-serif', pointerEvents: 'auto' });
  root.append(tip);
  const fit = () => { tip.style.display = innerHeight > innerWidth ? 'flex' : 'none'; };
  addEventListener('resize', fit); fit();
  document.body.append(root);
}

// 인트로처럼 화면을 직접 눌러야 하는 장면에서는 단추를 숨긴다
export function showTouch(v) {
  if (root) for (const b of root.children) if (b.textContent !== '화면을 가로로 돌려 주세요') b.style.visibility = v ? 'visible' : 'hidden';
}
