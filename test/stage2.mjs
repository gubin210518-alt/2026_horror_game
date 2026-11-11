// 2단계 통과 검사: 인트로(M0)부터 환풍구(M8)까지. 실행: node server.js 를 켠 뒤  node test/stage2.mjs [스크린샷 폴더]
// 퍼즐은 실제 키 입력으로 풀고, 맵 사이 이동은 시간을 아끼려고 순간이동을 섞는다.
// 실패 경로(오답, 시간 초과, 붙잡힘)는 저장 후 일부러 죽어서 확인한다. 저장용 잉크가 모자라면 검사에서만 채워 준다.
import { open, sleep, checker } from './cdp.mjs';

const page = await open('http://localhost:8080/');
const t = checker(), shots = process.argv[2];
const ev = page.ev, G = 'window.__game', key = page.key;
const flag = f => ev(`${G}.S.flags['${f}'] || 0`);
const top = () => ev(`${G}.UI.modal?.kind || (${G}.UI.modal ? 'menu' : '')`);
// 대화창만 넘긴다. 이벤트가 진행 중(컷신 이동 등)이면 끝나거나 다른 창이 뜰 때까지 기다린다
const says = async () => {
  for (let i = 0; i < 300; i++) {
    await page.frames(3);
    const s = await ev(`(()=>{const m=${G}.UI.modal; return m ? (m.kind || 'menu') : (${G}.W.busy ? 'busy' : '');})()`);
    if (s === 'say') await key('Space'); else if (s === 'busy') await sleep(60); else break;
  }
};
const menus = async () => { for (let i = 0; i < 6 && await ev(`${G}.UI.stack.length`); i++) await key('KeyX'); };
const put = (x, y, dir) => ev(`(()=>{const p=${G}.W.p; p.x=${x}; p.y=${y}; p.dir='${dir}'; p.moving=false; Object.assign(${G}.S,{x:${x},y:${y},dir:'${dir}'});})()`);
const use = async (x, y, dir) => { await put(x, y, dir); await key('Space'); await says(); };
const warp = async (map, x, y, dir = 'down') => { // 맵에 들어갈 때 나오는 대사까지 넘긴다
  await ev(`void ${G}.enterMap('${map}',${x},${y},'${dir}')`); await page.until(`${G}.S.map === '${map}' && ${G}.W.id === '${map}'`); await says();
};
const walkTo = async (code, expr, ms = 15000) => { await page.keyDown(code); try { await page.until(expr, ms); } finally { await page.keyUp(code); } };
const idle = () => page.until(`${G}.UI.stack.length === 0 && ${G}.W.busy === 0`, 15000);
const snap = async name => { if (shots) { await page.shot(`${shots}/${name}.png`); await sleep(300); } };
const save = async () => { // 잉크가 없으면 검사용으로 하나 채우고 일기를 쓴다
  await ev(`${G}.S.ink = Math.max(1, ${G}.S.ink)`);
  await key('KeyJ'); await key('Space'); await says(); await menus();
};
const died = async name => { // 게임오버 화면이 뜨는지 확인하고 다시 시작
  await page.until(`${G}.UI.modal?.kind === 'gameover'`, 90000);
  t.ok(true, name);
  await sleep(1500); await key('Space'); await idle();
};
const retry = async (act, expr, ms = 20000) => { for (const end = Date.now() + ms; Date.now() < end;) { if (await ev(expr)) return; await act(); await sleep(200); } throw new Error('시간 초과: ' + expr); };
const clickL = async (x, y) => { // 게임 좌표(640x360)로 클릭
  const [px, py] = await ev(`(()=>{const r=document.getElementById('c').getBoundingClientRect(); return [r.left+${x}*r.width/640, r.top+${y}*r.height/360];})()`);
  await page.click(px, py); await page.frames(3);
};

// ---------- M0 인트로 ----------
await page.until(`${G}?.UI.stack.length === 1`, 15000);
await ev('localStorage.clear()');
await key('Space');
await page.until(`!!document.querySelector('input')`);
await snap('m0-1-login');
await ev(`(()=>{const i=document.querySelector('input'); i.value='테스터'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}));})()`);
t.ok(await ev(`__intro().scene`) === 'desktop', 'M0: 이름을 입력하면 바탕화면이 나온다');
await clickL(50, 60); t.ok(await ev(`__intro().scene`) === 'desktop', 'M0: 다른 아이콘은 빈 폴더만 열린다'); await clickL(400, 300);
await clickL(50, 281); await snap('m0-2-board');
await clickL(300, 109); await clickL(300, 139); await clickL(200, 262); // 삭제된 글, 게임 글, 첨부 파일
t.ok(await ev(`__intro().dialogs.length`) === 1, 'M0: 첨부 파일을 누르면 가짜 다운로드 창이 뜬다');
const dlg = async () => ev(`(()=>{const d=__intro().dialogs.at(-1); return [d.x+d.cancel.dx+40, d.y+d.cancel.dy+12, d.x+d.close.dx+9, d.y+d.close.dy+8, d.x+70, d.y+108];})()`);
let b = await dlg(); await clickL(b[0], b[1]); await clickL(b[0], b[1]);
t.ok(await ev(`__intro().cancels`) === 2, 'M0: 취소할 때마다 문구가 바뀐다'); await snap('m0-3-why');
await clickL(b[2], b[3]);
t.ok(await ev(`__intro().dialogs.length`) === 2, 'M0: X를 누르면 창이 하나 더 생긴다');
b = await dlg(); await clickL(b[0], b[1]);
t.ok(await ev(`__intro().cancels`) === 3, 'M0: 세 번 취소하면 이름을 부른다'); await snap('m0-4-name');
b = await dlg();
const [mx, my] = await ev(`(()=>{const r=document.getElementById('c').getBoundingClientRect(); return [r.left+${b[0] + 20}*r.width/640, r.top+${b[1] + 10}*r.height/360];})()`);
await page.mouse('mouseMoved', mx, my); await page.frames(20);
const b2 = await dlg();
t.ok(Math.hypot(b2[0] - b[0], b2[1] - b[1]) > 10, 'M0: 그 뒤로 취소 버튼이 커서를 피해 도망간다');
await clickL(b2[4], b2[5]);
t.ok(await ev(`__intro().scene`) === 'download', 'M0: 다운로드를 누르면 진행 바가 나온다 (실제 다운로드 없음)');
await page.until(`__intro().scene === 'title'`, 20000); await snap('m0-5-title');
await retry(() => clickL(320, 180), `!!${G}.W.map`);
t.ok(await ev(`${G}.S.name`) === '테스터' && await ev(`${G}.S.map`) === 'classroom', 'M0: 화면이 꺼지고 입력한 이름으로 1장이 시작된다');
t.ok(await ev(`!document.querySelector('input') && !document.querySelector('a[download]')`), 'M0: 입력 상자가 사라지고 실제 다운로드 링크는 없다');

// ---------- 1장: M1 사물함 ----------
await says(); await snap('c1-classroom');
await put(8, 9, 'down'); await key('Space'); await key('Space'); await says();
t.ok(await ev(`${G}.S.sanity`) < 95 && !await flag('c1_key'), 'M1: 틀린 사물함을 열면 정신력 -10, 죽지는 않는다');
await key('Space'); await snap('m1-lockers');
for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'Space']) await key(k);
await says();
t.ok(await ev(`${G}.S.items.includes('key_front')`), 'M1: 목요일 3교시 사물함에서 앞문 열쇠가 나온다');
await use(2, 9, 'down');
t.ok(await flag('c1_open') === 1, 'M1: 열쇠로 앞문을 연다');
await walkTo('ArrowDown', `${G}.S.map === 'floor2'`); await says();
await use(9, 1, 'up');
t.ok(await ev(`${G}.S.rules[0]`) === 'hall', '복도: 학교 규칙이 일기장에 기록된다');
await use(12, 1, 'up'); t.ok(await ev(`${G}.S.map`) === 'floor2', '복도: 다른 문은 잠겨 있다');
await use(2, 5, 'down'); t.ok(await ev(`${G}.W.p.y`) === 5, '복도: 특별동 쪽은 셔터로 막혀 있다');
await put(8, 2, 'right'); await walkTo('ArrowRight', `${G}.W.p.x >= 14`); t.ok(true, '복도: 중정을 둘러싼 복도를 자유롭게 걸을 수 있다');
await put(18, 1, 'up'); await walkTo('ArrowUp', `${G}.S.map === 'class2'`);
await key('KeyJ'); await says(); t.ok(await ev(`${G}.UI.stack.length`) === 0, '1장: 일기장을 얻기 전에는 열 수 없다');
await use(9, 4, 'down');
t.ok(await flag('diary') === 1 && await ev(`${G}.S.goal`) === '여기서 나가야 한다', '1장: 옆 교실 서랍에서 일기장을 얻고 목표가 적힌다');
await key('KeyJ'); await key('Space'); await says(); await menus();
t.ok(await ev(`${G}.S.saves`) === 0, '1장: 잉크가 없어서 아직 일기를 못 쓴다');

// ---------- 2장: M2 가란델가의 자매들 ----------
await warp('floor2', 44, 11, 'right'); await snap('c2-window');
await use(44, 11, 'right');
t.ok(await flag('m2_fled') === 1, '2장: 복도에서 미술실 창문을 조사하면 안에 서 있던 윤하가 달아난다');
await put(44, 8, 'right'); await walkTo('ArrowRight', `${G}.S.map === 'art'`); await says(); await snap('c2-art');
await use(2, 4, 'left');
t.ok(await ev(`${G}.S.ink`) === 1 && await flag('ink1') === 1, '2장: 윤하가 서 있던 자리에서 첫 잉크를 얻고 창문이 액자로 바뀐다');
await save();
t.ok(await ev(`${G}.S.saves`) === 1 && await ev(`${G}.S.ink`) === 0, '2장: 잉크로 일기를 쓴다');

await use(1, 4, 'left');
t.ok(await flag('m2_started') === 1 && await ev(`${G}.W.timer.total`) === 60, 'M2: 자매들이 말한 뒤 60초 제한 시간이 시작된다'); await snap('m2-blood');
await put(10, 6, 'down'); await key('ArrowDown'); t.ok(await ev(`${G}.W.p.y`) >= 6, 'M2: 피가 차오르는 동안에도 움직일 수 있다');
await ev(`${G}.W.timer.left = 0.3`); await page.until(`${G}.UI.stack.length > 0`);
await retry(async () => { await says(); await key('Space'); }, `${G}.UI.modal?.kind === 'gameover'`);
await died('M2 실패: 시간이 다 되면 누구를 골라도 죽는다');
t.ok(!await flag('m2_started') && await ev(`${G}.S.map`) === 'art', 'M2: 죽으면 일기를 쓴 곳(미술실)에서 다시 시작한다');

await use(1, 4, 'left'); await use(16, 4, 'up');
t.ok(await ev(`${G}.S.items.includes('paintknife')`), 'M2: 물감통에서 물감칼을 얻는다');
await put(1, 3, 'left'); await key('Space');
await retry(() => key('Space'), `${G}.UI.modal?.kind === 'gameover'`);
await died('M2 실패: 이네스가 아닌 인물을 찌르면 죽는다');

await use(1, 4, 'left'); await use(16, 4, 'up');
await put(1, 6, 'left'); await key('Space'); await key('Space'); await says();
t.ok(await flag('m2_done') === 1 && await ev(`${G}.W.timer`) === null, 'M2 정답: 물감칼로 이네스를 찌르면 피가 빠지고 비품실이 열린다');
await put(18, 5, 'right'); await walkTo('ArrowRight', `${G}.S.map === 'storage'`);
await snap('c2-storage');
await use(3, 1, 'up'); await use(7, 1, 'up');
t.ok(await ev(`${G}.S.items.includes('flashlight')`) && await flag('map') === 1, '비품실: 선반에서 손전등을, 벽에서 안내도를 얻는다');
await key('KeyM'); t.ok(await ev(`${G}.UI.stack.length`) === 1, '비품실: M 키로 안내도(지도)를 펼친다'); await snap('map'); await key('KeyM');
await use(9, 3, 'right');
t.ok(await ev(`${G}.S.puzzles.includes('m2b')`) && !await flag('c2_libkey'), '비품실: 온기가 느껴지는 석고상은 맨손으로는 깰 수 없다');
await use(6, 5, 'up'); t.ok(await ev(`${G}.S.items.includes('hammer')`), '비품실: 바닥의 금 간 망치를 줍는다');
await use(9, 1, 'right'); t.ok(await ev(`${G}.S.items.includes('hammer')`), '비품실: 차가운 석고상에는 망치를 쓰지 않는다 (망치가 낭비되지 않음)');
await put(9, 3, 'right'); await key('Space'); await says(); await key('Space'); await says();
t.ok(await ev(`${G}.S.items.includes('key_library') && !${G}.S.items.includes('hammer')`), '비품실: 따뜻한 석고상을 망치로 깨면 도서관 열쇠가 나오고 망치는 부서진다');

// ---------- 3장: 도서관, M3, M4, M5 ----------
await warp('floor2', 30, 26, 'down'); await key('Space'); await says();
t.ok(await flag('lib_open') === 1, '3장: 도서관 열쇠로 문을 연다');
await walkTo('ArrowDown', `${G}.S.map === 'library'`); await says();
await ev(`${G}.S.sanity = 100`); await sleep(1500); t.ok(await ev(`${G}.S.sanity`) < 100, '3장: 도서관은 어두워서 손전등 없이는 정신력이 줄어든다');
await ev(`${G}.S.flags.light = 1; ${G}.S.sanity = 100`);
await use(20, 1, 'down'); t.ok(!await flag('m3_found'), 'M3: 윤하를 만나기 전에는 거꾸로 꽂힌 책이 반응하지 않는다');
await use(11, 5, 'right');
t.ok(await ev(`${G}.S.companion`) === 'yunha', '3장: 윤하와 대화하면 동행한다'); await snap('c3-library');
await use(20, 1, 'down');
t.ok(await flag('m3_found') === 1, 'M3: 거꾸로 꽂힌 책을 누르면 비밀서고 문이 나타난다');
await use(24, 2, 'up'); t.ok(await ev(`${G}.S.ink`) === 1, '3장: 비밀서고 입구에서 두 번째 잉크를 얻는다');
await save();
await put(19, 1, 'up'); await key('Space'); await says(); await key('Space'); await says();
await page.frames(6); await key('Space'); await says(); // 너무 일찍 누른다
t.ok(await ev(`${G}.S.map`) === 'library', 'M3 실패: 박자가 안 맞으면 다시 센다 (불이익 없음)');
await ev(`${G}.settings.timingWide = true`);
await put(19, 1, 'up'); await key('Space'); await says(); await key('Space'); await says();
await page.until(`${G}.UI.modal?.kind === 'say'`, 8000); await says();
await page.until(`${G}.S.map === 'archive'`, 8000); await says();
t.ok(await ev(`${G}.S.companion`) === null, 'M3 성공: 판정 넓히기 옵션에서는 자동으로 맞고, 각자 방에 들어간다');
await ev(`${G}.settings.timingWide = false`); await snap('m4-room');

await use(1, 3, 'left'); t.ok(!await flag('m4_done'), 'M4: 방을 맞추기 전에는 액자가 돌아가지 않는다');
await put(7, 1, 'up'); await key('Space');
for (const k of ['Space', 'ArrowRight', 'ArrowRight', 'Space', 'ArrowLeft', 'Space', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Space', 'KeyX']) await key(k);
await says(); t.ok(await flag('m4_books') === 1, 'M4: 책 순서를 거울상으로 맞춘다');
await put(3, 1, 'up'); await key('Space'); await says(); for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'Space']) await key(k); await says();
await use(8, 2, 'up'); await use(3, 7, 'down');
await use(2, 5, 'down'); await use(5, 3, 'up'); await use(8, 4, 'down');
t.ok(await flag('m4_clock') === 9 && await flag('m4_lamp') === 1 && await flag('m4_cl') === 1 && await flag('m4_trash') === 3, 'M4: 시계, 스탠드, 커튼, 쓰레기를 맞춘다');
await put(6, 2, 'down'); await retry(() => key('ArrowDown'), `${G}.S.flags.m4desk_y === 4`, 6000);
t.ok(await flag('m4desk_y') === 4, 'M4: 책상을 걸어서 밀 수 있다');
await put(9, 4, 'right'); await key('Space'); await says(); await key('ArrowDown'); await key('Space'); await says();
t.ok(!await flag('m4desk_y'), 'M4: 가구를 처음 자리로 되돌릴 수 있다 (막힘 방지)');
await ev(`(()=>{const W=${G}.W,S=${G}.S; for(const [id,x,y] of [['m4desk',3,4],['m4chair',3,5]]){const o=W.objs.find(o=>o.id===id); o.x=x;o.y=y; S.pos['archive:'+id]=[x,y]; S.flags[id+'_x']=x; S.flags[id+'_y']=y;}})()`);
await put(9, 4, 'right'); await key('Space'); await says(); await key('Space'); await says();
t.ok(await flag('m4_n') === 6 && await flag('m4_all') === 1, 'M4: 여섯 가지를 다 맞춰도 문은 안 열리고, 윤하가 액자를 가리킨다');
await use(1, 6, 'down'); t.ok(await ev(`${G}.S.items.includes('deathbook')`), 'M4: <읽으면 죽는 책>을 얻는다');
await ev(`${G}.settings.timingWide = true`);
await put(1, 3, 'left'); await key('Space'); await says(); await page.until(`${G}.UI.modal?.kind === 'say'`, 8000); await says();
await ev(`${G}.settings.timingWide = false`);
t.ok(await flag('m4_done') === 1, 'M4 정답: 윤하와 함께 액자를 뒤집으면 문이 열린다');
await save();

const toChase = async () => {
  await put(1, 1, 'up'); await page.keyDown('ArrowUp');
  for (let i = 0; i < 120 && await ev(`${G}.S.map`) !== 'floor2'; i++) { await says(); await sleep(150); }
  await page.keyUp('ArrowUp');
};
await toChase();
t.ok(await ev(`${G}.S.map`) === 'floor2' && await ev(`${G}.S.items.includes('key_science')`), 'M5: 경비에게 끌려가다 풀려나며 과학실 열쇠를 얻고, 복도에서 추격이 시작된다'); await snap('m5-chase');
t.ok(await ev(`!${G}.W.objs.some(o => o.label === '셔터' && !${G}.S.flags.m5_start)`), 'M5: 특별동으로 가는 셔터가 열려 있다');
t.ok(await ev(`(()=>{const m=${G}.W.map,T=${G}.D.tiles,q=[[27,26]],seen=new Set(['27,26']); while(q.length){const [x,y]=q.shift(); if(x===1&&y===14) return true; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny,c=m.tiles[ny]?.[nx]; if(!c||seen.has(k)||T[c].solid) continue; seen.add(k); q.push([nx,ny]);}} return false;})()`), 'M5: 넘어진 의자를 피해 과학실 문까지 가는 길이 있다');
await died('M5 실패: 가만히 있으면 경비에게 붙잡힌다');
t.ok(await ev(`${G}.S.map`) === 'archive', 'M5: 죽으면 비밀서고에서 다시 시작한다');
await toChase();
await put(1, 14, 'left'); await walkTo('ArrowLeft', `${G}.S.map === 'science'`);
await says();
t.ok(await flag('m5_done') === 1 && await ev(`${G}.W.chasing`) === false, 'M5 성공: 과학실에 들어가면 추격이 끝난다');

// ---------- 4장: 과학실 M6, 실험실 M7, 환풍구 M8 ----------
await snap('c4-science');
await use(7, 3, 'up'); await use(3, 10, 'down'); await use(10, 4, 'down'); await use(15, 7, 'down');
t.ok(await ev(`${G}.S.organs.includes('heart') && ['acid','key_lab'].every(i=>${G}.S.items.includes(i))`) && await flag('ink3') === 1, '4장: 심장, 황산, 실험실 열쇠, 세 번째 잉크를 얻는다');
await put(17, 2, 'right'); await key('Space'); await says(); await snap('m6-model');
await ev(`${G}.S.sanity = 100`); await key('Space'); await key('Space');
t.ok(await ev(`${G}.S.sanity`) < 99 && await ev(`${G}.S.organs.length`) === 1, 'M6 오답: 틀린 자리에 놓으면 정신력 -5, 장기는 돌아온다');
await key('Space'); for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'Space', 'KeyX']) await key(k); await says();
t.ok(await ev(`${G}.S.placed[0]`) === 'heart', 'M6 정답: 심장이 제자리에 들어간다');
await save();

const labToChase = async () => {
  await warp('lab', 9, 9, 'up'); await says();
  await put(5, 1, 'up'); await key('Space');
  for (let i = 0; i < 3; i++) { await says(); await key('ArrowRight'); await sleep(350); }
  await says();
};
await use(15, 1, 'up'); t.ok(await flag('lab_open') === 1, '4장: 실험실 열쇠로 문을 연다');
await labToChase();
t.ok(await flag('lab_in') === 1 && await flag('m7_lung') === 1 && await ev(`${G}.S.organs.includes('lung')`) && await ev(`${G}.W.p.x`) === 8, 'M7-1: 윤하의 장난에 세 번 물러나다 전시장에 부딪혀 폐를 얻는다');
await use(9, 9, 'down'); t.ok(!await flag('m7_acid') && await ev(`${G}.S.map`) === 'lab', 'M7: 형체가 나오기 전에는 문이 꿈쩍도 하지 않는다');
await use(8, 1, 'up');
t.ok(await flag('m7_chase') === 1 && await ev(`${G}.S.notes.includes('diary1')`), 'M7-2: <제물의 일기장>을 읽고 닫으면 붉은 형체가 나온다'); await snap('m7-red');
await ev(`${G}.S.items.splice(${G}.S.items.indexOf('acid'), 1)`);
await use(9, 9, 'down'); t.ok(!await flag('m7_acid'), 'M7: 황산이 없으면 문을 녹일 수 없다');
await use(2, 8, 'left'); t.ok(await ev(`${G}.S.items.includes('acid')`), 'M7 막힘 방지: 황산을 안 챙겼어도 개수대 아래에 예비 황산이 있다');
await put(9, 9, 'up');
await died('M7 실패: 붉은 형체에게 붙잡히면 죽는다');

await labToChase(); await use(8, 1, 'up'); await use(9, 9, 'down');
t.ok(await flag('m7_acid') === 1, 'M7-3: 문 앞에서 황산을 쓴다');
await page.keyDown('Space'); await sleep(1500); await page.keyUp('Space');
const g1 = await flag('m7_melt'); await sleep(600);
t.ok(g1 > 0.05 && Math.abs(await flag('m7_melt') - g1) < 0.01, 'M7-3: 누르고 있는 동안만 게이지가 차고, 떼도 줄지 않는다'); await snap('m7-melt');
await page.keyDown('Space'); await page.until(`${G}.S.map === 'science'`, 30000); await page.keyUp('Space'); await says();
t.ok(await flag('m7_end') === 1 && await ev(`${G}.W.chasing`) === false, 'M7 성공: 문이 녹아 열리고, 과학실로 돌아오면 추격이 끝난다');
await put(17, 2, 'right'); await key('Space'); await says(); await key('Space'); for (const k of ['Space', 'KeyX']) await key(k); await says();
t.ok(await ev(`${G}.S.placed.includes('lung')`), 'M6: 폐도 제자리에 들어간다');
await save();

const toTentacle = async () => {
  await warp('vent', 27, 1, 'right'); await says();
  await walkTo('ArrowRight', `${G}.UI.stack.length > 0`); await says();
};
await use(2, 10, 'left'); await key('Space'); await page.until(`${G}.S.map === 'vent'`); await says();
t.ok(await ev(`${G}.W.speedMul`) === 0.5, 'M8: 환풍구에서는 기어가서 속도가 절반이다');
await use(38, 1, 'right'); t.ok(await ev(`${G}.S.map`) === 'vent', 'M8 막힘 방지: 창자를 얻기 전에는 환풍구 끝으로 나갈 수 없다');
await toTentacle(); await snap('m8-mash');
await died('M8 실패: 게이지를 못 채우면 촉수에 끌려간다');
await toTentacle();
await ev(`${G}.settings.holdMash = true`);
await page.keyDown('Space'); await page.until(`${G}.UI.modal?.kind === 'say'`, 20000); await page.keyUp('Space'); await says();
await ev(`${G}.settings.holdMash = false`);
await key('Space'); await sleep(800); await says();
t.ok(await flag('m8_done') === 1 && await ev(`${G}.W.p.x`) === 31, 'M8 성공: (길게 누르기 옵션) 게이지를 채우고 윤하의 손을 잡아 빠져나온다');
await put(30, 1, 'left'); await key('Space'); await says(); await key('Space'); await says();
t.ok(await ev(`${G}.S.organs.includes('intestine')`), 'M8: 촉수를 당겨 창자를 얻는다');
await put(38, 1, 'right'); await walkTo('ArrowRight', `${G}.S.map === 'auditorium'`); await says();
t.ok(await flag('c5_in') === 1, '4장 끝: 환풍구를 지나 강당에 도착한다');
t.ok(await ev(`${G}.S.rules.length`) >= 1 && await ev(`${G}.S.puzzles.includes('m6')`), '일기장에 규칙과 진행 중인 단서가 남아 있다');
await snap('end');

t.done(page);
