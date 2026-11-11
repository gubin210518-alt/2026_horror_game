// 여러 장면에서 같이 쓰는 미니게임. 정답과 수치는 data/puzzles.json 에 있다.
// 결과: true 성공, false 실패, null 취소(아무 일도 일어나지 않음)
import { D, S, settings, T, VW } from '../engine/core.js';
import { pressed, consume, down } from '../engine/input.js';
import { push, pop, box, font, wrap } from '../engine/ui.js';
import { minigames } from '../engine/events.js';
import { sfx } from '../engine/audio.js';
import { W } from '../engine/world.js';

function open(build) {
  return new Promise(res => { const m = push(build(v => { pop(m); res(v); })); });
}
const move = (v, d, n) => (v + d + n) % n;
const center = (ctx, text, y) => { ctx.textAlign = 'center'; ctx.fillText(text, VW / 2, y); ctx.textAlign = 'left'; };

// 격자에서 한 칸 고르기 (M1 사물함). puzzles: cols, rows, answer [열, 줄], prompt
minigames.grid = c => open(done => {
  const pz = D.puzzles[c.puzzle], cw = 34, ch = 26, ox = (VW - pz.cols * cw) / 2, oy = 74;
  let x = 0, y = 0;
  return {
    update() {
      if (pressed('left')) x = move(x, -1, pz.cols);
      if (pressed('right')) x = move(x, 1, pz.cols);
      if (pressed('up')) y = move(y, -1, pz.rows);
      if (pressed('down')) y = move(y, 1, pz.rows);
      if (pressed('ok')) { consume('ok'); done(x + 1 === pz.answer[0] && y + 1 === pz.answer[1]); }
      else if (pressed('cancel')) { consume('cancel'); done(null); }
    },
    draw(ctx) {
      box(ctx, ox - 30, 24, pz.cols * cw + 60, pz.rows * ch + 90);
      font(ctx, 14, true); ctx.fillStyle = '#ffd27a'; center(ctx, T(pz.prompt), 48);
      for (let j = 0; j < pz.rows; j++) for (let i = 0; i < pz.cols; i++) {
        const sel = i === x && j === y;
        ctx.fillStyle = sel ? '#8a9ab0' : '#4a5a6a'; ctx.fillRect(ox + i * cw + 2, oy + j * ch + 2, cw - 4, ch - 4);
        ctx.fillStyle = '#222'; ctx.fillRect(ox + i * cw + cw - 10, oy + j * ch + ch / 2 - 2, 3, 4);
        if (sel) { ctx.strokeStyle = '#fff'; ctx.strokeRect(ox + i * cw + 1.5, oy + j * ch + 1.5, cw - 3, ch - 3); }
      }
      font(ctx, 12); ctx.fillStyle = '#888'; center(ctx, '방향키: 고르기   Space: 연다   X: 그만둔다', oy + pz.rows * ch + 24);
    },
  };
});

// 박자에 맞춰 누르기 (M3, M4 액자). "하나, 둘, 셋"의 마지막에 맞춘다
minigames.timing = c => open(done => {
  const beats = c.beats || ['하나', '둘', '셋'], gap = c.gap || 0.9, target = beats.length * gap;
  const win = c.window || 0.7, auto = settings.timingWide; // 판정 넓히기를 켜면 자동 성공
  let t = 0;
  return {
    update(dt) {
      t += dt;
      const i = Math.floor(t / gap);
      if (i !== Math.floor((t - dt) / gap) && i >= 1 && i <= beats.length) sfx(i === beats.length ? 'ok' : 'blip');
      if (auto) { if (t > target + 0.2) done(true); return; }
      if (pressed('ok')) { consume('ok'); done(Math.abs(t - target) <= win); }
      else if (t > target + win) done(false);
    },
    draw(ctx) {
      box(ctx, 170, 110, 300, 120);
      font(ctx, 13); ctx.fillStyle = '#ffd27a'; center(ctx, T(c.title) || '윤하', 134);
      const i = Math.min(beats.length, Math.floor(t / gap));
      font(ctx, 30, true); ctx.fillStyle = '#fff'; center(ctx, i ? beats[i - 1] + (i < beats.length ? '…' : '!') : '…', 180);
      font(ctx, 12); ctx.fillStyle = '#888'; center(ctx, auto ? '(자동으로 맞춰진다)' : `"${beats[beats.length - 1]}"에 맞춰 Space`, 214);
    },
  };
});

// 순서 맞추기 (M4 책). puzzles: start, answer, colors. 현재 순서는 S.flags[c.id] 에 남는다
minigames.order = c => open(done => {
  const pz = D.puzzles[c.puzzle], arr = (S.flags[c.id] || pz.start).slice(), n = arr.length, bw = 44, ox = (VW - n * bw) / 2;
  let i = 0, held = -1;
  return {
    update() {
      if (pressed('left')) i = move(i, -1, n);
      if (pressed('right')) i = move(i, 1, n);
      if (pressed('ok')) {
        consume('ok');
        if (held < 0) held = i; else { [arr[held], arr[i]] = [arr[i], arr[held]]; held = -1; sfx('ok'); }
      } else if (pressed('cancel')) { consume('cancel'); S.flags[c.id] = arr; done(arr.join() === pz.answer.join()); }
    },
    draw(ctx) {
      box(ctx, ox - 40, 90, n * bw + 80, 170);
      font(ctx, 14, true); ctx.fillStyle = '#ffd27a'; center(ctx, T(pz.prompt), 116);
      arr.forEach((name, k) => {
        const y = k === held ? 128 : 138;
        ctx.fillStyle = pz.colors[name]; ctx.fillRect(ox + k * bw + 6, y, bw - 12, 70);
        if (k === i) { ctx.strokeStyle = '#fff'; ctx.strokeRect(ox + k * bw + 4.5, y - 1.5, bw - 9, 73); }
      });
      font(ctx, 12); ctx.fillStyle = '#888'; center(ctx, 'Space: 책을 집고, 바꿀 자리에서 다시 Space   X: 끝내기', 240);
    },
  };
});

// 연타 게이지 (M8 촉수). 옵션에서 "길게 누르기"로 바꿀 수 있다
minigames.mash = c => open(done => {
  let g = 0.15, t = (c.sec || 10) * (settings.timingWide ? 2 : 1);
  const total = t;
  return {
    pause: true,
    update(dt) {
      t -= dt;
      if (settings.holdMash) { if (down('ok')) g += dt * 0.42; }
      else if (pressed('ok')) { consume('ok'); g += 0.075; sfx('blip'); }
      g = Math.max(0, g - dt * 0.06);
      if (g >= 1) done(true); else if (t <= 0) done(false);
    },
    draw(ctx) {
      box(ctx, 150, 120, 340, 100);
      font(ctx, 15, true); ctx.fillStyle = '#ff9090'; center(ctx, T(c.label) || '빠져나오기', 146);
      ctx.fillStyle = '#222'; ctx.fillRect(180, 158, 280, 14);
      ctx.fillStyle = '#9ad84a'; ctx.fillRect(180, 158, 280 * Math.min(1, g), 14);
      ctx.fillStyle = '#400'; ctx.fillRect(180, 178, 280, 4);
      ctx.fillStyle = '#d84040'; ctx.fillRect(180, 178, 280 * t / total, 4);
      font(ctx, 12); ctx.fillStyle = '#aaa'; center(ctx, settings.holdMash ? 'Space를 누르고 있기' : 'Space 연타!', 204);
    },
  };
});

// 인체 모형 (M6). 가진 장기를 골라 맞는 자리에 놓는다. puzzles.m6.slots: [{ id, x, y }]
minigames.organs = () => open(done => {
  const slots = D.puzzles.m6.slots, kind = id => D.items[id].organ || id;
  let phase = 0, oi = 0, si = 0, msg = '', turned = 0;
  // 같은 종류 자리가 여러 개면(신장 2개) 넣은 개수만큼 앞에서부터 찬 것으로 본다
  const filled = s => S.placed.filter(p => kind(p) === s.id).length > slots.filter(t => t.id === s.id).indexOf(s);
  return {
    update(dt) {
      turned = Math.max(0, turned - dt);
      if (pressed('cancel')) { consume('cancel'); if (phase) phase = 0; else done(true); return; }
      if (!phase) {
        const n = S.organs.length;
        if (!n) { if (pressed('ok')) { consume('ok'); done(true); } return; }
        if (pressed('up')) oi = move(oi, -1, n);
        if (pressed('down')) oi = move(oi, 1, n);
        if (pressed('ok')) { consume('ok'); phase = 1; msg = ''; }
        return;
      }
      if (pressed('left') || pressed('up')) si = move(si, -1, slots.length);
      if (pressed('right') || pressed('down')) si = move(si, 1, slots.length);
      if (pressed('ok')) {
        consume('ok');
        const id = S.organs[oi], s = slots[si];
        if (kind(id) === s.id && !filled(s)) {
          S.organs.splice(oi, 1); S.placed.push(id); oi = 0; phase = 0; sfx('get');
          msg = `${D.items[id].name}이(가) 제자리에 들어갔다.`;
        } else { // 틀린 자리: 모형이 이쪽을 본다
          S.sanity = Math.max(0, S.sanity - 5); turned = 1.5; phase = 0; sfx('bad');
          if (settings.scare) { W.flashColor = '#400'; W.flash = 0.2; }
          msg = '모형의 고개가 이쪽으로 돌아간다… (정신력 -5)';
        }
      }
    },
    draw(ctx) {
      box(ctx, 40, 20, 560, 320);
      font(ctx, 15, true); ctx.fillStyle = '#ffd27a'; ctx.fillText(`인체 모형 (${S.placed.length}/${slots.length})`, 60, 46);
      // 몸
      ctx.fillStyle = '#c8b8a0'; ctx.beginPath(); ctx.arc(430 + (turned ? 6 : 0), 80, 30, 0, 7); ctx.fill();
      ctx.fillRect(385, 112, 90, 160); ctx.fillRect(360, 118, 22, 110); ctx.fillRect(478, 118, 22, 110);
      if (turned) { ctx.fillStyle = '#200'; ctx.fillRect(432, 74, 6, 6); ctx.fillRect(448, 74, 6, 6); }
      font(ctx, 11);
      slots.forEach((s, k) => {
        const ok = filled(s), sel = phase && k === si;
        ctx.fillStyle = ok ? '#a03030' : '#5a5048'; ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, 7); ctx.fill();
        if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 13, 0, 7); ctx.stroke(); ctx.lineWidth = 1; }
        if (ok) { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(D.items[S.placed.find(p => kind(p) === s.id)].name[0], s.x, s.y + 4); ctx.textAlign = 'left'; }
      });
      font(ctx, 14); ctx.fillStyle = '#ccc'; ctx.fillText('장기 주머니', 60, 80);
      if (!S.organs.length) { ctx.fillStyle = '#888'; ctx.fillText('넣을 장기가 없다.', 60, 106); }
      S.organs.forEach((id, k) => {
        ctx.fillStyle = k === oi ? '#fff' : '#999';
        ctx.fillText((k === oi ? (phase ? '● ' : '▶ ') : '   ') + D.items[id].name, 60, 106 + k * 22);
      });
      font(ctx, 13); ctx.fillStyle = '#e0a0a0'; wrap(msg, 280, 13).forEach((l, k) => ctx.fillText(l, 60, 286 + k * 18));
      font(ctx, 12); ctx.fillStyle = '#777';
      ctx.fillText(phase ? '방향키: 자리 고르기   Space: 놓기   X: 뒤로' : 'Space: 장기 고르기   X: 닫기', 60, 328);
    },
  };
});
