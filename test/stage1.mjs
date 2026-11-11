// 1단계 엔진 검사. 실행: node server.js 를 켠 뒤  node test/stage1.mjs [스크린샷 폴더]
import { open, sleep, checker } from './cdp.mjs';

const page = await open('http://localhost:8080/');
const t = checker(), shots = process.argv[2];
const ev = page.ev, G = 'window.__game';
const modal = () => ev(`${G}.UI.stack.length`);
const top = () => ev(`${G}.UI.modal?.kind || (${G}.UI.modal ? 'menu' : '')`);
const closeAll = async () => { await sleep(80); for (let i = 0; i < 12 && await top() === 'say'; i++) await page.key('Space'); }; // 대화창만 넘긴다
const closeMenus = async () => { for (let i = 0; i < 6 && await modal(); i++) await page.key('KeyX'); };
const put = (x, y, dir) => ev(`(()=>{const p=${G}.W.p; p.x=${x}; p.y=${y}; p.dir='${dir}'; p.moving=false; Object.assign(${G}.S,{x:${x},y:${y},dir:'${dir}'});})()`);
// 실제 시간이 아니라 게임 속 시간으로 기다린다 (컴퓨터가 느려도 결과가 같게)
const gameWait = async s => { const t0 = await ev(`${G}.W.t`); await page.until(`${G}.W.t >= ${t0 + s}`, 20000); };
const snap = async name => { if (shots) { await page.shot(`${shots}/${name}.png`); await sleep(400); } }; // 캡처 직후에는 화면이 잠깐 밀려서 쉬어 준다

await page.until('window.__game?.UI.stack.length === 1', 15000); // 타이틀이 뜰 때까지 기다린다
await ev('localStorage.clear()');
t.ok(await modal() === 1, '타이틀 메뉴가 뜬다');
await snap('1-title');
await page.key('Space');
await page.until(`${G}.W.map`);
t.ok(await ev(`${G}.S.map`) === 'test', '새 게임을 누르면 시작 맵에 들어간다');
t.ok(await modal() === 1, '시작 대사가 뜬다');
await closeAll();
t.ok(await ev(`${G}.S.goal`) !== '', '목표가 설정된다');

// 이동과 충돌
await page.keyDown('ArrowLeft'); await gameWait(0.6); await page.keyUp('ArrowLeft'); await gameWait(0.4);
const x1 = await ev(`${G}.S.x`);
t.ok(x1 < 12 && x1 >= 6, `걷는다 (x=${x1})`);
await put(12, 7, 'right');
await page.keyDown('ShiftLeft'); await page.keyDown('ArrowRight'); await gameWait(1); await page.keyUp('ArrowRight'); await page.keyUp('ShiftLeft'); await gameWait(0.3);
const x2 = await ev(`${G}.S.x`);
t.ok(x2 >= 18, `달리기가 걷기보다 빠르다 (x=${x2})`);
await put(12, 2, 'up');
await page.keyDown('ArrowUp'); await sleep(900); await page.keyUp('ArrowUp'); await sleep(300);
t.ok(await ev(`${G}.W.p.y`) === 1, '벽과 물건을 통과하지 못한다');

// 조사, 대화창, 일기장 기록
await page.key('Space');
t.ok(await modal() === 1, '칠판을 조사하면 대화창이 뜬다');
await snap('2-dialog');
await closeAll();
t.ok(await ev(`${G}.S.puzzles.includes('m1') && ${G}.S.rules.includes('hall') && ${G}.S.notes.includes('test_note')`), '단서, 규칙, 쪽지가 기록된다');

// 아이템
await page.key('KeyJ'); t.ok(await top() === 'say', '일기장이 없으면 안내가 나온다'); await closeAll();
t.ok(await modal() === 0, '일기장이 없으면 열리지 않고 안내만 나온다');
for (const [x, flag] of [[2, 'diary'], [4, 't_ink'], [6, 't_candy'], [8, 't_light'], [16, 't_tape'], [18, 't_paper'], [20, 't_key'], [22, 't_heart']]) {
  await put(x, 2, 'up'); await page.key('Space'); await closeAll();
  if (!await ev(`${G}.S.flags.${flag}`)) t.ok(false, '줍기 실패: ' + flag);
}
t.ok(await ev(`${G}.S.ink`) === 1 && await ev(`${G}.S.items.length`) === 5 && await ev(`${G}.S.organs[0]`) === 'heart', '잉크, 아이템 5개, 장기를 얻는다');

// 상태창, 인벤토리
await page.key('Tab'); t.ok(await modal() === 1, '상태창이 열린다'); await snap('3-status'); await page.key('Tab');
t.ok(await modal() === 0, '상태창이 닫힌다');
await ev(`${G}.S.sanity = 50`);
await page.key('KeyI'); await snap('4-inventory');
await page.key('Space'); await page.key('ArrowDown'); await page.key('Space'); // 사탕 → 사용
await closeAll();
t.ok(await ev(`${G}.S.sanity`) >= 70 && !await ev(`${G}.S.items.includes('candy')`), '사탕을 쓰면 정신력이 오르고 사라진다');
await page.key('KeyI'); await page.key('ArrowDown'); await page.key('Space'); // 테이프
await page.key('ArrowDown'); await page.key('ArrowDown'); await page.key('Space'); // 조합
await page.key('ArrowDown'); await page.key('Space'); // 종이 선택
await closeAll(); await closeMenus();
t.ok(await ev(`${G}.S.items.includes('taped_paper')`), '아이템 조합이 된다');

// 일기장과 세이브
await put(10, 5, 'down');
await page.key('KeyJ'); await snap('5-journal'); await page.key('Space'); await closeAll(); await closeMenus();
t.ok(await ev(`${G}.S.ink`) === 0 && await ev(`${G}.S.saves`) === 1 && await ev(`!!localStorage.getItem('bihyeonsil.save')`), '잉크 1개로 일기를 쓰면 저장된다');
await page.key('KeyJ'); await page.key('Space'); await closeAll(); await closeMenus();
t.ok(await ev(`${G}.S.saves`) === 1, '잉크가 없으면 일기를 못 쓴다');
// 저장 실패 상황
await ev(`${G}.S.ink = 1; Storage.prototype._set = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('full'); }`);
await page.key('KeyJ'); await page.key('Space'); await closeAll(); await closeMenus();
t.ok(await ev(`${G}.S.ink`) === 1 && await modal() === 0, '저장에 실패해도 잉크가 돌아오고 게임이 계속된다');
await ev(`Storage.prototype.setItem = Storage.prototype._set`);
await page.key('KeyJ'); await page.key('ArrowRight'); await page.key('Space'); await page.key('Space'); await closeMenus();
t.ok(await ev(`${G}.S.hints.m1`) === 2 && await ev(`${G}.S.hintsUsed`) === 2, '힌트를 단계별로 볼 수 있다');

// 잠긴 문, 맵 전환, 어둠
await ev(`${G}.S.items.splice(${G}.S.items.indexOf('key_test'), 1)`);
await put(22, 7, 'right'); await page.key('Space'); await closeAll();
t.ok(!await ev(`${G}.S.flags.t_door`), '열쇠가 없으면 문이 안 열린다');
await ev(`${G}.S.items.push('key_test')`);
await page.key('Space'); await closeAll();
t.ok(await ev(`${G}.S.flags.t_door`) === 1 && !await ev(`${G}.S.items.includes('key_test')`), '열쇠로 문을 연다');
await page.keyDown('ArrowRight'); await page.until(`${G}.S.map === 'test2'`); await page.keyUp('ArrowRight');
t.ok(true, '문으로 들어가면 맵이 바뀐다');
await sleep(2200); await snap('6-dark');
t.ok(await ev(`${G}.S.sanity`) < 100, '어둠 속에서는 정신력이 줄어든다');
await put(1, 3, 'left'); await page.keyDown('ArrowLeft'); await page.until(`${G}.S.map === 'test'`); await page.keyUp('ArrowLeft');

// 동행
await put(15, 7, 'up'); await page.key('Space'); await closeAll(); await page.key('Space'); await closeAll(); // 대사 → 선택지 → 대사
t.ok(await ev(`${G}.S.companion`) === 'yunha', '윤하가 동행한다');
await page.keyDown('ArrowDown'); await sleep(900); await page.keyUp('ArrowDown'); await sleep(400);
t.ok(await ev(`(()=>{const n=${G}.W.npcs.find(n=>n.id==='yunha'), p=${G}.W.p; return Math.abs(n.x-p.x)+Math.abs(n.y-p.y)})()`) === 1, '윤하가 한 칸 뒤를 따라온다');

// 숨기와 추격
const guard = `${G}.W.npcs.find(n=>n.id==='guard')`;
await ev(`${G}.S.sanity = 100; ${G}.S.flags.t_guard = 1`);
await put(8, 7, 'up'); await page.key('Space');
t.ok(await ev(`!!${G}.W.hidden`), '책상 밑에 숨는다');
await ev(`(()=>{const g=${guard}; g.x=12; g.y=7; g.moving=false; g.mode='patrol'; g.route=[[12,7]];})()`);
await sleep(1200);
t.ok(await ev(`${guard}.mode`) !== 'chase', '숨어 있으면 경비가 보지 못한다');
await page.keyDown('Space'); // 미리 숨을 참고 있는다
await ev(`(()=>{const g=${guard}; g.x=9; g.y=7; g.moving=false; g.route=[[9,7]];})()`);
await page.until(`${G}.W.breath`); await snap('7-hide'); await sleep(1500); // 캡처는 숨을 참기 시작한 뒤에 (캡처 동안 시간이 흘러서)
t.ok(await ev(`!!${G}.W.hidden`), '숨을 참는 동안은 들키지 않는다');
await page.keyUp('Space');
await page.until(`${G}.UI.modal?.kind === 'gameover'`, 5000); await snap('8-gameover');
t.ok(true, '숨 참기를 놓치면 들켜서 붙잡힌다');
await sleep(1400); await page.key('Space');
await page.until(`${G}.W.map && ${G}.UI.stack.length === 0 && ${G}.W.busy === 0`);
t.ok(await ev(`${G}.S.x`) === 10 && await ev(`${G}.S.y`) === 5 && await ev(`${G}.S.deaths`) === 1, '죽으면 마지막으로 일기를 쓴 곳에서 다시 시작한다');

// 소리를 듣고 오는 경비
await ev(`${G}.S.flags.t_guard = 1`);
await put(20, 12, 'left');
await ev(`(()=>{const g=${guard}; g.x=12; g.y=11; g.moving=false; g.mode='patrol'; g.route=[[12,11]]; g.sight=1;})()`);
await page.keyDown('ShiftLeft'); await page.keyDown('ArrowLeft');
await page.until(`['investigate','search'].includes(${guard}.mode)`, 3000); await page.keyUp('ArrowLeft'); await page.keyUp('ShiftLeft');
t.ok(true, '달리면 경비가 소리를 듣고 조사하러 온다');
await ev(`${G}.S.flags.t_guard = 0`);

// 정신력 연출과 옵션
await ev(`${G}.S.sanity = 15`); await sleep(300); await snap('9-low-sanity');
await page.key('Escape'); await page.key('ArrowDown'); await page.key('Space'); await page.key('Space'); await snap('10-options');
t.ok(await ev(`JSON.parse(localStorage.getItem('bihyeonsil.settings')).timingWide`) === true, '옵션이 바뀌고 저장된다');
await page.key('KeyX'); await sleep(200);
t.ok(await modal() === 0, '옵션과 일시 정지 메뉴가 닫힌다');

t.done(page);
