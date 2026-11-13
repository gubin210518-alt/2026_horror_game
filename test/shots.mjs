// 화면 확인용 스크린샷. 실행: node server.js 를 켠 뒤  node test/shots.mjs <저장할 폴더>
import { open, sleep } from './cdp.mjs';

const dir = process.argv[2];
if (!dir) { console.log('저장할 폴더를 적어 주세요'); process.exit(1); }
const page = await open('http://localhost:8080/');
const ev = page.ev, G = 'window.__game', key = page.key;
const shot = async name => { await page.frames(4); await page.shot(`${dir}/${name}.png`); await sleep(250); };
const warp = async (map, x, y, d = 'down', flags = {}) => {
  await ev(`Object.assign(${G}.S.flags, ${JSON.stringify(flags)}); ${G}.UI.stack.length = 0; void ${G}.enterMap('${map}',${x},${y},'${d}')`);
  await page.until(`${G}.W.id === '${map}'`); await sleep(500);
  await ev(`${G}.UI.stack.length = 0; ${G}.W.busy = 0`);
};

await page.until(`${G}?.UI.stack.length === 1`, 15000);
await sleep(600); await shot('01-title');
await ev(`localStorage.clear(); ${G}.D.game.intro = false`);
await key('Space'); await page.until(`${G}.W.map`); await sleep(500);
await warp('classroom', 9, 8, 'down'); await shot('02-classroom');
await warp('floor2', 11, 2, 'down', { hall_seen: 1 }); await shot('03-floor2-north');
await warp('floor2', 46, 12, 'right'); await shot('04-floor2-art-window');
await warp('floor2', 25, 27, 'up'); await shot('05-floor2-south');
await warp('art', 9, 6, 'down', { m2_fled: 1 }); await shot('06-art');
await warp('art', 1, 5, 'left', { m2_fled: 1, ink1: 1 }); await shot('07-art-sisters');
await warp('storage', 5, 3, 'right'); await shot('08-storage');
await warp('library', 11, 5, 'right', { light: 1 }); await shot('09-library');
await warp('science', 12, 6, 'up'); await shot('10-science');
await ev(`${G}.S.items = ['candy','flashlight','key_library','paintknife','hammer','heart','lung','intestine']; ${G}.S.placed = []`);
await warp('science', 17, 2, 'right'); await key('Space'); await sleep(400); await key('Space'); await sleep(600); await shot('11-organs-empty');
for (const k of ['Space', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Space']) await key(k); // 심장 넣기
await sleep(400); await shot('12-organs-heart');
await ev(`${G}.UI.stack.length = 0; ${G}.W.busy = 0; ${G}.S.flags.map = 1`);
await warp('floor2', 31, 2, 'down'); await key('KeyM'); await sleep(400); await shot('13-map');
await key('KeyM');
await ev(`${G}.S.companion = 'yunha'`);
await warp('floor2', 28, 28, 'left', { m5_start: 1 }); await sleep(1200); await shot('14-chase');
console.log(page.errors.join('\n').slice(0, 500));
page.close(); process.exit(0);
