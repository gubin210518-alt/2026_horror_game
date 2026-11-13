// 5장 별실 (M9). 차례제 카메라, 큰 그림 보기와 찢기, 아이템 카드(설명과 회상), 깨진 글씨 종이, 흰 방의 타원 창.
// 경로와 문구 위치는 data/puzzles.json 의 m9, 글은 data/notes.json 에 있다. 기획: design/game-brief.md M9
import { D, S, settings, T, VW, VH } from '../engine/core.js';
import { pressed, consume, lastDir } from '../engine/input.js';
import { push, pop, box, font, wrap, say, drawIcon } from '../engine/ui.js';
import { minigames } from '../engine/events.js';
import { sfx } from '../engine/audio.js';
import { W, DIRS, blocked, walk, npcById, scenes } from '../engine/world.js';
import { pic } from '../engine/gfx.js';

const smooth = k => k * k * (3 - 2 * k), clamp = k => Math.min(1, Math.max(0, k));
const rnd = i => { const s = Math.sin(i * 127.1 + 3.3) * 43758.5453; return s - Math.floor(s); }; // 순서마다 늘 같은 값이 나오는 난수

// 흰 방의 타원 창 너머 (cam_frame 그림의 투명한 타원 밑에 깔린다): 별실 배경 위에 윤하를 얹는다.
// stare 빤히 들여다봄, away 몸을 일으켜 돌아서서 방 안쪽으로 걸어감, back 걸어와서 다시 들여다봄. 자리와 크기는 puzzles.m9.window
const yunCache = {};
function yunSprite(dark) { // 앞모습과, 돌아선 뒤의 어두운 뒷모습. 아래쪽은 귀신답게 흐려진다
  const img = pic(D.puzzles.m9.window.yunha), key = dark ? 'd' : 'f';
  if (!img) return null;
  if (yunCache[key]) return yunCache[key];
  const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height }), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  if (dark) { // 뒷모습: 얼굴과 가슴을 긴 머리로 덮고, 양쪽 소매만 남긴다
    const w = c.width, h = c.height;
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#0d0c12';
    g.beginPath(); g.ellipse(w * 0.5, h * 0.3, w * 0.36, h * 0.36, 0, 0, 7); g.fill(); g.fillRect(w * 0.2, h * 0.3, w * 0.6, h);
    g.fillStyle = '#1b1922'; for (let i = 0; i < 26; i++) g.fillRect(w * (0.22 + rnd(i) * 0.56), h * (0.12 + rnd(i + 40) * 0.2), 2, h * (0.3 + rnd(i + 80) * 0.5)); // 머리카락 결
  }
  g.globalCompositeOperation = 'destination-out';
  const gr = g.createLinearGradient(0, c.height * 0.68, 0, c.height); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr; g.fillRect(0, c.height * 0.68, c.width, c.height * 0.32);
  return (yunCache[key] = c);
}
function camWindow(phase) {
  return (ctx, x, y, w, h, t) => {
    const o = D.puzzles.m9.window, room = pic(o.room);
    const ox = x + w * o.box[0], oy = y + h * o.box[1], ow = w * o.box[2], oh = h * o.box[3];
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, ow, oh); ctx.clip();
    ctx.fillStyle = '#0a0c12'; ctx.fillRect(ox, oy, ow, oh);
    if (room) { const k = Math.max(ow / room.width, oh / room.height); ctx.drawImage(room, ox + (ow - room.width * k) / 2, oy + (oh - room.height * k) / 2, room.width * k, room.height * k); }
    const go = clamp(t / o.walk), u = phase === 'away' ? go : phase === 'back' ? 1 - go : 0; // 0 코앞, 1 방 안쪽으로 사라짐
    const seg = (a, b) => smooth(clamp((u - a) / (b - a)));
    const rise = seg(0, 0.2), turn = seg(0.18, 0.36), far = seg(0.32, 1); // 몸을 일으킴 → 돌아섬 → 걸어감
    const spr = yunSprite(turn > 0.5);
    if (spr && u < 1) {
      const lean = phase === 'stare' ? Math.min(1, t / 6) * 0.05 : 0; // 들여다볼수록 조금씩 다가온다
      const yh = oh * o.size * (1 + lean) * (1 - 0.14 * rise) * (1 - 0.62 * far), yw = yh * spr.width / spr.height * Math.abs(Math.cos(turn * Math.PI));
      const step = far > 0 && far < 1 ? Math.abs(Math.sin(far * o.steps * Math.PI)) * oh * 0.03 * (1 - 0.6 * far) : Math.sin(t * 1.6) * oh * 0.005;
      ctx.globalAlpha = 1 - seg(0.86, 1);
      ctx.drawImage(spr, ox + ow * (0.5 + o.to[0] * far) - yw / 2, oy + oh * (o.top - 0.05 * rise - lean * 0.3 + o.to[1] * far) - step, yw, yh);
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

// 차례제 카메라 (M9). 주인공이 한 칸 움직이면, 사진기가 정해진 길로 한 칸, 그다음 윤하가 한 칸 움직인다 (한 번에 하나씩).
// 돌려주는 값: 0 사진기가 마지막 칸에 도착함, 1 도중에 주인공이 사진기와 같은 칸에 섬
// puzzles: camera [[x,y]…], yunha [[x,y]…], camId, yunhaId, headAt(사진기 길에서 머리가 찍히는 순서)
minigames.photo = c => open(done => {
  const pz = D.puzzles[c.puzzle], p = W.p;
  const cam = W.objs.find(o => o.id === pz.camId), yun = npcById(pz.yunhaId);
  let turn = 0, acting = false, tween = null; // tween: 사진기가 미끄러지는 중 { from, to, t }
  [cam.x, cam.y] = pz.camera[0];
  if (yun) Object.assign(yun, { x: pz.yunha[0][0], y: pz.yunha[0][1], moving: false, path: null });

  const flashShot = () => { sfx('shutter'); W.flashColor = '#fff'; W.flash = settings.scare ? 0.35 : 0.15; };
  const pause = ms => new Promise(r => setTimeout(r, ms));

  async function step(dir) {
    acting = true;
    const [dx, dy] = DIRS[dir], onCam = p.x + dx === cam.x && p.y + dy === cam.y;
    await walk(p, dir[0]);
    if (!onCam) { // 사진기가 있는 칸으로 들어가면 그 자리에서 찍힌다. 사진기와 윤하는 움직이지 않는다
      turn++;
      const c1 = pz.camera[turn];
      if (c1) { await pause(pz.gap); sfx('wheel'); await new Promise(r => (tween = { from: [cam.x, cam.y], to: c1, t: 0, done: r })); }
      if (!(p.x === cam.x && p.y === cam.y)) {
        const y0 = pz.yunha[turn - 1], y1 = pz.yunha[turn];
        if (yun && y1) { await pause(pz.gap); const s = stepsBetween(y0, y1); await walk(yun, s, 4 * s.length); }
      }
    }
    if (p.x === cam.x && p.y === cam.y) { flashShot(); return done(1); }
    if (turn === pz.headAt && !S.flags.c5_head) { flashShot(); S.flags.c5_head = 1; await say(T('@c5.headShot')); }
    if (turn >= pz.camera.length - 1) return done(0);
    acting = false;
  }

  return {
    kind: 'photo', pause: false, // 걷는 모습이 보이게 필드는 계속 돈다
    update(dt) {
      if (tween) {
        tween.t = Math.min(1, tween.t + dt * 3);
        const k = smooth(tween.t);
        cam.x = tween.from[0] + (tween.to[0] - tween.from[0]) * k;
        cam.y = tween.from[1] + (tween.to[1] - tween.from[1]) * k;
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
// c.scene 이면 그림의 투명한 곳 밑에 장면을 깔고, c.tear 면 그림이 비스듬히 찢어지며 닫힌다. 아니면 Space 로 닫는다
const SERIF = '"Batang","AppleMyungjo","Noto Serif KR","Nanum Myeongjo",serif';
const GARBLE = '렜귪봑궯뤏귑궬궠궔갃뷁쉛뛣';
minigames.bigpic = c => open(done => {
  const ph = c.photo ? D.puzzles[c.photo].photo : null;
  let t = 0, tearT = -1, cv = null, ripped = false;
  // 찢어지는 선: 오른쪽 위에서 왼쪽 아래로. 큰 굴곡에 잔 톱니를 얹는다 (가로, 세로 비율)
  const N = 46, edge = Array.from({ length: N + 1 }, (_, i) => [0.7 - 0.4 * (i / N) + (rnd(i) - 0.5) * 0.045 + Math.sin(i * 0.55) * 0.02 + (i % 2 ? 0.009 : -0.009), i / N]);

  function compose(img) { // 그림에 글자를 얹어 한 장으로 만든다
    const k = ph ? ph.width / img.width : Math.min((VW - 20) / img.width, (VH - 16) / img.height), w = Math.round(img.width * k), h = Math.round(img.height * k);
    const cc = Object.assign(document.createElement('canvas'), { width: w * 2, height: h * 2 }), g = cc.getContext('2d');
    g.scale(2, 2); g.imageSmoothingQuality = 'high'; scenes[c.scene]?.(g, 0, 0, w, h, 99); g.drawImage(img, 0, 0, w, h);
    if (ph) { // 졸업사진: 제목, 가운데 사진 아래에 주인공 이름, 다른 학생들의 이름은 번져서 읽을 수 없다
      g.textAlign = 'center'; g.fillStyle = ph.ink;
      g.font = `bold ${h * ph.titleSize}px ${SERIF}`; g.fillText(T(ph.title), w * 0.5, h * ph.titleY);
      g.font = `bold ${h * ph.nameSize}px ${SERIF}`; g.fillText(S.name, w * ph.name[0], h * ph.name[1]);
      g.filter = 'blur(0.7px)'; g.globalAlpha = 0.8;
      ph.others.forEach(([fx, fy], i) => g.fillText([0, 1, 2].map(j => GARBLE[Math.floor(rnd(i * 3 + j) * GARBLE.length)]).join(''), w * fx, h * fy));
      g.filter = 'none'; g.globalAlpha = 1;
    }
    return Object.assign(cc, { dw: w, dh: h });
  }
  const rip = (g, w, h) => { g.beginPath(); edge.forEach(([fx, fy], i) => g[i ? 'lineTo' : 'moveTo'](w * fx, h * fy)); };

  return {
    kind: 'bigpic',
    update(dt) {
      t += dt;
      if (tearT >= 0) {
        tearT += dt;
        if (tearT > 0.9 && !ripped) { ripped = true; sfx('tear'); if (settings.shake) W.shake = 0.5; } // 두 조각이 떨어져 나가는 순간
        if (tearT > 2) done(true);
        return;
      }
      const go = pressed('ok') || pressed('cancel');
      if (go) { consume('ok'); consume('cancel'); }
      if (!cv) return;
      if (c.tear) { if (t > 1.2 || (go && t > 0.4)) { tearT = 0; sfx('tear'); if (settings.shake) W.shake = 0.3; } }
      else if (go && t > 0.4) done(true);
    },
    draw(ctx) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.9, t * 3)})`; ctx.fillRect(0, 0, VW, VH);
      const img = pic(c.image);
      if (!img) return;
      cv ||= compose(img);
      const w = cv.dw, h = cv.dh, x = (VW - w) / 2;
      const y = ph ? 8 + (Math.min(8, VH / 2 - h * ph.focus) - 8) * smooth(clamp((t - 1) / 2.5)) : (VH - h) / 2;
      ctx.imageSmoothingEnabled = true;
      if (tearT < 0) ctx.drawImage(cv, x, y, w, h);
      else {
        // 1) 위쪽부터 벌어진다 (선의 아래 끝을 축으로 양쪽이 돌아간다)  2) 두 조각이 뜯겨 양옆으로 떨어진다
        const a = smooth(clamp(tearT / 0.9)), b = clamp((tearT - 0.9) / 1.1), eb = 1 - Math.pow(1 - b, 2);
        const [hx, hy] = [edge[N][0] * w, h];
        ctx.save(); ctx.translate(x, y);
        if (b === 0) { // 벌어진 틈으로 빛이 샌다
          rip(ctx, w, h); ctx.strokeStyle = `rgba(255,255,255,${0.9 * a})`; ctx.lineWidth = 3 + 22 * a; ctx.shadowColor = '#fff'; ctx.shadowBlur = 18 * a; ctx.stroke(); ctx.shadowBlur = 0;
        }
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(side * eb * 96, eb * eb * 46);
          ctx.translate(hx, hy); ctx.rotate(side * (0.045 * a + 0.16 * eb)); ctx.translate(-hx, -hy);
          ctx.beginPath(); ctx.moveTo(side < 0 ? -w : 2 * w, -h);
          edge.forEach(([fx, fy]) => ctx.lineTo(w * fx, h * fy));
          ctx.lineTo(side < 0 ? -w : 2 * w, 2 * h); ctx.closePath(); ctx.clip();
          ctx.globalAlpha = 1 - clamp((b - 0.65) / 0.35);
          ctx.drawImage(cv, 0, 0, w, h);
          // 찢긴 가장자리: 종이 속살이 드러난 누런 테두리
          rip(ctx, w, h); ctx.lineJoin = 'round';
          ctx.strokeStyle = '#8f7a56'; ctx.lineWidth = 9; ctx.stroke();
          ctx.strokeStyle = '#cdb98e'; ctx.lineWidth = 6; ctx.stroke();
          ctx.strokeStyle = '#efe4c8'; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.imageSmoothingEnabled = false;
      if (tearT < 0 && !c.tear && t > 0.8) { font(ctx, 12); ctx.textAlign = 'right'; ctx.fillStyle = '#aaa'; ctx.fillText(T(c.prompt) || 'Space: 닫기', VW - 12, VH - 10); ctx.textAlign = 'left'; }
    },
  };
});

// 종이 한 장을 보여 준다 (c.note). 쪽지의 glitch 에 든 글자들은 깨진 글씨로 계속 바뀌며 떨린다
minigames.paper = c => open(done => {
  const n = D.notes[c.note], bad = new Set(n.glitch || ''), X = 170, Y = 60, PW = 300, PH = 216;
  const lines = n.text.split('\n').flatMap(l => (l ? wrap(l, PW - 44, 14) : ['']));
  let t = 0;
  return {
    kind: 'paper',
    update(dt) {
      t += dt;
      if ((pressed('ok') || pressed('cancel')) && t > 0.5) { consume('ok'); consume('cancel'); sfx('blip'); done(true); }
    },
    draw(ctx) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.7, t * 3)})`; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#d6cbb2'; ctx.beginPath(); ctx.moveTo(X, Y + 10); // 위쪽이 찢긴 종이
      for (let i = 0; i <= 20; i++) ctx.lineTo(X + PW * i / 20, Y + 4 + rnd(i + 60) * 12);
      ctx.lineTo(X + PW, Y + PH); ctx.lineTo(X, Y + PH); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(90,60,30,.10)'; ctx.fillRect(X, Y + PH - 40, PW, 40);
      font(ctx, 14);
      const tick = Math.floor(t * 9);
      lines.forEach((l, li) => {
        let px = X + 22; const py = Y + 50 + li * 22;
        [...l].forEach((ch, ci) => {
          const wch = ctx.measureText(ch).width;
          if (bad.has(ch)) {
            const g = GARBLE[Math.floor(rnd(tick * 7 + li * 31 + ci) * GARBLE.length)], j = (rnd(tick + ci) - 0.5) * 2;
            ctx.fillStyle = 'rgba(190,30,40,.75)'; ctx.fillText(g, px - 1 + j, py + j);
            ctx.fillStyle = 'rgba(30,60,160,.6)'; ctx.fillText(g, px + 1.5, py);
            ctx.fillStyle = '#2a211c'; ctx.fillText(g, px, py + (rnd(tick * 3 + ci) > 0.8 ? 2 : 0));
          } else { ctx.fillStyle = '#3a2f26'; ctx.fillText(ch, px, py); }
          px += wch;
        });
      });
      if (t > 0.5 && (performance.now() / 400 | 0) % 2) { font(ctx, 12); ctx.fillStyle = '#7a5a2a'; ctx.fillText('▼', X + PW - 22, Y + PH - 10); }
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
      if (t > 0.5 && (performance.now() / 400 | 0) % 2) { font(ctx, 12); ctx.fillStyle = '#7a5a2a'; ctx.fillText('▼', X + BW - 22, Y + BH - 12); }
    },
  };
});
