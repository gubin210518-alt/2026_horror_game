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
await key('Space'); await page.until(`${G}.W.map`); await sleep(500); await shot('02-classroom-wake');
await warp('classroom', 9, 9, 'down'); await shot('03-classroom');
await warp('hall', 3, 12, 'down'); await shot('04-hall');
await warp('art', 12, 5, 'left', { m2_fled: 1, ink1: 1 }); await shot('05-art-sisters');
await warp('library', 11, 5, 'right', { light: 1 }); await shot('06-library');
await key('Space'); await sleep(900); await shot('07-dialog-portrait');
await warp('archive', 5, 4, 'right'); await shot('08-archive');
await ev(`${G}.S.companion = 'yunha'`);
await warp('chase', 6, 2, 'right'); await sleep(2200); await shot('09-chase');
await warp('science', 9, 6, 'up'); await shot('10-science');
await warp('lab', 8, 2, 'up', { m7_chase: 1 }); await sleep(600); await shot('11-lab-red');
await warp('vent', 24, 1, 'right'); await shot('12-vent');
await key('Tab'); await shot('13-status'); await key('Tab');
page.close(); process.exit(0);
