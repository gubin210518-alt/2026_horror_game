// 입력: 키보드, 마우스(터치 포함), 화면 단추(모바일)
import { VW, VH } from './core.js';

const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'ok', Enter: 'ok', Escape: 'cancel', KeyX: 'cancel', Tab: 'status', KeyI: 'inv', KeyJ: 'journal', KeyM: 'map',
  ShiftLeft: 'run', ShiftRight: 'run',
};
const DIR = { up: 1, down: 1, left: 1, right: 1 };
const codes = new Set(), hit = new Set(), virtual = new Set(); // virtual: 화면 단추로 누르고 있는 동작
let dirs = []; // 눌린 방향 순서. 마지막이 우선
export const mouse = { x: 0, y: 0, down: false, clicked: false };

export const down = a => virtual.has(a) || [...codes].some(c => KEYS[c] === a);
export const pressed = a => hit.has(a);
export const consume = a => hit.delete(a);
export const lastDir = () => dirs[dirs.length - 1];
export function endFrame() { hit.clear(); mouse.clicked = false; }

// 화면 단추(모바일)가 부르는 함수. on: 누름 true, 뗌 false
export function press(a, on) {
  if (on) {
    if (virtual.has(a)) return;
    virtual.add(a); hit.add(a);
    if (a in DIR) dirs = dirs.filter(d => d !== a).concat(a);
  } else {
    virtual.delete(a);
    dirs = dirs.filter(down);
  }
}

export function initInput(canvas) {
  addEventListener('keydown', e => {
    const a = KEYS[e.code];
    if (!a || e.target.tagName === 'INPUT') return;
    e.preventDefault();
    if (codes.has(e.code)) return; // 누르고 있는 동안의 반복 입력은 무시
    codes.add(e.code); hit.add(a);
    if (a in DIR) dirs = dirs.filter(d => d !== a).concat(a);
  });
  addEventListener('keyup', e => {
    codes.delete(e.code);
    dirs = dirs.filter(down);
  });
  addEventListener('blur', () => { codes.clear(); virtual.clear(); dirs = []; mouse.down = false; });
  // 마우스와 터치를 같이 받는다 (pointer 이벤트)
  const move = e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width * VW;
    mouse.y = (e.clientY - r.top) / r.height * VH;
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerdown', e => { move(e); mouse.down = true; mouse.clicked = true; });
  addEventListener('pointerup', () => { mouse.down = false; });
  addEventListener('pointercancel', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}
