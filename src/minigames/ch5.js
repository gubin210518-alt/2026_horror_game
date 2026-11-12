// 5장 별실 (M9). 차례제 카메라, 큰 그림 보기와 찢기, 아이템 카드(설명과 회상).
// 경로와 문구 위치는 data/puzzles.json 의 m9, 글은 data/notes.json 에 있다. 기획: design/game-brief.md M9
import { D, S, settings, T, VW, VH } from '../engine/core.js';
import { pressed, consume, lastDir } from '../engine/input.js';
import { push, pop, box, font, wrap, say, drawIcon } from '../engine/ui.js';
import { minigames } from '../engine/events.js';
import { sfx } from '../engine/audio.js';
import { W, DIRS, blocked, walk, npcById, scenes } from '../engine/world.js';
import { pic } from '../engine/gfx.js';

// 흰 방의 타원 창 너머 (cam_frame 그림의 투명한 타원 밑에 깔린다): 별실 배경 위에 윤하를 얹는다.
// stare 빤히 들여다봄, away 옆으로 걸어 나감, back 돌아옴. 자리와 크기는 puzzles.m9.window
function camWindow(phase) {
  return (ctx, x, y, w, h, t) => {
    const o = D.puzzles.m9.window, room = pic(o.room), yun = pic(o.yunha);
    const ox = x + w * o.box[0], oy = y + h * o.box[1], ow = w * o.box[2], oh = h * o.box[3];
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, ow, oh); ctx.clip();
    ctx.fillStyle = '#0a0c12'; ctx.fillRect(ox, oy, ow, oh);
    if (room) { const k = Math.max(ow / room.width, oh / room.height); ctx.drawImage(room, ox + (ow - room.width * k) / 2, oy + (oh - room.height * k) / 2, room.width * k, room.height * k); }
    if (yun) {
      const e = k => k * k * (3 - 2 * k), go = Math.min(1, t / o.walk); // 걸어 나가거나 들어오는 정도
      const off = phase === 'away' ? e(go) : phase === 'back' ? 1 - e(go) : 0, walking = phase !== 'stare' && go < 1;
      const lean = phase === 'stare' ? Math.min(1, t / 6) * 0.06 : 0; // 들여다볼수록 조금씩 다가온다
      const yh = oh * o.size * (1 + lean - off * 0.25), yw = yh * yun.width / yun.height;
      const bob = walking ? Math.abs(Math.sin(t * 7)) * oh * 0.03 : Math.sin(t * 1.6) * oh * 0.006;
      if (off < 1) ctx.drawImage(yun, ox + ow / 2 - yw / 2 + off * ow * 1.1, oy + oh * o.top - lean * oh * 0.3 + off * oh * 0.12 + bob, yw, yh);
    }
    ctx.restore();
  };
}
for (const p of ['stare', 'away', 'back']) scenes[p] = camWindow(p);

function open(build) {
  return new Promise(res => { const m = push(build(v => { pop(m); res(v); })); });
}

// 두 칸 사이의 걸음 글자. 대각선은 가로 한 걸음, 세로 한 걸음으로 나눈다
export function stepsBetween([x0, y0], [x1, y1]) {
  return (x1 > x0 ? 'r' : x1 < x0 ? 'l' : '') + (y1 > y0 ? 'd' : y1 < y0 ? 'u' : '');
}

// 차례제 카메라 (M9). 주인공이 한 칸 움직일 때마다 윤하와 사진기도 정해진 길로 한 칸 움직인다.
// 돌려주는 값: 0 사진기가 마지막 칸에 도착함, 1 도중에 주인공이 사진기와 같은 칸에 섬
// puzzles: camera [[x,y]…], yunha [[x,y]…], camId, yunhaId, headAt(사진기 길에서 머리가 찍히는 순서), liverAt(윤하 길에서 간을 줍는 순서)
minigames.photo = c => open(done => {
  const pz = D.puzzles[c.puzzle], p = W.p;
  const cam = W.objs.find(o => o.id === pz.camId), yun = npcById(pz.yunhaId);
  let turn = 0, acting = false, tween = null; // tween: 사진기가 미끄러지는 중 { from, to, t }
  [cam.x, cam.y] = pz.camera[0];
  if (yun) Object.assign(yun, { x: pz.yunha[0][0], y: pz.yunha[0][1], moving: false, path: null });

  const flashShot = () => { sfx('shutter'); W.flashColor = '#fff'; W.flash = settings.scare ? 0.35 : 0.15; };

  async function step(dir) {
    acting = true;
    const [dx, dy] = DIRS[dir], onCam = p.x + dx === cam.x && p.y + dy === cam.y;
    const moves = [walk(p, dir[0])];
    if (!onCam) { // 사진기가 있는 칸으로 들어가면 그 자리에서 찍힌다. 사진기와 윤하는 움직이지 않는다
      turn++;
      const y0 = pz.yunha[turn - 1], y1 = pz.yunha[turn];
      if (yun && y1) { const s = stepsBetween(y0, y1); moves.push(walk(yun, s, 4 * s.length)); }
      const c1 = pz.camera[turn];
      if (c1) { tween = { from: [cam.x, cam.y], to: c1, t: 0 }; moves.push(new Promise(r => (tween.done = r))); sfx('step'); }
    }
    await Promise.all(moves);
    if (p.x === cam.x && p.y === cam.y) { flashShot(); return done(1); }
    if (turn === pz.headAt && !S.flags.c5_head) { flashShot(); S.flags.c5_head = 1; await say(T('@c5.headShot')); }
    if (turn === pz.liverAt && !S.flags.c5_liver) { S.flags.c5_liver_y = 1; await say(T('@c5.liverPick')); }
    if (turn >= pz.camera.length - 1) return done(0);
    acting = false;
  }

  return {
    kind: 'photo', pause: false, // 걷는 모습이 보이게 필드는 계속 돈다
    update(dt) {
      if (tween) {
        tween.t = Math.min(1, tween.t + dt * 4);
        cam.x = tween.from[0] + (tween.to[0] - tween.from[0]) * tween.t;
        cam.y = tween.from[1] + (tween.to[1] - tween.from[1]) * tween.t;
        if (tween.t >= 1) { [cam.x, cam.y] = tween.to; const r = tween.done; tween = null; r(); }
      }
      if (acting) return;
      for (const k of ['ok', 'cancel']) if (pressed(k)) consume(k);
      const d = lastDir();
      if (!d) return;
      p.dir = d;
      const [dx, dy] = DIRS[d];
      if (!blocked(p.x + dx, p.y + dy, p)) step(d);
    },
    draw(ctx) {
      box(ctx, 150, VH - 40, 340, 28);
      font(ctx, 12); ctx.fillStyle = '#ddd'; ctx.textAlign = 'center';
      ctx.fillText(T(pz.prompt), VW / 2, VH - 22); ctx.textAlign = 'left';
    },
  };
});

// 큰 그림 한 장을 화면 가득 보여 준다. c.photo 면 puzzles 의 photo 설정대로 주인공 이름을 얹고(졸업사진),
// c.tear 면 그림이 세로로 찢어지며 닫힌다. 아니면 Space 로 닫는다
minigames.bigpic = c => open(done => {
  const ph = c.photo ? D.puzzles[c.photo].photo : null;
  let t = 0, tearT = -1, cv = null;
  const edge = Array.from({ length: 15 }, (_, i) => 0.5 + (i % 2 ? 0.035 : -0.035) + Math.sin(i * 12.9898) * 0.012); // 찢어지는 선 (가로 비율)

  function compose(img) { // 그림에 글자를 얹어 한 장으로 만든다
    const k = Math.min((VW - 20) / img.width, (VH - 16) / img.height), w = Math.round(img.width * k), h = Math.round(img.height * k);
    const cc = Object.assign(document.createElement('canvas'), { width: w * 2, height: h * 2 }), g = cc.getContext('2d');
    g.scale(2, 2); g.imageSmoothingQuality = 'high'; scenes[c.scene]?.(g, 0, 0, w, h, 99); g.drawImage(img, 0, 0, w, h);
    if (ph) { // 가운데 사진 아래에 주인공 이름. 다른 학생들의 이름은 그림에 번진 채로 들어 있다
      g.textAlign = 'center'; g.fillStyle = '#26242a';
      font(g, Math.round(h * ph.nameSize), true); g.fillText(S.name, w * ph.name[0], h * ph.name[1]);
    }
    return Object.assign(cc, { dw: w, dh: h });
  }

  return {
    kind: 'bigpic',
    update(dt) {
      t += dt;
      if (tearT >= 0) { if ((tearT += dt) > 1.1) done(true); return; }
      const go = pressed('ok') || pressed('cancel');
      if (go) { consume('ok'); consume('cancel'); }
      if (!cv) return;
      if (c.tear) { if (t > 1.2 || (go && t > 0.4)) { tearT = 0; sfx('tear'); if (settings.shake) W.shake = 0.5; } }
      else if (go && t > 0.4) done(true);
    },
    draw(ctx) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.9, t * 3)})`; ctx.fillRect(0, 0, VW, VH);
      const img = pic(c.image);
      if (!img) return;
      cv ||= compose(img);
      const w = cv.dw, h = cv.dh, x = (VW - w) / 2, y = (VH - h) / 2;
      ctx.imageSmoothingEnabled = true;
      if (tearT < 0) ctx.drawImage(cv, x, y, w, h);
      else { // 찢어지는 선을 따라 두 조각으로 잘라 양옆으로 벌린다
        const k = Math.min(1, tearT / 0.9), e = 1 - Math.pow(1 - k, 2);
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(x + w / 2 + side * e * 70, y + h / 2 + e * 24); ctx.rotate(side * e * 0.14); ctx.translate(-w / 2, -h / 2);
          ctx.beginPath(); ctx.moveTo(side < 0 ? 0 : w, 0);
          edge.forEach((fx, i) => ctx.lineTo(w * fx, h * i / (edge.length - 1)));
          ctx.lineTo(side < 0 ? 0 : w, h); ctx.closePath(); ctx.clip();
          ctx.globalAlpha = 1 - Math.max(0, k - 0.7) / 0.3;
          ctx.drawImage(cv, 0, 0, w, h);
          ctx.restore();
        }
      }
      ctx.imageSmoothingEnabled = false;
      if (tearT < 0 && !c.tear && t > 0.8) { font(ctx, 12); ctx.textAlign = 'right'; ctx.fillStyle = '#aaa'; ctx.fillText(T(c.prompt) || 'Space: 닫기', VW - 12, VH - 10); ctx.textAlign = 'left'; }
    },
  };
});

// 아이템 카드: 아이템 그림과 이름, 설명을 한 장으로 보여 준다 (c.item).
// c.recall 이면 그때의 장면을 떠올리는 회상: 빛바랜 색, 지직거리는 줄, 어두운 가장자리
minigames.itemcard = c => open(done => {
  const it = D.items[c.item], X = 110, Y = 84, BW = 420, BH = 176;
  let t = 0;
  return {
    kind: 'itemcard',
    update(dt) {
      t += dt;
      if ((pressed('ok') || pressed('cancel')) && t > 0.5) { consume('ok'); consume('cancel'); sfx('blip'); done(true); }
    },
    draw(ctx) {
      const re = !!c.recall, a = Math.min(1, t / 0.35);
      ctx.fillStyle = re ? `rgba(18,14,10,${0.82 * a})` : `rgba(0,0,0,${0.6 * a})`; ctx.fillRect(0, 0, VW, VH);
      ctx.globalAlpha = a * (re ? 0.9 + 0.1 * Math.sin(t * 31) * Math.sin(t * 7) : 1);
      box(ctx, X, Y, BW, BH);
      ctx.fillStyle = '#14151c'; ctx.fillRect(X + 18, Y + 20, 104, 104);
      ctx.strokeStyle = '#4a4652'; ctx.strokeRect(X + 18.5, Y + 20.5, 103, 103);
      if (re) ctx.filter = 'grayscale(1) sepia(.55)';
      drawIcon(ctx, c.item, X + 70, Y + 72, 84);
      ctx.filter = 'none';
      font(ctx, 16, true); ctx.fillStyle = re ? '#d8c8a0' : '#ffd27a'; ctx.fillText(it.name, X + 140, Y + 42);
      font(ctx, 13); ctx.fillStyle = re ? '#c8bca4' : '#ddd';
      wrap(T(it.desc), BW - 160, 13).forEach((l, k) => ctx.fillText(l, X + 140, Y + 68 + k * 19));
      if (re) { // 회상 효과
        font(ctx, 12); ctx.fillStyle = '#a89a78'; ctx.fillText(T(c.label) || '— 그때 본 글씨 —', X + 18, Y + BH - 16);
        ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let y = Y; y < Y + BH; y += 3) ctx.fillRect(X, y, BW, 1);
        const ny = Y + ((t * 90) % BH); ctx.fillStyle = 'rgba(255,240,210,.10)'; ctx.fillRect(X, ny, BW, 5);
        const g = ctx.createRadialGradient(VW / 2, VH / 2, 110, VW / 2, VH / 2, 360);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)');
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      }
      ctx.globalAlpha = 1;
      if (t > 0.5 && (performance.now() / 400 | 0) % 2) { font(ctx, 12); ctx.fillStyle = '#ffd27a'; ctx.fillText('▼', X + BW - 22, Y + BH - 12); }
    },
  };
});
