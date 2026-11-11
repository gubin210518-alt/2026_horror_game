// 화면 위에 뜨는 것들: 대화창, 선택지, 상태창, 인벤토리, 일기장, 옵션, 게임오버, 알림
import { D, S, settings, saveSettings, save, T, josa, VW, VH } from './core.js';
import { pressed, consume } from './input.js';
import { sfx } from './audio.js';
import { W } from './world.js';
import { run } from './events.js';
import { sheet, pic } from './gfx.js';
import { actorOf, portrait } from './art.js';

const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const mc = document.createElement('canvas').getContext('2d'); // 글자 폭 재기용

export const UI = { stack: [], toasts: [], hooks: {}, get modal() { return this.stack[this.stack.length - 1]; } };
export const push = m => (UI.stack.push(m), m);
export const pop = m => { const i = UI.stack.indexOf(m); if (i >= 0) UI.stack.splice(i, 1); };

export function font(ctx, px, bold) { ctx.font = `${bold ? 'bold ' : ''}${px}px ${FONT}`; }
export function box(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(26,22,32,.96)'); g.addColorStop(1, 'rgba(8,8,14,.96)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#0c0a08'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = '#a89a6a'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
  ctx.fillStyle = '#d8c890'; // 모서리 장식
  for (const [cx, cy] of [[x + 1, y + 1], [x + w - 4, y + 1], [x + 1, y + h - 4], [x + w - 4, y + h - 4]]) ctx.fillRect(cx, cy, 3, 3);
}
export function wrap(text, maxW, px = 14) {
  font(mc, px);
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      if (mc.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch;
    }
    out.push(line);
  }
  return out;
}
const blink = () => (performance.now() / 400 | 0) % 2;
const eat = (...keys) => keys.forEach(consume);

export function toast(text) { UI.toasts.push({ text, t: 3 }); }

export function say(text, who) {
  text = T(text);
  return new Promise(res => {
    const face = who && actorOf(who), pad = face ? 76 : 0; // 아는 인물이면 초상화를 같이 그린다
    const lines = wrap(text, VW - 96 - pad), total = lines.join('').length;
    let n = 0;
    const m = push({
      kind: 'say',
      update(dt) {
        n += dt * 50;
        if (pressed('ok') || pressed('cancel')) {
          eat('ok', 'cancel');
          if (n < total) n = total; else { pop(m); sfx('blip'); res(); }
        }
      },
      draw(ctx) {
        const h = Math.max(face ? 84 : 72, lines.length * 20 + 26), y = VH - h - 12;
        box(ctx, 24, y, VW - 48, h);
        if (face) {
          const file = D.game.actors[face].portrait, img = file && pic(file), s = sheet(face), p = portrait(s);
          ctx.fillStyle = '#1a1c26'; ctx.fillRect(34, y + 10, 64, 64);
          ctx.imageSmoothingEnabled = false;
          if (img) ctx.drawImage(img, 36, y + 12, 60, 60); else ctx.drawImage(s, p.sx, p.sy, p.sw, p.sh, 36, y + 12, 60, 60);
          ctx.strokeStyle = '#a89a6a'; ctx.strokeRect(34.5, y + 10.5, 63, 63);
        }
        if (who) {
          font(ctx, 13, true);
          box(ctx, 24, y - 24, ctx.measureText(who).width + 24, 24);
          ctx.fillStyle = '#ffd27a'; ctx.fillText(who, 36, y - 7);
        }
        font(ctx, 14); ctx.fillStyle = '#eee';
        let left = Math.floor(n);
        lines.forEach((l, i) => { if (left > 0) { ctx.fillText(l.slice(0, left), 44 + pad, y + 28 + i * 20); left -= l.length; } });
        if (n >= total && blink()) { ctx.fillStyle = '#ffd27a'; ctx.fillText('▼', VW - 52, y + h - 12); }
      },
    });
  });
}

export function choose(opts, { title, cancel = true, pause = true, y: fixedY } = {}) {
  return new Promise(res => {
    const tl = title ? wrap(T(title), VW - 160) : [];
    font(mc, 14);
    const w = Math.max(170, ...opts.map(o => mc.measureText(o).width + 60), ...tl.map(l => mc.measureText(l).width + 36));
    const h = opts.length * 22 + 18 + (tl.length ? tl.length * 20 + 10 : 0);
    let i = 0;
    const m = push({
      pause,
      update() {
        if (pressed('up')) { i = (i + opts.length - 1) % opts.length; sfx('blip'); }
        if (pressed('down')) { i = (i + 1) % opts.length; sfx('blip'); }
        if (pressed('ok')) { eat('ok'); pop(m); sfx('ok'); res(i); }
        else if (cancel && pressed('cancel')) { eat('cancel'); pop(m); res(-1); }
      },
      draw(ctx) {
        const x = (VW - w) / 2, y = fixedY ?? (VH - h) / 2;
        box(ctx, x, y, w, h);
        font(ctx, 14);
        let ty = y + 24;
        ctx.fillStyle = '#ffd27a';
        for (const l of tl) { ctx.fillText(l, x + 18, ty); ty += 20; }
        if (tl.length) ty += 10;
        opts.forEach((o, k) => {
          ctx.fillStyle = k === i ? '#fff' : '#999';
          ctx.fillText((k === i ? '▶ ' : '   ') + o, x + 18, ty + k * 22);
        });
      },
    });
  });
}

// 여러 메뉴가 같이 쓰는 틀: draw 로 그리고, keys 중 하나를 누르면 닫힌다
function panel(draw, keys, extra = {}) {
  return new Promise(res => {
    const m = push({
      pause: !W.chasing, // 추격 중에는 메뉴를 열어도 시간이 흐른다
      update(dt) {
        if (m.lock) return;
        if (keys.some(pressed)) { eat(...keys); pop(m); res(); return; }
        extra.update?.(m);
      },
      draw,
    });
  });
}
function header(ctx, x, y, text) { font(ctx, 15, true); ctx.fillStyle = '#ffd27a'; ctx.fillText(text, x, y); font(ctx, 14); }

export function openStatus() {
  return panel(ctx => {
    box(ctx, 150, 70, 340, 220);
    header(ctx, 170, 98, '상태');
    ctx.fillStyle = '#ccc'; ctx.fillText('정신력', 170, 130);
    ctx.fillStyle = '#333'; ctx.fillRect(230, 119, 220, 12);
    ctx.fillStyle = S.sanity > 40 ? '#5ab0d8' : S.sanity > 20 ? '#d8a040' : '#d84040';
    ctx.fillRect(230, 119, 220 * S.sanity / 100, 12);
    ctx.fillStyle = '#ccc';
    ctx.fillText('목표', 170, 162);
    wrap(S.goal || '(없음)', 220).forEach((l, i) => ctx.fillText(l, 230, 162 + i * 20));
    ctx.fillText('잉크', 170, 222); ctx.fillText(S.ink + '개', 230, 222);
    ctx.fillText('동행', 170, 246); ctx.fillText(S.companion ? D.game.actors[S.companion]?.name || S.companion : '없음', 230, 246);
    ctx.fillStyle = '#777'; font(ctx, 12); ctx.fillText('Tab / X: 닫기', 170, 276);
  }, ['status', 'cancel', 'ok']);
}

export function openInventory() {
  let i = 0;
  return panel(ctx => {
    box(ctx, 110, 36, 420, 288);
    header(ctx, 130, 62, `소지품 (${S.items.length}/${D.game.slots || 8})`);
    if (!S.items.length) { ctx.fillStyle = '#888'; ctx.fillText('아무것도 없다.', 130, 92); }
    S.items.forEach((id, k) => {
      ctx.fillStyle = k === i ? '#fff' : '#999';
      ctx.fillText((k === i ? '▶ ' : '   ') + D.items[id].name, 130, 92 + k * 22);
    });
    ctx.fillStyle = '#aaa'; font(ctx, 13);
    if (S.items[i]) wrap(D.items[S.items[i]].desc, 380, 13).forEach((l, k) => ctx.fillText(l, 130, 276 + k * 18));
    ctx.fillStyle = '#c88'; ctx.fillText('장기 주머니: ' + (S.organs.map(o => D.items[o].name).join(', ') || '비어 있음'), 130, 312);
  }, ['inv', 'cancel'], {
    update(m) {
      const n = S.items.length;
      if (pressed('up')) i = Math.max(0, i - 1);
      if (pressed('down')) i = Math.min(Math.max(0, n - 1), i + 1);
      if (pressed('ok') && n) {
        eat('ok'); m.lock = true;
        itemMenu(S.items[i]).then(after => {
          m.lock = false; i = Math.min(i, Math.max(0, S.items.length - 1));
          if (after) { pop(m); after(); } // 사용하면 창을 닫고 효과를 실행
        });
      }
    },
  });
}

// 아이템 하나에 대한 메뉴. 창을 닫고 실행할 일이 있으면 함수를 돌려준다
async function itemMenu(id) {
  const it = D.items[id], opts = ['조사', '사용', '조합', ...(it.key ? [] : ['버리기'])];
  const c = opts[await choose(opts, { title: it.name, pause: !W.chasing })];
  if (c === '조사') await say(it.desc);
  if (c === '사용') {
    if (it.use) return () => run(it.use);
    await say('지금은 쓸 수 없다.');
  }
  if (c === '조합') {
    const others = S.items.filter(o => o !== id);
    if (!others.length) return void await say('조합할 것이 없다.');
    const k = await choose(others.map(o => D.items[o].name), { title: '무엇과 조합할까?', pause: !W.chasing });
    if (k < 0) return;
    const other = others[k], result = it.combine?.[other] || D.items[other].combine?.[id];
    if (!result) return void await say('조합할 수 없다.');
    S.items.splice(S.items.indexOf(id), 1); S.items.splice(S.items.indexOf(other), 1); S.items.push(result);
    sfx('get'); await say(`${josa(D.items[result].name, '을', '를')} 만들었다.`);
  }
  if (c === '버리기' && await choose(['버린다', '그만둔다'], { title: `${josa(it.name, '을', '를')} 버릴까?` }) === 0) {
    S.items.splice(S.items.indexOf(id), 1);
  }
}

async function writeDiary() {
  if (W.chasing) return say('지금은 쓸 수 없다!');
  if (S.ink < 1) return say('잉크가 필요하다.');
  S.ink--; S.saves++;
  if (save()) { sfx('save'); return say('일기를 썼다. 페이지가 붉게 물든다.'); }
  S.ink++; S.saves--;
  return say('글씨가 번져서 기록되지 않았다. (저장에 실패했습니다. 게임은 계속할 수 있습니다)');
}

export function openJournal() {
  if (!S.flags.diary) return say('아직 일기장이 없다.');
  const tabs = ['일기', '단서 정리', '쪽지', '학교 규칙'];
  let tab = 0, i = 0;
  const count = () => [1, S.puzzles.length, S.notes.length, S.rules.length][tab];
  return panel(ctx => {
    box(ctx, 60, 22, 520, 316);
    tabs.forEach((t, k) => { font(ctx, 14, k === tab); ctx.fillStyle = k === tab ? '#ffd27a' : '#777'; ctx.fillText(t, 82 + k * 110, 48); });
    ctx.fillStyle = '#555'; ctx.fillRect(76, 56, 488, 1);
    font(ctx, 14); ctx.fillStyle = '#ccc';
    const row = (text, k, y) => { ctx.fillStyle = k === i ? '#fff' : '#999'; ctx.fillText((k === i ? '▶ ' : '   ') + text, 82, y); };
    if (tab === 0) {
      ctx.fillText('목표', 82, 84);
      wrap(S.goal || '(없음)', 440).forEach((l, k) => ctx.fillText(l, 130, 84 + k * 20));
      ctx.fillText(`지금까지 쓴 일기: ${S.saves}번`, 82, 150);
      row(`일기를 쓴다 (잉크 ${S.ink}개)`, 0, 190);
      ctx.fillStyle = '#777'; font(ctx, 12);
      ctx.fillText('일기를 쓰면 죽었을 때 이곳에서 다시 시작한다. 잉크 1개가 든다.', 82, 214);
    } else if (tab === 1) {
      if (!S.puzzles.length) ctx.fillText('지금은 막힌 것이 없다.', 82, 84);
      S.puzzles.forEach((id, k) => row(D.puzzles[id].title, k, 84 + k * 22));
      const id = S.puzzles[i];
      if (id) {
        const lv = S.hints[id] || 0, hints = D.puzzles[id].hints;
        let y = 200;
        ctx.fillStyle = '#bbb'; font(ctx, 13);
        for (let k = 0; k < lv; k++) for (const l of wrap(`${k + 1}단계: ${hints[k]}`, 470, 13)) { ctx.fillText(l, 82, y); y += 18; }
        ctx.fillStyle = '#777';
        ctx.fillText(lv < hints.length ? `Space: ${lv + 1}단계 힌트 보기 (불이익 없음)` : '힌트를 모두 보았다.', 82, y + 6);
      }
    } else if (tab === 2) {
      if (!S.notes.length) ctx.fillText('주운 쪽지가 없다.', 82, 84);
      S.notes.forEach((id, k) => row(D.notes[id].title, k, 84 + k * 22));
    } else {
      if (!S.rules.length) ctx.fillText('아직 본 규칙이 없다.', 82, 84);
      S.rules.forEach((id, k) => { ctx.fillStyle = '#ccc'; ctx.fillText('· ' + D.rules[id].text, 82, 84 + k * 22); });
    }
    ctx.fillStyle = '#666'; font(ctx, 12); ctx.fillText('←→: 탭   J / X: 닫기', 82, 326);
  }, ['journal', 'cancel'], {
    update(m) {
      if (pressed('left')) { tab = (tab + 3) % 4; i = 0; sfx('blip'); }
      if (pressed('right')) { tab = (tab + 1) % 4; i = 0; sfx('blip'); }
      if (pressed('up')) i = Math.max(0, i - 1);
      if (pressed('down')) i = Math.min(Math.max(0, count() - 1), i + 1);
      if (!pressed('ok')) return;
      eat('ok');
      const done = () => { m.lock = false; };
      if (tab === 0) { m.lock = true; writeDiary().then(done); }
      if (tab === 1 && S.puzzles[i]) {
        const id = S.puzzles[i], lv = S.hints[id] || 0;
        if (lv < D.puzzles[id].hints.length) { S.hints[id] = lv + 1; S.hintsUsed++; sfx('ok'); }
      }
      if (tab === 2 && S.notes[i]) { m.lock = true; say(D.notes[S.notes[i]].text || '(아무것도 적혀 있지 않다.)').then(done); }
    },
  });
}

export function openOptions() {
  const rows = [
    ['타이밍 판정 넓히기', 'timingWide', 'bool'], ['연타를 길게 누르기로', 'holdMash', 'bool'],
    ['깜짝 연출 강도', 'scare', ['끔', '약하게', '강하게']], ['화면 흔들림', 'shake', 'bool'],
    ['배경음 볼륨', 'bgm', 'vol'], ['효과음 볼륨', 'sfx', 'vol'],
  ];
  let i = 0;
  const change = d => {
    const [, k, type] = rows[i];
    if (type === 'bool') settings[k] = !settings[k];
    else if (type === 'vol') settings[k] = Math.max(0, Math.min(1, Math.round((settings[k] + d * 0.1) * 10) / 10));
    else settings[k] = (settings[k] + d + type.length) % type.length;
    saveSettings(); sfx('blip'); UI.hooks.volume?.();
  };
  return new Promise(res => {
    const m = push({
      update() {
        if (pressed('up')) i = (i + rows.length - 1) % rows.length;
        if (pressed('down')) i = (i + 1) % rows.length;
        if (pressed('left')) change(-1);
        if (pressed('right') || pressed('ok')) { eat('ok'); change(1); }
        if (pressed('cancel')) { eat('cancel'); pop(m); res(); }
      },
      draw(ctx) {
        box(ctx, 130, 60, 380, 240);
        header(ctx, 150, 88, '옵션');
        rows.forEach(([label, k, type], n) => {
          const v = settings[k], text = type === 'bool' ? (v ? '켜짐' : '꺼짐') : type === 'vol' ? Math.round(v * 10) + ' / 10' : type[v];
          ctx.fillStyle = n === i ? '#fff' : '#999';
          ctx.fillText((n === i ? '▶ ' : '   ') + label, 150, 122 + n * 26);
          ctx.fillText('◀ ' + text + ' ▶', 380, 122 + n * 26);
        });
        ctx.fillStyle = '#666'; font(ctx, 12); ctx.fillText('←→: 바꾸기   X: 닫기', 150, 286);
      },
    });
  });
}

// 학교 안내도 (M). data/schoolmap.json 을 그린다
export function openMap() {
  const M = D.schoolmap;
  return panel(ctx => {
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#cfc4a0'; ctx.fillRect(16, 12, VW - 32, VH - 24);          // 누런 종이
    ctx.strokeStyle = '#6a5c3a'; ctx.strokeRect(16.5, 12.5, VW - 33, VH - 25);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(90,70,30,.06)'; ctx.fillRect(16 + (i * 53) % (VW - 40), 12 + (i * 97) % (VH - 30), 30, 2); }
    font(ctx, 14, true); ctx.fillStyle = '#3a2c18'; ctx.fillText(M.title, 30, 32);
    const c = M.corridor, th = c.thick;
    ctx.fillStyle = '#a89c78'; ctx.fillRect(c.x, c.y, c.w, c.h);                  // 복도 (ㅁ자)
    ctx.fillStyle = '#7a8a6a'; ctx.fillRect(c.x + th, c.y + th, c.w - th * 2, c.h - th * 2); // 중정
    ctx.strokeStyle = '#4a3c20'; ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1); ctx.strokeRect(c.x + th + 0.5, c.y + th + 0.5, c.w - th * 2 - 1, c.h - th * 2 - 1);
    ctx.textAlign = 'center'; font(ctx, 13); ctx.fillStyle = '#3a4a30'; ctx.fillText(M.courtyard, c.x + c.w / 2, c.y + c.h / 2 + 4);
    let here = null;
    for (const r of M.rooms) {
      const cur = r.map?.includes(S.map);
      ctx.fillStyle = r.dark ? '#1a1612' : cur ? '#e8d890' : '#ddd2ae'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#4a3c20'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      font(ctx, 12, cur); ctx.fillStyle = r.dark ? '#1a1612' : '#2a2010'; ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2 + 4);
      if (cur) here = [r.x + r.w / 2, r.y + r.h - 6];
    }
    font(ctx, 11); ctx.fillStyle = '#6a5c3a';
    for (const g of M.wings) ctx.fillText(g.label, g.x + 32, g.y);
    if (S.map === c.map) here = [c.x + (S.x / c.mapW) * c.w, c.y + (S.y / c.mapH) * c.h];
    if (here && blink()) { ctx.fillStyle = '#b01020'; ctx.beginPath(); ctx.arc(here[0], here[1], 4, 0, 7); ctx.fill(); }
    ctx.textAlign = 'left'; font(ctx, 11); ctx.fillStyle = '#5a4c2a';
    ctx.fillText('● 현재 위치   ' + M.note, 30, VH - 22); ctx.fillText('M / X: 접기', VW - 100, VH - 22);
  }, ['map', 'cancel', 'ok']);
}

export async function openPause() {
  const c = await choose(['계속하기', '옵션', '타이틀로'], { title: '일시 정지', pause: !W.chasing });
  if (c === 1) await openOptions();
  if (c === 2 && await choose(['돌아간다', '그만둔다'], { title: '일기에 쓰지 않은 진행은 사라진다.' }) === 0) UI.hooks.title();
}

// 특정 키를 누를 때까지 안내 문구를 띄우고 기다린다
export function waitKey(key, text) {
  return new Promise(res => {
    const m = push({
      update() { if (pressed(key)) { eat(key); pop(m); res(); } },
      draw(ctx) {
        font(ctx, 14, true); ctx.textAlign = 'center';
        const w = ctx.measureText(text).width + 40;
        box(ctx, (VW - w) / 2, VH - 60, w, 34);
        ctx.fillStyle = blink() ? '#fff' : '#ffd27a'; ctx.fillText(text, VW / 2, VH - 38); ctx.textAlign = 'left';
      },
    });
  });
}

export function gameOver(text) {
  return new Promise(res => {
    let t = 0;
    const m = push({
      kind: 'gameover',
      update(dt) { t += dt; if (t > 1.2 && pressed('ok')) { eat('ok'); pop(m); res(); } },
      draw(ctx) {
        ctx.globalAlpha = Math.min(1, t * 2); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
        ctx.textAlign = 'center'; font(ctx, 22, true); ctx.fillStyle = '#b01020';
        wrap(text, 500, 22).forEach((l, k) => ctx.fillText(l, VW / 2, 160 + k * 30));
        if (t > 1.2) { font(ctx, 13); ctx.fillStyle = '#888'; ctx.fillText('Space: 일기를 쓴 곳에서 다시 시작', VW / 2, 250); }
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      },
    });
  });
}

export function drawUI(ctx, dt) {
  for (const m of UI.stack) m.draw(ctx);
  UI.toasts = UI.toasts.filter(t => (t.t -= dt) > 0);
  font(ctx, 13);
  UI.toasts.slice(-3).forEach((t, i) => {
    const w = ctx.measureText(t.text).width + 24;
    ctx.globalAlpha = Math.min(1, t.t);
    box(ctx, (VW - w) / 2, 10 + i * 28, w, 24);
    ctx.fillStyle = '#eee'; ctx.fillText(t.text, (VW - w) / 2 + 12, 27 + i * 28);
    ctx.globalAlpha = 1;
  });
}
