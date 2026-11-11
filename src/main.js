// 시작점: 데이터 불러오기, 타이틀, 게임 루프
import { D, S, VW, VH, hasSave, loadSave, settings } from './engine/core.js';
import { initInput, endFrame } from './engine/input.js';
import { W, enterMap, updateWorld, drawWorld } from './engine/world.js';
import { UI, choose, openOptions, drawUI, font } from './engine/ui.js';
import { startGame } from './engine/events.js';
import { intro } from './minigames/m0.js';
import './minigames/index.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');

async function title() {
  UI.stack.length = 0; W.map = null; W.busy = 0;
  for (;;) {
    const opts = ['새 게임', ...(hasSave() ? ['이어하기'] : []), '옵션'];
    const o = opts[await choose(opts, { title: D.game.title, cancel: false })];
    if (o === '옵션') { await openOptions(); continue; }
    if (o === '새 게임') await startGame(D.game.intro ? await intro() : S.name); // 인트로에서 이름을 입력받는다
    else if (loadSave()) await enterMap(S.map, S.x, S.y, S.dir);
    return;
  }
}
UI.hooks.title = title;

let last = 0;
function loop(t) {
  requestAnimationFrame(loop); // 먼저 예약해서, 한 프레임에 오류가 나도 게임이 멈추지 않게 한다
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  const m = UI.modal;
  m?.update(dt);
  if (W.map && !(m && m.pause !== false)) updateWorld(dt, !m);

  ctx.setTransform(cv.width / VW, 0, 0, cv.height / VH, 0, 0);
  if (W.map) drawWorld(ctx);
  else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); font(ctx, 12); ctx.fillStyle = '#444'; ctx.fillText('방향키: 이동  Space: 선택', 16, VH - 14); }
  drawUI(ctx, dt);
  endFrame();
}

async function boot() {
  for (const k of ['game', 'tiles', 'items', 'dialog', 'puzzles', 'rules', 'notes']) {
    D[k] = await (await fetch(`data/${k}.json`)).json();
  }
  initInput(cv);
  requestAnimationFrame(loop);
  title();
}
boot();
window.__game = { D, S, W, UI, enterMap, settings }; // 브라우저 자동 테스트용 손잡이
