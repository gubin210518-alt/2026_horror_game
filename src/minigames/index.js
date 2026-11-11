// 여러 장면에서 같이 쓰는 미니게임. 정답과 수치는 data/puzzles.json 에 있다.
// 결과: true 성공, false 실패, null 취소(아무 일도 일어나지 않음)
import { D, S, settings, T, VW, VH, josa, heldOrgans } from '../engine/core.js';
import { pressed, consume, down, mouse } from '../engine/input.js';
import { push, pop, box, font, wrap } from '../engine/ui.js';
import { minigames } from '../engine/events.js';
import { sfx } from '../engine/audio.js';
import { W } from '../engine/world.js';
import { pic, itemIcon } from '../engine/gfx.js';

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
    mouse: true,
    update() {
      if (pressed('left')) x = move(x, -1, pz.cols);
      if (pressed('right')) x = move(x, 1, pz.cols);
      if (pressed('up')) y = move(y, -1, pz.rows);
      if (pressed('down')) y = move(y, 1, pz.rows);
      if (mouse.clicked) { // 칸을 직접 눌러서 열 수도 있다
        const cx = Math.floor((mouse.x - ox) / cw), cy = Math.floor((mouse.y - oy) / ch);
        if (cx >= 0 && cx < pz.cols && cy >= 0 && cy < pz.rows) return done(cx + 1 === pz.answer[0] && cy + 1 === pz.answer[1]);
      }
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
      if (i !== Math.floor((t - dt) / gap) && i >= 1 && i <= beats.length) { sfx(i === beats.length ? 'ok' : 'blip'); if (c.voices) sfx(c.voices[i - 1]); } // 목소리가 있으면 같이 읊는다
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

// 인체 모형 (M6). 가진 장기를 골라 맞는 자리에 놓는다.
// puzzles.m6: image(모형 그림), sheet(장기 아이콘 시트), slots [{ id, fx, fy, size }] (그림 안에서의 비율 위치)
minigames.organs = () => open(done => {
  const pz = D.puzzles.m6, slots = pz.slots, kind = id => D.items[id].organ || id;
  const icon = itemIcon;
  // 같은 종류 자리가 여러 개면(신장 2개) 넣은 개수만큼 앞에서부터 찬 것으로 본다
  const placedIn = s => S.placed.filter(p => kind(p) === s.id)[slots.filter(t => t.id === s.id).indexOf(s)];
  const IH = 304, IY = 28; // 모형 그림 높이와 위치
  let phase = 0, oi = 0, si = 0, msg = '', turned = 0;
  return {
    update(dt) {
      turned = Math.max(0, turned - dt);
      if (pressed('cancel')) { consume('cancel'); if (phase) phase = 0; else done(true); return; }
      if (!phase) {
        const n = heldOrgans().length;
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
        const id = heldOrgans()[oi], s = slots[si];
        if (kind(id) === s.id && !placedIn(s)) {
          S.items.splice(S.items.indexOf(id), 1); S.placed.push(id); oi = 0; phase = 0; sfx('get');
          msg = josa(D.items[id].name, '이', '가') + ' 제자리에 들어갔다.';
        } else { // 틀린 자리: 모형이 이쪽을 본다
          S.sanity = Math.max(0, S.sanity - 5); turned = 1.5; phase = 0; sfx('bad');
          if (settings.scare) { W.flashColor = '#400'; W.flash = 0.2; }
          msg = '모형의 고개가 이쪽으로 돌아간다… (정신력 -5)';
        }
      }
    },
    draw(ctx) {
      box(ctx, 30, 14, 580, 332);
      font(ctx, 15, true); ctx.fillStyle = '#ffd27a'; ctx.fillText('인체 모형 (' + S.placed.length + '/' + slots.length + ')', 50, 40);
      const img = pic(pz.image), iw = img ? img.width * IH / img.height : 200, ix = 600 - iw - 30 + (turned ? Math.sin(turned * 40) * 2 : 0);
      ctx.fillStyle = '#12131a'; ctx.fillRect(600 - iw - 44, IY - 6, iw + 28, IH + 12);
      ctx.imageSmoothingEnabled = true;
      if (img) ctx.drawImage(img, ix, IY, iw, IH);
      else { ctx.fillStyle = '#c8b8a0'; ctx.fillRect(ix + iw * 0.25, IY + 20, iw * 0.5, IH - 40); }
      slots.forEach((s, k) => {
        const cx = ix + s.fx * iw, cy = IY + s.fy * IH, sz = s.size * iw, id = placedIn(s), ic = id && icon(id);
        if (ic) { const k2 = sz / Math.max(ic.width, ic.height); ctx.drawImage(ic, cx - ic.width * k2 / 2, cy - ic.height * k2 / 2, ic.width * k2, ic.height * k2); }
        else if (id) { ctx.fillStyle = '#a03030'; ctx.beginPath(); ctx.arc(cx, cy, sz / 3, 0, 7); ctx.fill(); }
        if (phase && k === si) { // 고르는 중인 자리
          ctx.strokeStyle = (performance.now() / 250 | 0) % 2 ? '#fff' : '#ffd27a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, Math.max(10, sz / 2), 0, 7); ctx.stroke(); ctx.lineWidth = 1;
        }
      });
      if (turned) { ctx.fillStyle = 'rgba(120,0,0,.25)'; ctx.fillRect(600 - iw - 44, IY - 6, iw + 28, IH + 12); }
      font(ctx, 14); ctx.fillStyle = '#ccc'; ctx.fillText('가진 장기', 50, 70);
      if (!heldOrgans().length) { ctx.fillStyle = '#888'; ctx.fillText('넣을 장기가 없다.', 50, 98); }
      heldOrgans().forEach((id, k) => {
        const y = 84 + k * 30, ic = icon(id);
        if (k === oi) { ctx.fillStyle = 'rgba(255,210,122,.15)'; ctx.fillRect(46, y - 2, 230, 28); }
        if (ic) { const k2 = 24 / Math.max(ic.width, ic.height); ctx.drawImage(ic, 62 - ic.width * k2 / 2, y + 12 - ic.height * k2 / 2, ic.width * k2, ic.height * k2); }
        ctx.fillStyle = k === oi ? '#fff' : '#999';
        ctx.fillText((k === oi ? (phase ? '● ' : '▶ ') : '   ') + D.items[id].name, 82, y + 17);
      });
      ctx.imageSmoothingEnabled = false;
      font(ctx, 13); ctx.fillStyle = '#e0a0a0'; wrap(msg, 250, 13).forEach((l, k) => ctx.fillText(l, 50, 292 + k * 18));
      font(ctx, 12); ctx.fillStyle = '#777';
      ctx.fillText(phase ? '방향키: 자리 고르기   Space: 놓기   X: 뒤로' : 'Space: 장기 고르기   X: 닫기', 50, 334);
    },
  };
});

// 그림 속 인물 고르기 (M2). 그림을 크게 띄우고, 인물을 누르거나 ←→ 와 Space 로 고른다. 고른 번호(0부터)를 돌려준다.
// puzzles: images { base, blood: [3장], full }, regions [{ name, x0, x1, y0, y1 }] (그림 안에서의 비율)
// 제한 시간이 흐르는 동안에는 남은 시간에 따라 피가 차오른 그림으로 바뀐다. c.image 를 주면 그 그림으로 고정, c.must 면 취소할 수 없다
minigames.painting = c => open(done => {
  const pz = D.puzzles[c.puzzle], R = pz.regions, live = !!W.timer && !c.image;
  let sel = 0, hover = -1, mx = mouse.x, my = mouse.y;
  const url = () => {
    if (c.image) return c.image;
    const t = W.timer;
    if (!t) return pz.images.base;
    const k = t.left / t.total;
    return pz.images.blood[k > 0.66 ? 0 : k > 0.33 ? 1 : 2];
  };
  const rect = img => { const k = Math.min(560 / img.width, 286 / img.height), w = img.width * k, h = img.height * k; return { x: (VW - w) / 2, y: 8, w, h }; };
  return {
    pause: false, mouse: true, // 고르는 동안에도 피는 계속 차오른다
    update() {
      if (live && !W.timer) return done(null); // 시간이 다 되면 닫힌다
      const img = pic(url());
      hover = -1;
      if (img) {
        const r = rect(img), fx = (mouse.x - r.x) / r.w, fy = (mouse.y - r.y) / r.h;
        hover = R.findIndex(q => fx >= q.x0 && fx <= q.x1 && fy >= q.y0 && fy <= q.y1);
        if (hover >= 0 && (mouse.x !== mx || mouse.y !== my)) sel = hover; // 마우스를 움직였을 때만 따라간다 (키보드로 고르는 중에 덮어쓰지 않게)
        mx = mouse.x; my = mouse.y;
        if (mouse.clicked && hover >= 0) { sfx('ok'); return done(hover); }
      }
      if (pressed('left')) { sel = move(sel, -1, R.length); sfx('blip'); }
      if (pressed('right')) { sel = move(sel, 1, R.length); sfx('blip'); }
      if (pressed('ok')) { consume('ok'); sfx('ok'); done(sel); }
      else if (pressed('cancel') && !c.must) { consume('cancel'); done(null); }
    },
    draw(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,.82)'; ctx.fillRect(0, 0, VW, VH);
      const img = pic(url());
      if (!img) return;
      const r = rect(img), q = R[sel];
      ctx.imageSmoothingEnabled = true; ctx.drawImage(img, r.x, r.y, r.w, r.h); ctx.imageSmoothingEnabled = false;
      const x = r.x + q.x0 * r.w, y = r.y + q.y0 * r.h, w = (q.x1 - q.x0) * r.w, h = (q.y1 - q.y0) * r.h;
      ctx.strokeStyle = (performance.now() / 300 | 0) % 2 ? '#fff' : '#ffd27a'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); ctx.lineWidth = 1;
      font(ctx, 13, true);
      const tw = ctx.measureText(q.name).width + 16;
      ctx.fillStyle = 'rgba(8,8,14,.9)'; ctx.fillRect(x + w / 2 - tw / 2, y + h - 22, tw, 20);
      ctx.fillStyle = '#ffd27a'; ctx.textAlign = 'center'; ctx.fillText(q.name, x + w / 2, y + h - 8);
      box(ctx, 60, VH - 58, VW - 120, 46);
      font(ctx, 14, true); ctx.fillStyle = c.must ? '#ff8080' : '#eee'; ctx.fillText(T(c.title) || '', VW / 2, VH - 38);
      font(ctx, 12); ctx.fillStyle = '#888'; ctx.fillText('인물을 누르거나, ←→ 로 고르고 Space' + (c.must ? '' : '   X: 그만 보기'), VW / 2, VH - 20);
      ctx.textAlign = 'left';
    },
  };
});
