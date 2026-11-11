// JSON 이벤트 명령 해석기. 맵과 아이템의 "event" 목록을 순서대로 실행한다.
import { D, S, settings, cond, T, josa, loadSave, resetState } from './core.js';
import { W, enterMap, npcById, walk, syncCompanion } from './world.js';
import { say, choose, gameOver, toast, waitKey } from './ui.js';
import { sfx } from './audio.js';

class Abort {} // 스크립트를 중간에 끝낼 때 던진다 (사망, 가방 가득 참)
export const minigames = {}; // 이름 → async (params) => 결과. src/minigames 에서 등록

export async function run(cmds) {
  if (!cmds) return true;
  W.busy++;
  try { await exec(cmds); return true; }
  catch (e) { if (e instanceof Abort) return false; console.error('이벤트 오류', e, cmds); return false; }
  finally { W.busy--; }
}

export async function startGame(name) {
  resetState(name);
  W.timer = null;
  const s = D.game.start;
  await enterMap(s.map, s.x, s.y, s.dir);
  run(D.game.onStart);
}

async function exec(cmds) {
  if (typeof cmds === 'string') cmds = W.map?.events?.[cmds] || D.game.events?.[cmds] || [];
  for (const c of cmds) await one(c);
}

function sayLine(l, who) {
  const m = l.match(/^([^|\n]{1,8})\|([\s\S]*)$/); // "윤하|대사" 형식이면 말하는 사람 표시
  return m ? say(m[2], m[1]) : say(l, who);
}
const wait = s => new Promise(r => setTimeout(r, s * 1000));

async function one(c) {
  if (typeof c === 'string') c = { say: c };
  if ('if' in c) return exec(cond(c.if) ? c.then || [] : c.else || []);
  // 미니게임은 puzzle, id 같은 항목을 같이 쓰므로 다른 명령보다 먼저 본다
  if ('minigame' in c) {
    const fn = minigames[c.minigame];
    const r = fn ? await fn(c) : (console.error('없는 미니게임', c.minigame), true);
    if (r == null) return;
    return exec((r ? c.then : c.else) || []);
  }
  if ('say' in c) { for (const l of [].concat(c.say).flatMap(T)) await sayLine(l, c.who); return; }
  if ('choice' in c) {
    const i = await choose(c.choice.map(T), { title: c.title, cancel: false });
    return exec(c.then?.[i] || []);
  }
  if ('give' in c) {
    const n = c.n || 1;
    if (c.give === 'ink') { S.ink += n; sfx('get'); if (!c.quiet) await say(`잉크를 얻었다. (잉크 ${S.ink}개)`); return; }
    if (c.give === 'coin') { S.coins += n; sfx('get'); toast(`동전 ${n}개를 주웠다. (${S.coins}개)`); return; }
    const it = D.items[c.give];
    if (S.items.length >= (D.game.slots || 8)) { sfx('bad'); await say('더 이상 들 수 없다. 소지품을 정리하자.'); throw new Abort(); }
    S.items.push(c.give); sfx('get');
    if (!c.quiet) await say(`${josa(it.name, '을', '를')} 얻었다.`);
    return;
  }
  if ('take' in c) { const i = S.items.indexOf(c.take); if (i >= 0) S.items.splice(i, 1); return; }
  if ('organ' in c) {
    if (!S.organs.includes(c.organ)) S.organs.push(c.organ);
    sfx('get'); await say(`<${D.items[c.organ].name}>${josa(D.items[c.organ].name, '을', '를').slice(-1)} 장기 주머니에 넣었다.`);
    return;
  }
  if ('set' in c) { S.flags[c.set] = c.to ?? 1; return; }
  if ('add' in c) { S.flags[c.add] = (S.flags[c.add] || 0) + (c.n ?? 1); return; }
  if ('sanity' in c) { S.sanity = Math.max(0, Math.min(100, S.sanity + c.sanity)); return; }
  if ('goal' in c) { S.goal = T(c.goal); toast('목표: ' + S.goal); return; }
  if ('note' in c) { if (!S.notes.includes(c.note)) { S.notes.push(c.note); toast('일기장에 기록되었다: ' + D.notes[c.note].title); } return; }
  if ('rule' in c) { if (!S.rules.includes(c.rule)) { S.rules.push(c.rule); toast('학교 규칙이 일기장에 기록되었다.'); } return; }
  if ('puzzle' in c) { if (!S.puzzles.includes(c.puzzle)) S.puzzles.push(c.puzzle); return; }
  if ('puzzleDone' in c) { S.puzzles = S.puzzles.filter(p => p !== c.puzzleDone); return; }
  if ('goto' in c) { await enterMap(c.goto, c.x, c.y, c.dir); return; }
  if ('sfx' in c) return void sfx(c.sfx);
  if ('toast' in c) return void toast(T(c.toast));
  if ('wait' in c) return wait(c.wait);
  if ('shake' in c) { W.shake = c.shake; return; }
  if ('flash' in c) { W.flashColor = c.flash; W.flash = c.t || 0.3; return; }
  if ('scare' in c) { // 깜짝 연출. 옵션의 강도를 따른다
    if (settings.scare > 0) { W.flashColor = c.scare || '#a00'; W.flash = settings.scare * 0.2; W.shake = settings.scare * 0.25; sfx('scare', settings.scare / 2); }
    return;
  }
  if ('companion' in c) { S.companion = c.companion || null; syncCompanion(); return; }
  if ('npc' in c) { const n = npcById(c.npc); if (n) { const { npc, ...rest } = c; Object.assign(n, rest); } return; }
  if ('move' in c) {
    const a = c.move === 'player' ? W.p : npcById(c.move);
    if (a) { const p = walk(a, c.path, c.speed); if (!c.nowait) await p; }
    return;
  }
  if ('face' in c) { const a = c.face === 'player' ? W.p : npcById(c.face); if (a) a.dir = c.dir; return; }
  if ('run' in c) return exec(c.run);
  if ('timer' in c) { W.timer = { left: c.timer, total: c.timer, label: T(c.label) || '남은 시간', end: c.end }; return; }
  if ('timerStop' in c) { W.timer = null; return; }
  if ('picture' in c) { W.picture = c.picture || null; W.pictureT = 0; W.pictureZoom = !!c.zoom; return; } // 화면 가운데에 큰 그림을 띄우거나(경로) 지운다(null)
  if ('readNote' in c) return say(D.notes[c.readNote].text || '(아무것도 적혀 있지 않다.)');
  if ('resetPush' in c) { // 밀어 둔 물건을 처음 자리로
    for (const id of [].concat(c.resetPush)) {
      const o = W.objs.find(o => o.id === id);
      if (o) { o.x = o.ox; o.y = o.oy; delete S.pos[W.id + ':' + id]; delete S.flags[id + '_x']; delete S.flags[id + '_y']; }
    }
    return;
  }
  if ('waitKey' in c) return waitKey(c.waitKey, T(c.prompt));
  if ('die' in c) return die(c.die);
  console.warn('모르는 명령', c);
}

// 사망: 마지막 일기 위치에서, 일기를 쓴 적이 없으면 처음부터 다시
async function die(text) {
  sfx('die');
  const keep = { name: S.name, deaths: S.deaths + 1, hintsUsed: S.hintsUsed };
  await gameOver(T(text) || '죽었다.');
  W.timer = null; W.picture = null;
  if (loadSave()) {
    S.deaths = keep.deaths; S.hintsUsed = Math.max(S.hintsUsed, keep.hintsUsed);
    await enterMap(S.map, S.x, S.y, S.dir);
  } else {
    await startGame(keep.name);
    Object.assign(S, { deaths: keep.deaths, hintsUsed: keep.hintsUsed });
  }
  throw new Abort();
}
