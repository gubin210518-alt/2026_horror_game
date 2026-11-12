// 필드: 맵, 충돌, 플레이어 이동, 조사, 숨기, 동행, 추격 AI, 그리기
import { D, S, settings, cond, TILE, VW, VH } from './core.js';
import { down, pressed, consume, lastDir, mouse } from './input.js';
import { run } from './events.js';
import { sfx } from './audio.js';
import { sheet, pic, itemIcon } from './gfx.js';
import { mapLayer, door, objectSprite } from './art.js';
import { openStatus, openInventory, openJournal, openPause, openMap, toast, font, BAG } from './ui.js';

export const DIRS = { down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1] };
const ROW = { down: 0, left: 1, right: 2, up: 3 };
const WALK = 4, RUN = 7; // 초당 타일 수

export const W = {
  map: null, id: null, objs: [], npcs: [], p: null, busy: 0, hidden: null, chasing: false,
  t: 0, shake: 0, flash: 0, flashColor: '#fff', fade: 0, speedMul: 1, breath: false, breathFail: 0,
  timer: null,   // 제한 시간 { left, total, label, end }
  holdObj: null, // 지금 길게 눌러 채우는 물건
  pushCd: 0,
};

const actor = o => Object.assign({ dir: 'down', moving: false, prog: 0, fx: o.x, fy: o.y, anim: 0, spd: WALK }, o);
const vis = o => cond(o.if);
const inside = (o, x, y) => x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1);
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const dirOf = (dx, dy) => (dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up');
const pos = a => (a.moving ? [a.fx + (a.x - a.fx) * a.prog, a.fy + (a.y - a.fy) * a.prog] : [a.x, a.y]);
const tileAt = (x, y) => { const ch = W.map.tiles[y]?.[x] ?? ' '; return W.map.legend?.[ch] || D.tiles[ch] || D.tiles[' ']; };
const exitAt = (x, y) => (W.map.exits || []).find(e => e.x === x && e.y === y);
const spotId = o => W.id + ':' + (o.id || o.x + ',' + o.y);
export const npcById = id => W.npcs.find(n => n.id === id);

function staticBlocked(x, y) {
  const m = W.map;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  if (exitAt(x, y) || tileAt(x, y).solid) return true;
  return W.objs.some(o => o.solid !== false && vis(o) && inside(o, x, y));
}
export function blocked(x, y, who) {
  const e = exitAt(x, y);
  if (e) return !(who === W.p && cond(e.if)); // 문은 열려 있을 때 플레이어만 지나감
  if (staticBlocked(x, y)) return true;
  if (W.npcs.some(n => n !== who && !n.ghost && vis(n) && n.x === x && n.y === y)) return true;
  return who !== W.p && !who?.ghost && W.p.x === x && W.p.y === y;
}

export async function enterMap(id, x, y, dir) {
  if (!D.maps[id]) D.maps[id] = await (await fetch(`data/maps/${id}.json`)).json();
  const m = D.maps[id];
  m.h = m.tiles.length; m.w = Math.max(...m.tiles.map(r => r.length));
  Object.assign(W, { map: m, id, objs: m.objects || [], hidden: null, picture: null, speedMul: m.speed || 1, fade: 0.35, breath: false });
  W.npcs = (m.npcs || []).map(n => actor({ ...n, home: [n.x, n.y] }));
  S.pos ||= {};
  for (const o of W.objs) if (o.push) { // 밀 수 있는 물건은 옮겨 둔 자리를 기억한다
    o.ox ??= o.x; o.oy ??= o.y;
    [o.x, o.y] = S.pos[id + ':' + o.id] || [o.ox, o.oy];
  }
  W.p = actor({ x, y, dir: dir || S.dir || 'down', sprite: 'player' });
  Object.assign(S, { map: id, x, y, dir: W.p.dir });
  syncCompanion();
  if (m.onEnter) await run(m.onEnter);
}

// S.companion 과 화면의 동행 캐릭터를 맞춘다
export function syncCompanion() {
  W.npcs = W.npcs.filter(n => n.ai !== 'follow' || n.id === S.companion);
  if (!S.companion) return;
  let n = npcById(S.companion);
  if (!n) W.npcs.push(n = actor({ id: S.companion, sprite: S.companion, x: W.p.x, y: W.p.y }));
  Object.assign(n, { ai: 'follow', ghost: true, queue: [], if: undefined, event: D.game.companionTalk?.[S.companion] });
}

function startMove(a, dir, spd) {
  const [dx, dy] = DIRS[dir];
  Object.assign(a, { dir, fx: a.x, fy: a.y, x: a.x + dx, y: a.y + dy, moving: true, prog: 0, spd });
}
function stepActor(a, dt) {
  if (a.moving) {
    a.prog += dt * a.spd; a.anim += dt * a.spd;
    if (a.prog < 1) return false;
    a.moving = false;
    return true;
  }
  return false;
}

// 컷신용 강제 이동. path 는 'uuddlr' 같은 문자열. 충돌을 무시한다.
// keep 이 true 면 보던 방향을 유지한 채 움직인다 (뒷걸음질)
export function walk(a, path, spd = WALK, keep = false) {
  return new Promise(res => {
    a.pathKeep = keep;
    a.path = [...path].map(c => ({ u: 'up', d: 'down', l: 'left', r: 'right' }[c])).filter(Boolean);
    a.pathSpd = spd; a.pathDone = res;
    if (!a.path.length) { a.path = null; res(); }
  });
}
function followPath(a) {
  if (!a.path) return false;
  if (a.path.length) { const d = a.dir; startMove(a, a.path.shift(), a.pathSpd); if (a.pathKeep) a.dir = d; }
  else { const done = a.pathDone; a.path = a.pathDone = null; if (a === W.p) Object.assign(S, { x: a.x, y: a.y, dir: a.dir }); done(); }
  return true;
}

export function updateWorld(dt, input) {
  const p = W.p, free = input && !W.busy;
  W.t += dt; W.pictureT = (W.pictureT || 0) + dt;
  for (const k of ['shake', 'pushCd']) W[k] = Math.max(0, W[k] - dt);

  if (W.timer && !W.busy && (W.timer.left -= dt) <= 0) { const end = W.timer.end; W.timer = null; run(end); }

  // 길게 누르기 게이지: 물건 앞에서 조사 버튼을 누르고 있는 동안만 찬다. 떼도 줄지 않는다
  W.holdObj = null;
  if (free && !p.moving && !W.hidden) {
    const [dx, dy] = DIRS[p.dir], o = W.objs.find(o => o.hold && vis(o) && cond(o.hold.if) && inside(o, p.x + dx, p.y + dy));
    if (o) {
      W.holdObj = o;
      const f = o.hold.flag, sec = o.hold.sec * (settings.timingWide ? 0.75 : 1);
      if (down('ok') && (S.flags[f] || 0) < 1 && (S.flags[f] = (S.flags[f] || 0) + dt / sec) >= 1) { S.flags[f] = 1; run(o.hold.done); }
    }
  }

  // 왼쪽 위 가방 단추를 누르면 소지품이 열린다
  if (free && !W.hidden && mouse.clicked && mouse.x >= BAG.x && mouse.x <= BAG.x + BAG.w && mouse.y >= BAG.y && mouse.y <= BAG.y + BAG.h) { openInventory(); return; }
  // 걷는 도중에 누른 키도 놓치지 않는다: 메뉴는 바로 열고, 조사는 잠깐 기억해 둔다
  if (free && !p.path && !W.hidden && menuKeys()) return;
  if (free && pressed('ok') && !W.hidden) { consume('ok'); W.okBuf = 0.25; }
  W.okBuf = Math.max(0, (W.okBuf || 0) - dt);
  if (stepActor(p, dt) && !p.path) arrive();
  // 방금 밟은 칸에서 이벤트가 시작됐으면(W.busy) 이번 프레임에는 더 움직이지 않는다
  if (!p.moving && !followPath(p) && free && !W.busy) { if (W.hidden) hiddenInput(); else control(); }

  for (const n of W.npcs) {
    if (!vis(n)) continue;
    stepActor(n, dt);
    if (!n.moving && !followPath(n)) think(n, dt);
  }
  W.chasing = W.npcs.some(n => vis(n) && (n.mode === 'chase' || n.ai === 'hunter'));

  // 숨 참기: 숨은 상태에서 괴이가 2칸 안에 오면 조사 버튼을 누르고 있어야 한다
  const near = W.hidden && W.npcs.find(n => vis(n) && (n.ai === 'guard' || n.ai === 'hunter') && dist(n, p) <= 2);
  W.breath = !!near;
  if (near && free) {
    if (down('ok')) W.breathFail = 0;
    else if ((W.breathFail += dt) > (settings.timingWide ? 2 : 0.7)) {
      W.hidden = null; near.mode = 'chase'; near.last = [p.x, p.y];
      sfx('alert'); toast('들켰다!');
    }
  }

  if (!W.busy) {
    const m = W.map;
    if (m.dark && !S.flags.light) S.sanity -= dt * 0.8;
    else if (m.lit && !p.moving && !W.chasing) S.sanity = Math.min(100, S.sanity + dt * 1.5);
    if (S.sanity <= 40 && Math.random() < dt / 7) sfx('step', 0.6); // 환청 발소리
    if (S.sanity <= 0) { S.sanity = 0; run([{ die: '정신을 잃었다.' }]); }
  }
}

function arrive() {
  const p = W.p;
  Object.assign(S, { x: p.x, y: p.y, dir: p.dir });
  if (W.busy) return;
  const e = exitAt(p.x, p.y);
  if (e) { sfx('door'); run([{ goto: e.to, x: e.tx, y: e.ty, dir: e.dir || p.dir }]); return; }
  const o = W.objs.find(o => o.touch && vis(o) && inside(o, p.x, p.y));
  if (o) run(o.event);
}

function menuKeys() {
  const open = pressed('status') ? openStatus : pressed('inv') ? openInventory : pressed('journal') ? openJournal : pressed('cancel') ? openPause
    : pressed('map') && S.flags.map ? openMap : null;
  if (open) open();
  return !!open;
}

function control() {
  const p = W.p;
  if (W.okBuf > 0) { W.okBuf = 0; return interact(); }
  const d = lastDir();
  p.running = false;
  if (!d) return;
  p.dir = d;
  const [dx, dy] = DIRS[d];
  if (blocked(p.x + dx, p.y + dy, p)) return tryPush(p.x + dx, p.y + dy, dx, dy);
  p.running = down('run') && !W.map.noRun;
  const from = [p.x, p.y];
  startMove(p, d, (p.running ? RUN : WALK) * W.speedMul * (tileAt(p.x, p.y).slow || 1));
  if (p.running) sfx('step'); // 달리기는 소리가 난다
  for (const n of W.npcs) if (n.ai === 'follow') n.queue.push(from);
}

// 쯔꾸르식 밀기: 밀 수 있는 물건 쪽으로 걸으면 한 칸 밀린다
function tryPush(x, y, dx, dy) {
  const o = W.objs.find(o => o.push && vis(o) && inside(o, x, y));
  if (!o || W.pushCd > 0 || blocked(x + dx, y + dy, o)) return;
  o.x += dx; o.y += dy; W.pushCd = 0.25; sfx('step');
  S.pos[W.id + ':' + o.id] = [o.x, o.y];
  S.flags[o.id + '_x'] = o.x; S.flags[o.id + '_y'] = o.y; // 조건식에서 "책상_x==3" 처럼 쓸 수 있게
  if (W.map.onPush) run(W.map.onPush);
}

function interact() {
  const p = W.p, [dx, dy] = DIRS[p.dir], fx = p.x + dx, fy = p.y + dy;
  // 눈앞의 인물 → 눈앞의 물건 → 발밑의 물건 → 잠긴 문 → 같은 칸에 겹친 동행 순서로 찾는다
  const n = W.npcs.find(n => vis(n) && n.event && n.x === fx && n.y === fy);
  if (n) { n.dir = dirOf(-dx, -dy); return void run(n.event); }
  const o = W.objs.find(o => vis(o) && inside(o, fx, fy)) || W.objs.find(o => vis(o) && o.solid === false && inside(o, p.x, p.y));
  if (o) {
    if (o.hide) return hide(o);
    if (o.hold && cond(o.hold.if)) return; // 길게 누르는 물건은 게이지로 처리
    if (o.event) return void run(o.event);
  }
  const e = exitAt(fx, fy);
  if (e && !cond(e.if)) { sfx('locked'); return void run(e.event || [e.locked || '잠겨 있다.']); }
  const g = W.npcs.find(n => vis(n) && n.event && n.ghost && n.x === p.x && n.y === p.y);
  if (g) run(g.event);
}

function hide(o) {
  const id = spotId(o), h = S.hide;
  if (h.id === id) h.n++; else { h.id = id; h.n = 1; }
  W.hidden = o; W.breathFail = 0; sfx('door');
  for (const n of W.npcs) if (n.mode === 'chase' && sees(n)) n.sawHide = true; // 보는 앞에서 숨으면 소용없다
}
function hiddenInput() {
  if (pressed('cancel') || (!W.breath && lastDir())) { consume('cancel'); W.hidden = null; sfx('door'); } // Space는 숨 참기 전용
}

// 시야: 거리 안이고 사이에 벽이 없으면 보인다
function sees(n) {
  const p = W.p;
  if (dist(n, p) > (n.sight || 6)) return false;
  const steps = Math.max(Math.abs(p.x - n.x), Math.abs(p.y - n.y));
  for (let i = 1; i < steps; i++) {
    const x = Math.round(n.x + (p.x - n.x) * i / steps), y = Math.round(n.y + (p.y - n.y) * i / steps);
    if (tileAt(x, y).solid) return false;
  }
  return true;
}

// 너비 우선 탐색으로 목표까지의 다음 한 칸을 구한다
function nextStep(a, tx, ty) {
  const w = W.map.w, key = (x, y) => y * w + x, start = key(a.x, a.y);
  const prev = new Map([[start, -1]]), q = [[a.x, a.y]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) {
      let k = key(x, y);
      if (k === start) return null;
      while (prev.get(k) !== start) k = prev.get(k);
      return [k % w, (k / w) | 0];
    }
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k) || (!(nx === tx && ny === ty) && staticBlocked(nx, ny))) continue;
      prev.set(k, key(x, y)); q.push([nx, ny]);
    }
  }
  return null;
}
function goTo(n, tx, ty, spd) {
  const s = nextStep(n, tx, ty);
  if (!s) return false;
  const d = dirOf(s[0] - n.x, s[1] - n.y);
  if (blocked(s[0], s[1], n)) n.dir = d; else startMove(n, d, spd);
  return true;
}

function caught(n) {
  if (!W.busy) run(n.onCatch || [{ die: '붙잡혔다.' }]);
}

// 괴이 AI. guard: 순찰 → 소리 조사 → 추격 → 수색 → 복귀. hunter: 항상 추격.
function think(n, dt) {
  const p = W.p;
  if (n.ai === 'follow') {
    if (!n.queue.length) return;
    const [tx, ty] = n.queue.shift(), dx = tx - n.x, dy = ty - n.y;
    if (Math.abs(dx) + Math.abs(dy) === 1) startMove(n, dirOf(dx, dy), Math.max(p.spd, WALK) * (n.queue.length ? 1.6 : 1));
    else Object.assign(n, { x: tx, y: ty });
    return;
  }
  if (W.busy || (n.ai !== 'guard' && n.ai !== 'hunter')) return;
  if ((n.stun = (n.stun || 0) - dt) > 0) return;

  const d = dist(n, p), saw = !W.hidden && sees(n);
  const chaseSpd = n.chase || 5.5, walkSpd = n.speed || 2.2;
  if (saw) S.sanity = Math.max(0, S.sanity - (n.fear ?? 2) * dt);

  if (n.ai === 'hunter') {
    if (!W.hidden || n.sawHide) n.last = [p.x, p.y];
    if (d <= 1 && (!W.hidden || n.sawHide)) return caught(n);
    if (n.clumsy) { // 넘어진 의자가 바로 앞에 있으면 부딪혀서 잠깐 멈춘다
      const [dx, dy] = DIRS[n.dir], k = (n.x + dx) + ',' + (n.y + dy);
      if (W.map.tiles[n.y + dy]?.[n.x + dx] === 'c' && n.bumped !== k) { n.bumped = k; n.stun = 0.5; sfx('step'); W.shake = 0.15; return; }
    }
    if (n.last) goTo(n, n.last[0], n.last[1], walkSpd);
    return;
  }

  n.mode ||= 'patrol';
  if (n.mode !== 'chase' && saw) { n.mode = 'chase'; n.sawHide = false; sfx('alert'); }
  if (n.mode === 'patrol') {
    if (!W.hidden && p.moving && p.running && d <= (n.hear || 9)) { n.mode = 'investigate'; n.last = [p.x, p.y]; return; }
    const r = n.route;
    if (!r?.length) return;
    const [tx, ty] = r[n.ri = (n.ri || 0) % r.length];
    if (n.x === tx && n.y === ty) { n.ri = (n.ri + 1) % r.length; n.stun = 0.5; }
    else if (!goTo(n, tx, ty, walkSpd)) n.ri = (n.ri + 1) % r.length;
  } else if (n.mode === 'investigate') {
    if (!goTo(n, n.last[0], n.last[1], walkSpd * 1.4)) { n.mode = 'search'; n.timer = 3; n.checked = false; }
  } else if (n.mode === 'chase') {
    if (saw || n.sawHide || (!W.hidden && d <= 2)) n.last = [p.x, p.y];
    if (d <= 1 && (!W.hidden || n.sawHide)) return caught(n);
    if (!goTo(n, n.last[0], n.last[1], chaseSpd)) { n.mode = 'search'; n.timer = 4; n.checked = false; }
  } else if (n.mode === 'search') {
    // 같은 곳에 3번 연속 숨었다면 그곳부터 확인한다
    const fav = !n.checked && S.hide.n > 3 && W.objs.find(o => o.hide && spotId(o) === S.hide.id);
    if (fav) {
      if (Math.abs(fav.x - n.x) + Math.abs(fav.y - n.y) <= 1 || !goTo(n, fav.x, fav.y, walkSpd * 1.4)) {
        n.checked = true;
        if (W.hidden === fav) { W.hidden = null; return caught(n); }
      }
    } else if ((n.timer -= dt) <= 0) { n.mode = 'patrol'; n.sawHide = false; }
  }
}

// 플레이어가 바라보는 칸에 있는, 조사할 수 있는 것의 이름과 위치
function facing() {
  const p = W.p;
  if (p.moving) return null;
  const [dx, dy] = DIRS[p.dir], fx = p.x + dx, fy = p.y + dy;
  const n = W.npcs.find(n => vis(n) && n.event && !n.ghost && n.x === fx && n.y === fy);
  if (n) return { text: D.game.actors[n.sprite || n.id]?.name || '?', x: fx, y: fy - 1 };
  const o = W.objs.find(o => vis(o) && !o.invisible && inside(o, fx, fy) && (o.event || o.hide || o.hold));
  if (o && o.label) return { text: o.label + (o.hide ? ' (숨기)' : ''), x: fx, y: fy };
  const e = exitAt(fx, fy);
  return e && !cond(e.if) ? { text: '잠긴 문', x: fx, y: fy } : null;
}

// 과학실 인체 모형: 넣은 장기가 바로 보이도록 모형 그림 위에 장기 그림을 얹는다
let modelCv;
function liveModel() {
  const pz = D.puzzles.m6, img = pic(pz.image);
  if (!img) return null;
  const key = S.placed.join(',');
  if (modelCv && modelCv.key === key) return modelCv;
  const hh = 220, ww = Math.round(img.width * hh / img.height), c = Object.assign(document.createElement('canvas'), { width: ww, height: hh }), g = c.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, ww, hh);
  const kind = id => D.items[id].organ || id;
  for (const s of pz.slots) {
    const id = S.placed.filter(p => kind(p) === s.id)[pz.slots.filter(t => t.id === s.id).indexOf(s)], ic = id && itemIcon(id);
    if (ic) { const k = s.size * ww / Math.max(ic.width, ic.height); g.drawImage(ic, s.fx * ww - ic.width * k / 2, s.fy * hh - ic.height * k / 2, ic.width * k, ic.height * k); }
  }
  c.key = key;
  return (modelCv = c);
}

const onTable = o => !o.w && !o.h && 'TA'.includes(W.map.tiles[o.y]?.[o.x]);

// ---------- 그리기 ----------
let darkCv;
export function drawWorld(ctx) {
  const m = W.map, p = W.p, [ppx, ppy] = pos(p), mw = m.w * TILE, mh = m.h * TILE;
  const clamp = (v, max) => (max <= 0 ? max / 2 : Math.max(0, Math.min(max, v)));
  let cx = clamp(ppx * TILE + 16 - VW / 2, mw - VW), cy = clamp(ppy * TILE + 16 - VH / 2, mh - VH);
  if (W.shake > 0 && settings.shake) { cx += (Math.random() - 0.5) * 8; cy += (Math.random() - 0.5) * 8; }
  cx = Math.round(cx * 2) / 2; cy = Math.round(cy * 2) / 2;

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  ctx.save(); ctx.translate(-cx, -cy); ctx.imageSmoothingEnabled = false;

  ctx.drawImage(mapLayer(m), 0, 0);
  for (const e of m.exits || []) door(ctx, e, cond(e.if), m);
  font(ctx, 10); ctx.textAlign = 'center';
  for (const o of W.objs) {
    if (!vis(o) || o.invisible) continue;
    const w = (o.w || 1) * TILE, h = (o.h || 1) * TILE, ox = o.x * TILE, oy = o.y * TILE;
    const img = o.live ? liveModel() : o.img && pic(o.img), spr = img || o.actorIn ? null : objectSprite(o);
    if (o.actorIn) { // 유리 전시장 안에 인물이 서 있다
      const s = sheet(o.actorIn), fw = s.width / 3, fh = s.height / 4, dh = h - 14, dw = fw * dh / fh;
      ctx.fillStyle = '#1c2228'; ctx.fillRect(ox + 2, oy + 2, w - 4, h - 4);
      ctx.fillStyle = '#2a3238'; ctx.fillRect(ox + 4, oy + 4, w - 8, h - 12);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(s, fw, 0, fw, fh, ox + (w - dw) / 2, oy + 5, dw, dh); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = 'rgba(150,200,220,.16)'; ctx.fillRect(ox + 4, oy + 4, w - 8, h - 12);
      ctx.fillStyle = 'rgba(230,245,255,.4)'; ctx.fillRect(ox + 6, oy + 6, 2, h - 18);
      ctx.fillStyle = '#3a4448'; ctx.fillRect(ox + 2, oy + h - 8, w - 4, 6);
    } else if (img && o.fit) { // 벽에 건 그림: 물건 자리에 꽉 채운다
      ctx.imageSmoothingEnabled = true; ctx.drawImage(img, ox + 3, oy + 4, w - 6, h - 8); ctx.imageSmoothingEnabled = false;
    } else if (img) { // 그림 파일이 있는 물건: 높이 ih 타일에 맞춰 줄이고 바닥을 맞춘다
      const dh = (o.ih || 1.5) * TILE, dw = img.width * dh / img.height;
      ctx.imageSmoothingEnabled = true; ctx.drawImage(img, ox + (w - dw) / 2, oy + h - dh, dw, dh); ctx.imageSmoothingEnabled = false;
    } else if (spr) ctx.drawImage(spr, o.x * TILE, o.y * TILE + (onTable(o) ? -9 : 0)); // 실험대나 작업대 위의 물건은 상판 높이에 맞춘다
    else { // 그림이 없는 종류는 색 상자와 글자로
      ctx.fillStyle = o.color || '#7a6048'; ctx.fillRect(o.x * TILE + 3, o.y * TILE + 3, w - 6, h - 6);
      if (o.label) { ctx.fillStyle = '#fff'; ctx.fillText(o.label, o.x * TILE + w / 2, o.y * TILE + h / 2 + 4); }
    }
  }
  ctx.textAlign = 'left';

  // 정신력 20 이하: 가짜 아이템이 보인다
  if (S.sanity <= 20) {
    const seed = (W.t / 5) | 0;
    for (let i = 0; i < 3; i++) {
      const x = (seed * 7 + i * 13) % m.w, y = (seed * 5 + i * 11) % m.h;
      if (!staticBlocked(x, y)) { ctx.fillStyle = i ? '#b01030' : '#d8c070'; ctx.fillRect(x * TILE + 11, y * TILE + 11, 10, 10); }
    }
    const words = D.dialog.fake || []; // 가짜 낙서
    if (words.length) {
      font(ctx, 12, true); ctx.fillStyle = 'rgba(170,20,30,.75)';
      for (let i = 0; i < 2; i++) ctx.fillText(words[(seed + i * 3) % words.length], ((seed * 11 + i * 17) % Math.max(1, m.w - 3)) * TILE, ((seed * 3 + i * 7) % m.h) * TILE + 20);
    }
  }

  const actors = [...W.npcs.filter(vis), ...(W.hidden ? [] : [p])].sort((a, b) => pos(a)[1] - pos(b)[1]);
  for (const a of actors) {
    const s = sheet(a.sprite || a.id), fw = s.width / 3, fh = s.height / 4, [ax, ay] = pos(a);
    const col = a.moving ? [0, 1, 2, 1][(a.anim * 2 | 0) % 4] : 1;
    const dh = 48, dw = fw * dh / fh; // 그림 파일의 칸 크기가 달라도 키 48px로 맞춘다
    ctx.drawImage(s, col * fw, ROW[a.dir] * fh, fw, fh, Math.round(ax * TILE + (TILE - dw) / 2), Math.round(ay * TILE + TILE - dh), dw, dh);
  }
  ctx.restore();

  const sx = ppx * TILE + 16 - cx, sy = ppy * TILE + 8 - cy;
  { // 밤의 학교: 플레이어 주변만 밝고 멀수록 어둡다. dark 맵은 손전등 없이는 거의 안 보인다
    darkCv ||= Object.assign(document.createElement('canvas'), { width: VW, height: VH });
    const g = darkCv.getContext('2d');
    const [alpha, r] = m.dark ? [0.96, S.flags.light ? 150 : 56] : m.lit ? [0.5, 250] : [0.7, 170];
    const f = m.flicker, nearLamp = f === true || (f && Math.abs(p.x - f.x) + Math.abs(p.y - f.y) <= f.r);
    const flick = nearLamp && Math.sin(W.t * 23) * Math.sin(W.t * 7.3) > 0.4 ? 0.16 : 0; // 깜빡이는 형광등 (그 근처에서만)
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, VW, VH);
    g.fillStyle = `rgba(4,6,18,${alpha + flick})`; g.fillRect(0, 0, VW, VH);
    g.globalCompositeOperation = 'destination-out';
    const grad = g.createRadialGradient(sx, sy, r * 0.25, sx, sy, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, VW, VH);
    ctx.drawImage(darkCv, 0, 0);
  }
  if (W.chasing) { // 추격 중: 가장자리가 붉게 맥박친다
    const grad = ctx.createRadialGradient(VW / 2, VH / 2, 120, VW / 2, VH / 2, 380);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, `rgba(120,0,0,${0.25 + 0.15 * Math.sin(W.t * 6)})`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
  }
  const tag = facing(); // 눈앞에 조사할 수 있는 것이 있으면 이름표를 띄운다
  if (tag && !W.busy && !W.hidden) {
    font(ctx, 11, true);
    const tw = ctx.measureText(tag.text).width + 12, tx = Math.round(tag.x * TILE + 16 - cx - tw / 2), ty = Math.round(tag.y * TILE - cy - 16);
    ctx.fillStyle = 'rgba(8,8,14,.85)'; ctx.fillRect(tx, ty, tw, 16);
    ctx.strokeStyle = '#a89a6a'; ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, 15);
    ctx.fillStyle = '#f0e6c0'; ctx.fillText(tag.text, tx + 6, ty + 12);
  }
  if (S.sanity <= 40) { // 정신력 40 이하: 가장자리가 어두워진다
    const grad = ctx.createRadialGradient(VW / 2, VH / 2, 90, VW / 2, VH / 2, 360);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, `rgba(30,0,0,${0.5 + (40 - S.sanity) / 80})`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
  }
  if (W.flash > 0) { ctx.globalAlpha = Math.min(1, W.flash * 3); ctx.fillStyle = W.flashColor; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  if (W.fade > 0) { ctx.globalAlpha = Math.min(1, W.fade / 0.35); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }

  const big = W.picture && pic(W.picture, false);
  if (big) { // 이벤트가 띄운 큰 그림 (액자 등). 화면 위쪽 가운데에 맞춰 넣는다
    const k = Math.min(440 / big.width, 230 / big.height), bw = big.width * k, bh = big.height * k, bx = (VW - bw) / 2, by = 12;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, VW, VH);
    // zoom 을 켠 그림은 틀 안에서 천천히 다가간다 (컷신 느낌)
    const z = W.pictureZoom ? 1 + Math.min(0.12, (W.pictureT || 0) * 0.012) : 1, sw = big.width / z, sh = big.height / z;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(big, (big.width - sw) / 2, (big.height - sh) / 2, sw, sh, bx, by, bw, bh); ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#0c0a08'; ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
  }
  { // 가방 단추 (왼쪽 위). 누르면 소지품이 열린다
    const b = BAG;
    ctx.fillStyle = 'rgba(8,8,14,.72)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#a89a6a'; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.strokeStyle = '#d8b070'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x + 15, b.y + 11, 5, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(b.x + 6, b.y + 10, 18, 13); ctx.fillStyle = '#a8743a'; ctx.fillRect(b.x + 6, b.y + 10, 18, 5);
    ctx.fillStyle = '#d8b070'; ctx.fillRect(b.x + 14, b.y + 14, 2, 3);
    font(ctx, 9, true); ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(String(S.items.length), b.x + b.w - 3, b.y + b.h - 3); ctx.textAlign = 'left';
  }
  if (W.timer) { // 제한 시간: 화면 아래에서부터 붉게 차오른다
    const k = 1 - W.timer.left / W.timer.total;
    if (W.timer.style !== 'label') { ctx.fillStyle = 'rgba(150,0,10,.3)'; ctx.fillRect(0, VH * (1 - k), VW, VH * k); } // style: 'label' 이면 글자만
    font(ctx, 13, true); ctx.textAlign = 'center'; ctx.fillStyle = '#ff8080';
    ctx.fillText(`${W.timer.label} ${Math.ceil(W.timer.left)}초`, VW / 2, 20); ctx.textAlign = 'left';
  }
  if (W.holdObj) {
    const h = W.holdObj.hold, v = S.flags[h.flag] || 0;
    font(ctx, 13, true); ctx.textAlign = 'center'; ctx.fillStyle = '#eee';
    ctx.fillText(`${h.label} (Space를 누르고 있기)`, VW / 2, VH - 44); ctx.textAlign = 'left';
    ctx.fillStyle = '#222'; ctx.fillRect(VW / 2 - 100, VH - 34, 200, 10);
    ctx.fillStyle = '#9ad84a'; ctx.fillRect(VW / 2 - 100, VH - 34, 200 * v, 10);
  }
  if (W.hidden) {
    font(ctx, 13, true); ctx.textAlign = 'center';
    if (W.breath) {
      ctx.fillStyle = (W.t * 4 | 0) % 2 ? '#ff5050' : '#ffb0b0';
      ctx.fillText('숨을 참아라! Space를 누르고 있어!', VW / 2, VH - 40);
      const lim = settings.timingWide ? 2 : 0.7;
      ctx.fillStyle = '#400'; ctx.fillRect(VW / 2 - 60, VH - 30, 120, 6);
      ctx.fillStyle = '#f44'; ctx.fillRect(VW / 2 - 60, VH - 30, 120 * Math.min(1, W.breathFail / lim), 6);
    } else { ctx.fillStyle = '#ddd'; ctx.fillText('숨는 중 (X 또는 방향키: 나오기)', VW / 2, VH - 30); }
    ctx.textAlign = 'left';
  }
}
