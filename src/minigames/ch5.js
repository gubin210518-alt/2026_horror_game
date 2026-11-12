// 5장 별실 (M9). 차례제 카메라, 큰 그림 보기와 찢기, 약관 화면.
// 경로와 문구 위치는 data/puzzles.json 의 m9, 글은 data/notes.json 에 있다. 기획: design/game-brief.md M9
import { D, S, settings, T, VW, VH } from '../engine/core.js';
import { pressed, consume, lastDir } from '../engine/input.js';
import { push, pop, box, font, wrap, say } from '../engine/ui.js';
import { minigames } from '../engine/events.js';
import { sfx } from '../engine/audio.js';
import { W, DIRS, blocked, walk, npcById } from '../engine/world.js';
import { pic } from '../engine/gfx.js';

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

// 큰 그림 한 장을 화면 가득 보여 준다. c.photo 면 puzzles 의 photo 설정대로 제목과 이름을 얹고(졸업사진),
// c.tear 면 그림이 세로로 찢어지며 닫힌다. 아니면 Space 로 닫는다
minigames.bigpic = c => open(done => {
  const ph = c.photo ? D.puzzles[c.photo].photo : null;
  let t = 0, tearT = -1, cv = null;
  const edge = Array.from({ length: 15 }, (_, i) => 0.5 + (i % 2 ? 0.035 : -0.035) + Math.sin(i * 12.9898) * 0.012); // 찢어지는 선 (가로 비율)

  function compose(img) { // 그림에 글자를 얹어 한 장으로 만든다
    const k = Math.min((VW - 20) / img.width, (VH - 16) / img.height), w = Math.round(img.width * k), h = Math.round(img.height * k);
    const cc = Object.assign(document.createElement('canvas'), { width: w * 2, height: h * 2 }), g = cc.getContext('2d');
    g.scale(2, 2); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
    if (ph) {
      g.textAlign = 'center'; g.fillStyle = '#2a2a30';
      font(g, Math.round(h * 0.05), true); g.fillText(T(ph.title), w / 2, h * ph.titleY);
      font(g, Math.round(h * 0.03), true); // 가운데 사진 아래의 이름표: 주인공 이름만 또렷하다
      const nw = g.measureText(S.name).width + h * 0.03;
      g.fillStyle = '#d6cfbf'; g.fillRect(w * ph.name[0] - nw / 2, h * (ph.name[1] - 0.031), nw, h * 0.042);
      g.fillStyle = '#2a2a30'; g.fillText(S.name, w * ph.name[0], h * ph.name[1]);
      g.fillStyle = 'rgba(30,30,36,.75)'; // 다른 학생들의 이름은 뭉개져 있다
      for (const [fx, fy] of ph.smudges) for (let i = 0; i < 3; i++) g.fillRect(w * fx - h * 0.032 + i * h * 0.024, h * fy - h * 0.012, h * 0.016 + (i % 2) * h * 0.004, h * 0.02);
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

// 약관 화면: 쪽지(c.note)의 제목과 본문을 낡은 모니터 같은 화면에 띄운다. 첫 문단은 크게, 나머지는 작게
minigames.terms = c => open(done => {
  const n = D.notes[c.note], paras = n.text.split('\n\n');
  let t = 0;
  return {
    kind: 'terms',
    update(dt) {
      t += dt;
      if ((pressed('ok') || pressed('cancel')) && t > 0.5) { consume('ok'); consume('cancel'); sfx('blip'); done(true); }
    },
    draw(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#3a5266'); g.addColorStop(1, '#1c2a38');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(0,0,0,.14)'; for (let y = 0; y < VH; y += 3) ctx.fillRect(0, y, VW, 1); // 주사선
      ctx.textAlign = 'center';
      const line = (text, y, px, bold, color) => { font(ctx, px, bold); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(text, VW / 2 + 1, y + 1); ctx.fillStyle = color; ctx.fillText(text, VW / 2, y); };
      let y = 44;
      line(n.title, y, 20, true, '#f0f4f0'); y += 28;
      paras.forEach((para, i) => {
        const px = i === 0 ? 20 : i === 1 ? 16 : 11, gap = i === 0 ? 28 : i === 1 ? 24 : 15;
        for (const l of wrap(para, VW - 90, px)) { line(l, y, px, i < 2, i < 2 ? '#f0f4f0' : '#c8d4d8'); y += gap; }
        y += i < 2 ? 22 : 4;
      });
      if (t > 0.5 && (performance.now() / 400 | 0) % 2) line('▼', VH - 10, 12, false, '#ffd27a');
      ctx.textAlign = 'left';
    },
  };
});
