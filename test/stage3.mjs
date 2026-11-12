// 3단계 통과 검사: 5장 별실 (M9). 실행: node server.js 를 켠 뒤  node test/stage3.mjs [스크린샷 폴더]
// 인트로와 1~4장은 건너뛰고 별실에서 시작한다. 두 갈래(끝까지 버티기, 도중에 찍히기)를 실제 키 입력으로 통과한다.
import { open, sleep, checker } from './cdp.mjs';

const page = await open('http://localhost:8080/');
const t = checker(), shots = process.argv[2];
const ev = page.ev, G = 'window.__game', key = page.key;
const flag = f => ev(`${G}.S.flags['${f}'] || 0`);
const state = () => ev(`(()=>{const m=${G}.UI.modal; return m ? (m.kind || 'menu') : (${G}.W.busy ? 'busy' : '');})()`);
const seen = new Set();
const snap = async name => { if (shots && !seen.has(name)) { seen.add(name); await page.frames(4); await page.shot(`${shots}/${name}.png`); await sleep(200); } };
// 대화와 그림 창을 넘긴다. 카메라 차례(photo)가 되거나 아무 창도 없으면 멈춘다. 처음 보는 창은 찍어 둔다
const flow = async tag => {
  for (let i = 0; i < 600; i++) {
    await page.frames(3);
    const s = await state();
    if (s === '' || s === 'photo') return s;
    if (s === 'busy') { await sleep(60); continue; }
    if (s !== 'say') { await sleep(700); await snap(`${tag}-${s}-${await ev(`${G}.UI.modal.kind + (${G}.S.flags.c5_start ? '2' : '1')`)}`); }
    else if (await ev(`!!${G}.W.picture`)) await snap(`${tag}-pic-${await ev(`${G}.W.picture.split('/').pop().split('.')[0]`)}`);
    if (s === 'bigpic') await sleep(900);
    await key('Space');
  }
  throw new Error('창이 끝나지 않음');
};
const put = (x, y, dir) => ev(`(()=>{const p=${G}.W.p; p.x=${x}; p.y=${y}; p.dir='${dir}'; p.moving=false; Object.assign(${G}.S,{x:${x},y:${y},dir:'${dir}'});})()`);
const step = async code => { // 한 칸 걷고, 움직임과 그 뒤의 대사가 끝날 때까지 기다린다
  await key(code); await sleep(450);
  return flow('m9');
};
const at = () => ev(`[${G}.W.p.x, ${G}.W.p.y]`);
const cam = () => ev(`(()=>{const c=${G}.W.objs.find(o=>o.id==='cam'); return [c.x, c.y];})()`);
const yun = () => ev(`(()=>{const n=${G}.W.npcs.find(n=>n.id==='yunha_b'); return n ? [n.x, n.y] : null;})()`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function toStart(tag) { // 별실에 들어가 특수 잉크를 줍고 종이를 밟아 카메라 차례를 시작한다
  await ev(`(()=>{const S=${G}.S; for (const k of Object.keys(S.flags)) if (k.startsWith('c5_')) delete S.flags[k];
    S.items = S.items.filter(i => i !== 'special_ink' && i !== 'liver'); S.notes = S.notes.filter(n => !n.startsWith('notice')); S.companion = 'yunha';
    ${G}.UI.stack.length = 0; ${G}.W.busy = 0; void ${G}.enterMap('byeolsil', 1, 3, 'right');})()`);
  await page.until(`${G}.W.id === 'byeolsil'`); await flow(tag);
  await snap(tag + '-room');
  await put(2, 2, 'right'); await key('Space'); await flow(tag);
  await key('ArrowDown'); await sleep(450); await key('ArrowLeft'); await sleep(450);
  return flow(tag);
}

await page.until(`${G}?.UI.stack.length === 1`, 15000);
await ev(`localStorage.clear(); ${G}.D.game.intro = false`);
await key('Space'); await page.until(`!!${G}.W.map`); await sleep(400);
await ev(`${G}.UI.stack.length = 0; ${G}.W.busy = 0`);

// ---------- 갈래 1: 사진기를 피해 끝까지 버틴다 ----------
t.ok(await toStart('a') === 'photo', 'M9: 특수 잉크를 줍고 환풍구 앞 종이를 밟으면 카메라 차례가 시작된다');
t.ok(await ev(`${G}.S.items.includes('special_ink') && ${G}.S.notes.includes('ink_terms') && ${G}.S.notes.includes('notice_top')`), 'M9: 특수 잉크, 약관, 주의사항 윗부분을 얻는다');
t.ok(await ev(`${G}.S.companion`) === null && same(await yun(), [5, 3]), 'M9: 윤하는 E3에 서 있다');
t.ok(same(await cam(), [3, 1]), 'M9: 사진기는 C1에서 시작한다');
await snap('a-start');
await step('ArrowUp'); // 벽: 움직이지 못하면 차례가 넘어가지 않는다
t.ok(same(await at(), [1, 2]) && same(await cam(), [3, 2]) && same(await yun(), [5, 4]), 'M9: 한 칸 걸으면 사진기(C2)와 윤하(E4)도 한 칸 움직인다');
await step('ArrowLeft');
t.ok(same(await cam(), [3, 2]), 'M9: 벽에 막혀 못 움직이면 사진기도 움직이지 않는다');
await step('ArrowDown');
t.ok(await flag('c5_head') === 1 && same(await cam(), [3, 3]), 'M9: 사진기가 C3에 오면 머리를 찍고, 머리가 사라진다');
await snap('a-head-gone');
await step('ArrowDown'); await step('ArrowDown');
t.ok(same(await cam(), [3, 5]) && same(await yun(), [3, 7]), 'M9: 넷째 차례에 사진기 C5, 윤하 C7 (대각선 두 번)');
await step('ArrowDown');
t.ok(same(await yun(), [3, 8]) && await flag('c5_liver_y') === 1, 'M9: 윤하가 C8을 지나며 간을 줍는다');
await snap('a-turn5');
const last = await step('ArrowDown'); // 여섯째 차례: 사진기가 D7에 도착하고 마무리 장면
t.ok(last === '' && await flag('c5_done') === 1, 'M9: 사진기가 D7에 오면 마무리 장면을 지나 풀려난다');
t.ok(await ev(`${G}.S.items.includes('liver') && ${G}.S.notes.includes('notice_bottom') && ${G}.S.companion === 'yunha'`), 'M9: 간과 주의사항 아랫부분을 얻고 윤하가 다시 동행한다');
t.ok(await ev(`!${G}.S.puzzles.includes('m9') && !${G}.W.picture`), 'M9: 단서가 정리되고 그림이 닫힌다');
await snap('a-after');
await key('KeyI'); await sleep(300); for (let i = 0; i < 3; i++) await key('ArrowRight'); await snap('a-inventory'); await key('KeyX');

// ---------- 갈래 2: 도중에 사진기와 같은 칸에 선다 ----------
t.ok(await toStart('b') === 'photo', 'M9 다시: 카메라 차례가 처음 자리에서 다시 시작된다');
t.ok(same(await cam(), [3, 1]) && same(await yun(), [5, 3]), 'M9 다시: 사진기 C1, 윤하 E3');
await step('ArrowRight'); await step('ArrowDown'); await step('ArrowDown');
t.ok(same(await at(), [2, 5]) && same(await cam(), [3, 4]), 'M9: 셋째 차례에 주인공 B5, 사진기 C4');
const r = await step('ArrowRight'); // C5로 들어가면 사진기가 따라와 같은 칸이 된다
t.ok(r === '' && await flag('c5_done') === 1, 'M9: 도중에 찍혀도 흰 방을 거쳐 풀려난다 (죽지 않는다)');
t.ok(await ev(`${G}.S.items.includes('liver')`) && await ev(`${G}.S.deaths`) === 0, 'M9: 도중에 찍힌 경우에도 간을 받는다');

t.ok(await ev(`${G}.D.items.special_ink.desc.includes('제15조')`), '특수 잉크: 설명에 약관 조항이 들어 있다');

t.done(page);
