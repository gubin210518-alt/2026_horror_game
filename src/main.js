// 시작점: 데이터 불러오기, 타이틀, 게임 루프
import { D, S, VW, VH, hasSave, loadSave, settings } from './engine/core.js';
import { initInput, endFrame } from './engine/input.js';
import { W, enterMap, updateWorld, drawWorld } from './engine/world.js';
import { UI, choose, openOptions, drawUI, font } from './engine/ui.js';
import { startGame } from './engine/events.js';
import { intro } from './minigames/m0.js';
import { music } from './engine/audio.js';
import { pic, preload } from './engine/gfx.js';
import { initTouch, showTouch } from './engine/touch.js';
import './minigames/index.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');

async function title() {
  UI.stack.length = 0; W.map = null; W.busy = 0;
  for (;;) {
    const opts = ['새 게임', ...(hasSave() ? ['이어하기'] : []), '옵션'];
    const o = opts[await choose(opts, { cancel: false, y: 218 })];
    if (o === '옵션') { await openOptions(); continue; }
    if (o === '새 게임') await startGame(D.game.intro ? await intro() : S.name); // 인트로에서 이름을 입력받는다
    else if (loadSave()) await enterMap(S.map, S.x, S.y, S.dir);
    return;
  }
}
UI.hooks.title = title;

// 타이틀 배경: 밤의 학교. 창문 하나만 불이 깜빡인다
function titleBackdrop(t) {
  const bg = D.game.titleImage && pic(D.game.titleImage, false);
  if (bg) { // 그림 파일이 있으면 그것을 깔고, 제목이 읽히게 위쪽을 어둡게 한다
    const k = Math.max(VW / bg.width, VH / bg.height);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(bg, (VW - bg.width * k) / 2, (VH - bg.height * k) / 2, bg.width * k, bg.height * k);
    const shade = ctx.createLinearGradient(0, 0, 0, VH);
    shade.addColorStop(0, 'rgba(0,0,8,.55)'); shade.addColorStop(0.5, 'rgba(0,0,8,.15)'); shade.addColorStop(1, 'rgba(0,0,8,.6)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, VW, VH);
    if (Math.sin(t * 9) * Math.sin(t * 2.3) > 0.5) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, 0, VW, VH); } // 가끔 깜빡인다
    return titleText(t);
  }
  const sky = ctx.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, '#05060f'); sky.addColorStop(1, '#151a2e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#c8c4b0'; ctx.beginPath(); ctx.arc(520, 64, 22, 0, 7); ctx.fill();
  ctx.fillStyle = '#05060f'; ctx.beginPath(); ctx.arc(511, 58, 20, 0, 7); ctx.fill(); // 초승달
  for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.3 * Math.abs(Math.sin(t * 0.5 + i))) + ')'; ctx.fillRect((i * 97) % VW, (i * 53) % 150, 1, 1); }
  ctx.fillStyle = '#080a12'; ctx.fillRect(70, 190, 500, 170); ctx.fillRect(250, 160, 140, 30); // 본관과 중앙 현관
  ctx.fillRect(310, 138, 20, 22);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 14; c++) {
    const lit = r === 1 && c === 10 && Math.sin(t * 9) * Math.sin(t * 2.3) > -0.3;
    ctx.fillStyle = lit ? '#c8b060' : '#11141f'; ctx.fillRect(86 + c * 34, 206 + r * 44, 20, 26);
  }
  ctx.fillStyle = '#04050a'; ctx.fillRect(0, 340, VW, 20);
  titleText(t);
}

function titleText(t) {
  ctx.textAlign = 'center';
  font(ctx, 64, true); ctx.shadowColor = '#a00010'; ctx.shadowBlur = 18 + 6 * Math.sin(t * 2);
  ctx.fillStyle = '#b01020'; ctx.fillText(D.game.title, VW / 2, 108); ctx.shadowBlur = 0;
  font(ctx, 12); ctx.fillStyle = '#777'; ctx.fillText('방향키: 고르기   Space: 선택', VW / 2, VH - 6);
  ctx.textAlign = 'left';
}

let last = 0, loading = [0, 1]; // 불러오는 중이면 [끝난 수, 전체 수]
function loop(t) {
  requestAnimationFrame(loop); // 먼저 예약해서, 한 프레임에 오류가 나도 게임이 멈추지 않게 한다
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  const m = UI.modal;
  m?.update(dt);
  if (W.map && !(m && m.pause !== false)) updateWorld(dt, !m);

  ctx.setTransform(cv.width / VW, 0, 0, cv.height / VH, 0, 0);
  if (W.map) { if (W.picture && UI.modal) W.pictureT = (W.pictureT || 0) + dt; drawWorld(ctx); }
  else if (loading) { // 불러오는 중
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    font(ctx, 13); ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.fillText('불러오는 중…', VW / 2, VH / 2 - 10);
    ctx.fillStyle = '#222'; ctx.fillRect(VW / 2 - 100, VH / 2, 200, 4); ctx.fillStyle = '#b01020'; ctx.fillRect(VW / 2 - 100, VH / 2, 200 * loading[0] / loading[1], 4);
    ctx.textAlign = 'left';
  } else titleBackdrop(t / 1000);
  music(!!W.map && W.chasing);
  drawUI(ctx, dt);
  showTouch(UI.modal?.kind !== 'intro'); // 인트로는 화면을 직접 누르는 장면이라 단추를 숨긴다
  endFrame();
}

async function boot() {
  for (const k of ['game', 'tiles', 'items', 'dialog', 'puzzles', 'rules', 'notes', 'schoolmap']) {
    D[k] = await (await fetch(`data/${k}.json`)).json();
  }
  initInput(cv);
  initTouch();
  requestAnimationFrame(loop);
  // 맵을 모두 받아 두고, 데이터에 적힌 그림 경로를 전부 미리 불러온다 (그림이 뒤늦게 바뀌어 보이지 않게)
  await Promise.all((D.game.maps || []).map(async id => { D.maps[id] = await (await fetch('data/maps/' + id + '.json')).json(); }));
  const urls = [...JSON.stringify(D).matchAll(/assets\/[\w\/.-]+\.(?:png|jpg|jpeg|webp)/g)].map(x => x[0]);
  await preload(urls, (done, total) => { loading = [done, total]; });
  loading = null;
  title();
}
boot();
window.__game = { D, S, W, UI, enterMap, settings }; // 브라우저 자동 테스트용 손잡이
