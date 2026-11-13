// 데이터 검사 (브라우저 없이). 실행: node test/check-data.mjs
// JSON을 손으로 고친 뒤 오타나 빠진 것을 잡아낸다: 없는 아이템, 없는 대사, 맵 밖 좌표, 막힌 도착 지점 등
import { readFileSync, readdirSync } from 'node:fs';

const load = f => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const D = Object.fromEntries(['game', 'tiles', 'items', 'dialog', 'puzzles', 'rules', 'notes'].map(k => [k, load(k + '.json')]));
const maps = Object.fromEntries(readdirSync(new URL('../data/maps', import.meta.url)).map(f => [f.replace('.json', ''), load('maps/' + f)]));

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const COMMANDS = ['if', 'say', 'choice', 'give', 'take', 'organ', 'set', 'add', 'sanity', 'goal', 'note', 'rule', 'puzzle', 'puzzleDone', 'goto', 'sfx',
  'toast', 'wait', 'shake', 'flash', 'scare', 'companion', 'npc', 'move', 'face', 'run', 'minigame', 'die', 'timer', 'timerStop', 'waitKey', 'readNote', 'resetPush', 'ending', 'picture', 'fx'];
const MINIGAMES = ['grid', 'timing', 'order', 'mash', 'organs', 'painting', 'photo', 'bigpic', 'itemcard', 'paper', 'mix', 'rollcall', 'tapes', 'screen', 'piano', 'lock', 'valves', 'rules'];

const dialog = key => key.slice(1).split('.').reduce((v, k) => v?.[k], D.dialog);
function text(where, s) {
  for (const t of [].concat(s ?? [])) if (typeof t === 'string' && t[0] === '@' && dialog(t) == null) err(where, `없는 대사 ${t}`);
}
function condCheck(where, e) {
  if (typeof e !== 'string') return;
  for (const m of e.matchAll(/(?:has|organ|placed):([\w가-힣]+)/g)) if (!D.items[m[1]]) err(where, `조건식의 없는 아이템 ${m[1]}`);
}
const solidAt = (m, x, y) => {
  const ch = m.tiles[y]?.[x], t = m.legend?.[ch] || D.tiles[ch];
  if (!t) return true;
  if ((m.exits || []).some(e => e.x === x && e.y === y)) return true;
  return t.solid || (m.objects || []).some(o => o.solid !== false && !o.if && !o.push && x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1));
};
function landing(where, id, x, y) {
  const m = maps[id];
  if (!m) return err(where, `없는 맵 ${id}`);
  if (solidAt(m, x, y)) err(where, `도착 지점 ${id}(${x},${y}) 이 막혀 있음`);
}

function walk(where, cmds, events) {
  if (typeof cmds === 'string') { if (!events?.[cmds] && !D.game.events?.[cmds]) err(where, `없는 이벤트 이름 "${cmds}"`); return; }
  if (!Array.isArray(cmds)) return err(where, '명령 목록이 배열이 아님');
  for (const c of cmds) {
    if (typeof c === 'string') { text(where, c); continue; }
    const key = COMMANDS.find(k => k in c);
    if (!key) { err(where, '모르는 명령 ' + JSON.stringify(c).slice(0, 60)); continue; }
    if ('if' in c) { condCheck(where, c.if); walk(where, c.then || [], events); walk(where, c.else || [], events); continue; }
    if ('say' in c) text(where, c.say);
    if ('choice' in c) { text(where, c.choice); (c.then || []).forEach(t => walk(where, t, events)); if ((c.then || []).length !== c.choice.length) err(where, '선택지 수와 결과 수가 다름'); }
    for (const k of ['give', 'take', 'organ']) if (k in c && !['ink', 'coin'].includes(c[k]) && !D.items[c[k]]) err(where, `없는 아이템 ${c[k]}`);
    if ('note' in c && !D.notes[c.note]) err(where, `없는 쪽지 ${c.note}`);
    if ('readNote' in c && !D.notes[c.readNote]) err(where, `없는 쪽지 ${c.readNote}`);
    if ('rule' in c && !D.rules[c.rule]) err(where, `없는 규칙 ${c.rule}`);
    for (const k of ['puzzle', 'puzzleDone']) if (k in c && !('minigame' in c) && !D.puzzles[c[k]]) err(where, `없는 퍼즐 ${c[k]}`);
    if ('goto' in c) landing(where, c.goto, c.x, c.y);
    if ('goal' in c) text(where, c.goal);
    if ('die' in c) text(where, c.die);
    if ('run' in c) walk(where, c.run, events);
    if ('timer' in c) walk(where, c.end, events);
    if ('minigame' in c) {
      if (!MINIGAMES.includes(c.minigame)) err(where, `없는 미니게임 ${c.minigame}`);
      if (c.puzzle && !D.puzzles[c.puzzle]) err(where, `없는 퍼즐 ${c.puzzle}`);
      walk(where, c.then || [], events); walk(where, c.else || [], events);
      for (const k of c.cases || []) walk(where, k, events);
    }
  }
}

for (const [id, it] of Object.entries(D.items)) {
  if (!it.name || !it.desc) err('items.' + id, '이름이나 설명이 없음');
  if (it.use) walk('items.' + id, it.use);
  for (const [o, r] of Object.entries(it.combine || {})) if (!D.items[o] || !D.items[r]) err('items.' + id, '조합 대상이 없음');
}
for (const [id, p] of Object.entries(D.puzzles)) if (p.hints && p.hints.length !== 3) err('puzzles.' + id, '힌트는 3단계여야 함');
walk('game.onStart', D.game.onStart);
for (const [k, v] of Object.entries(D.game.companionTalk || {})) walk('game.companionTalk.' + k, v);
landing('game.start', D.game.start.map, D.game.start.x, D.game.start.y);

for (const [id, m] of Object.entries(maps)) {
  const w = m.tiles[0].length, h = m.tiles.length;
  m.tiles.forEach((r, y) => {
    if (r.length !== w) err(id, `${y}번째 줄 길이가 다름 (${r.length} != ${w})`);
    for (const ch of r) if (!(m.legend?.[ch] || D.tiles[ch])) err(id, `tiles.json에 없는 타일 문자 "${ch}"`);
  });
  const inMap = (o, what) => { if (o.x < 0 || o.y < 0 || o.x + (o.w || 1) > w || o.y + (o.h || 1) > h) err(id, `${what} 이(가) 맵 밖 (${o.x},${o.y})`); };
  if (m.onEnter) walk(id + '.onEnter', m.onEnter, m.events);
  if (m.onPush) walk(id + '.onPush', m.onPush, m.events);
  for (const [k, v] of Object.entries(m.events || {})) walk(`${id}.events.${k}`, v, m.events);
  for (const e of m.exits || []) {
    inMap(e, '문'); condCheck(id + ' 문', e.if); text(id + ' 문', e.locked);
    if (e.if !== 'never') landing(`${id} 문(${e.x},${e.y})`, e.to, e.tx, e.ty);
    if (e.event) walk(`${id} 문(${e.x},${e.y})`, e.event, m.events);
  }
  for (const o of m.objects || []) {
    const where = `${id} 물건 ${o.label || o.id || ''}(${o.x},${o.y})`;
    inMap(o, '물건'); condCheck(where, o.if);
    if (o.event) walk(where, o.event, m.events);
    if (o.hold) { walk(where, o.hold.done, m.events); condCheck(where, o.hold.if); }
    if (o.push && !o.id) err(where, '밀 수 있는 물건에는 id가 필요함');
  }
  for (const n of m.npcs || []) {
    const where = `${id} 인물 ${n.id}`;
    inMap(n, '인물'); condCheck(where, n.if);
    if (!D.game.actors[n.sprite || n.id]) err(where, 'game.json actors에 없는 인물');
    if (n.event) walk(where, n.event, m.events);
    if (n.onCatch) walk(where, n.onCatch, m.events);
    for (const [x, y] of n.route || []) if (solidAt(m, x, y)) err(where, `순찰 지점 (${x},${y}) 이 막혀 있음`);
  }
}

if (errors.length) { console.log(errors.join('\n')); console.log(`\n문제 ${errors.length}개`); process.exit(1); }
console.log(`데이터 검사 통과 (맵 ${Object.keys(maps).length}개, 아이템 ${Object.keys(D.items).length}개)`);
