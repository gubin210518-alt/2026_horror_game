// M0 인트로: 게임 안에서 그린 가짜 바탕화면. 실제 다운로드나 브라우저 알림창은 쓰지 않는다.
// 글은 data/dialog.json 의 intro 에 있다. 끝나면 플레이어 이름을 돌려준다.
import { D, VW, VH } from '../engine/core.js';
import { mouse, pressed, consume } from '../engine/input.js';
import { push, pop, font, wrap } from '../engine/ui.js';
import { sfx } from '../engine/audio.js';

const hit = (r, x = mouse.x, y = mouse.y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function intro() {
  return new Promise(res => {
    const L = D.dialog.intro, canvas = document.getElementById('c');
    let scene = 'login', name = '', t = 0, cancels = 0, progress = 0, note = '', noteT = 0;
    let win = null;      // 열린 창: 'board' | 'post' | 'empty'
    let dialogs = [];    // 다운로드 창들 { x, y, btn: { cancel: {dx,dy}, close: {dx,dy} } }

    // 한글 입력을 위해 이름 칸만 진짜 입력 상자를 캔버스 위에 겹친다
    const input = Object.assign(document.createElement('input'), { maxLength: 8, placeholder: L.namePlaceholder });
    Object.assign(input.style, { position: 'fixed', font: '16px "Malgun Gothic",sans-serif', textAlign: 'center', background: '#fff', border: '1px solid #456', outline: 'none' });
    document.body.appendChild(input);
    const place = () => {
      const r = canvas.getBoundingClientRect(), k = r.width / VW;
      Object.assign(input.style, { left: r.left + 230 * k + 'px', top: r.top + 190 * k + 'px', width: 180 * k + 'px', height: 26 * k + 'px', fontSize: 15 * k + 'px' });
    };
    place(); input.focus();
    const login = () => { name = input.value.trim() || L.defaultName; input.remove(); scene = 'desktop'; t = 0; sfx('ok'); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) login(); });

    const icons = L.icons.map((label, i) => ({ label, x: 22, y: 20 + i * 62, w: 56, h: 52, net: i === L.icons.length - 1 }));
    const newDialog = (x, y) => ({ x, y, cancel: { dx: 200, dy: 96 }, close: { dx: 276, dy: 4 } });
    const btnRect = (d, k) => (k === 'close' ? { x: d.x + d.close.dx, y: d.y + d.close.dy, w: 18, h: 16 } : { x: d.x + d[k].dx, y: d.y + d[k].dy, w: 80, h: 24 });
    const dlRect = d => ({ x: d.x + 20, y: d.y + 96, w: 100, h: 24 });
    const message = () => [L.dl0, L.dl1, L.dl2, L.dl3.replaceAll('{name}', name)][Math.min(3, cancels)];
    const say = s => { note = s; noteT = 2; };

    window.__intro = () => ({ scene, cancels, dialogs }); // 자동 테스트용
    const m = push({
      update(dt) {
        t += dt; noteT -= dt;
        const click = mouse.clicked;
        if (scene === 'login') { place(); if (click && hit({ x: 280, y: 228, w: 80, h: 26 })) login(); return; }

        if (scene === 'desktop') {
          // 세 번 취소한 뒤에는 다운로드 말고는 누를 수 없다: 버튼이 커서를 피해 도망간다
          if (cancels >= 3) for (const d of dialogs) for (const k of ['cancel', 'close']) {
            const r = btnRect(d, k), cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = cx - mouse.x, dy = cy - mouse.y, dist = Math.hypot(dx, dy);
            if (dist < 70) {
              const b = d[k], sp = 420 * dt / (dist || 1);
              b.dx = Math.max(-d.x + 4, Math.min(VW - d.x - r.w - 4, b.dx + dx * sp));
              b.dy = Math.max(-d.y + 4, Math.min(VH - d.y - r.h - 4, b.dy + dy * sp));
            }
          }
          if (!click) return;
          for (let i = dialogs.length - 1; i >= 0; i--) { // 위에 있는 창부터
            const d = dialogs[i];
            if (hit(dlRect(d))) { dialogs = []; win = null; scene = 'download'; t = 0; sfx('ok'); return; }
            if (hit(btnRect(d, 'cancel'))) { cancels++; sfx(cancels >= 2 ? 'bad' : 'blip'); if (cancels >= 3) sfx('alert'); return; }
            if (hit(btnRect(d, 'close'))) { // X를 누르면 창이 하나 더 생긴다
              dialogs.push(newDialog(60 + Math.random() * 280, 40 + Math.random() * 160)); sfx('bad'); return;
            }
            if (hit({ x: d.x, y: d.y, w: 300, h: 134 })) return;
          }
          if (dialogs.length) return;
          if (win === 'empty') { win = null; return; } // 빈 폴더는 아무 데나 누르면 닫힌다
          if (win) {
            if (hit({ x: 560, y: 34, w: 20, h: 18 })) { win = win === 'post' ? 'board' : null; return; }
            if (win === 'board') L.posts.forEach((p, i) => { if (hit({ x: 90, y: 96 + i * 30, w: 470, h: 26 })) { if (p.open) { win = 'post'; sfx('ok'); } else say(L.deadPost); } });
            else if (win === 'post' && hit({ x: 100, y: 250, w: 220, h: 24 })) { dialogs = [newDialog(170, 110)]; sfx('ok'); }
            return;
          }
          for (const ic of icons) if (hit(ic)) { if (ic.net) { win = 'board'; sfx('ok'); } else { win = 'empty'; sfx('blip'); } }
          return;
        }

        if (scene === 'download') { // 다운로드 → 압축 해제 → 실행. 모두 연출
          progress = Math.min(1, t / 6);
          if (t > 7.5) { scene = 'title'; t = 0; sfx('save'); }
          return;
        }
        if (scene === 'title') {
          if (t > 1 && (click || pressed('ok'))) { consume('ok'); scene = 'off'; t = 0; sfx('die'); }
          return;
        }
        if (scene === 'off' && t > 2.2) { pop(m); res(name); }
      },

      draw(ctx) {
        const win95 = (x, y, w, h, title) => {
          ctx.fillStyle = '#c8c8c8'; ctx.fillRect(x, y, w, h);
          ctx.fillStyle = '#1a2a6a'; ctx.fillRect(x + 2, y + 2, w - 4, 20);
          ctx.strokeStyle = '#444'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
          font(ctx, 12, true); ctx.fillStyle = '#fff'; ctx.fillText(title, x + 8, y + 16);
        };
        const button = (r, label, hot) => {
          ctx.fillStyle = hot ? '#e8e8e8' : '#d0d0d0'; ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.strokeStyle = '#555'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
          font(ctx, 12); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 4); ctx.textAlign = 'left';
        };

        if (scene === 'login') {
          ctx.fillStyle = '#2a4a7a'; ctx.fillRect(0, 0, VW, VH);
          ctx.textAlign = 'center'; font(ctx, 18, true); ctx.fillStyle = '#fff'; ctx.fillText(L.loginTitle, VW / 2, 150);
          font(ctx, 13); ctx.fillStyle = '#cde'; ctx.fillText(L.loginHint, VW / 2, 176); ctx.textAlign = 'left';
          button({ x: 280, y: 228, w: 80, h: 26 }, L.loginButton);
          return;
        }
        if (scene === 'title' || scene === 'off') {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
          const k = scene === 'off' ? Math.max(0, 1 - t / 0.5) : 1; // 화면이 꺼진다
          if (k > 0) {
            ctx.save(); ctx.translate(VW / 2, VH / 2); ctx.scale(1, k); ctx.textAlign = 'center';
            font(ctx, 46, true); ctx.fillStyle = '#b01020'; ctx.fillText(D.game.title, 0, -10);
            font(ctx, 13); ctx.fillStyle = '#888'; ctx.fillText(L.gameSub, 0, 22);
            if (scene === 'title' && t > 1 && (t * 2 | 0) % 2) { ctx.fillStyle = '#ddd'; ctx.fillText(L.pressStart, 0, 70); }
            ctx.restore(); ctx.textAlign = 'left';
          } else if (t < 0.9) { ctx.fillStyle = '#fff'; ctx.fillRect(VW / 2 - 60 * (1 - t), VH / 2, 120 * (1 - t), 1); }
          return;
        }

        // 바탕화면
        ctx.fillStyle = '#2a6a6a'; ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = '#c8c8c8'; ctx.fillRect(0, VH - 22, VW, 22);
        button({ x: 2, y: VH - 20, w: 50, h: 18 }, L.start);
        font(ctx, 11); ctx.fillStyle = '#111'; ctx.fillText(L.clock, VW - 56, VH - 7);
        for (const ic of icons) {
          const blink = ic.net && !win && !dialogs.length && scene === 'desktop' && (t * 2 | 0) % 2;
          ctx.fillStyle = blink ? '#ffe070' : ic.net ? '#6ab0e8' : '#e8d898'; ctx.fillRect(ic.x + 14, ic.y, 28, 26);
          if (blink) { ctx.strokeStyle = '#fff'; ctx.strokeRect(ic.x + 12.5, ic.y - 1.5, 31, 29); }
          font(ctx, 11); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(ic.label, ic.x + 28, ic.y + 42); ctx.textAlign = 'left';
        }

        if (win === 'empty') {
          win95(200, 90, 240, 120, L.emptyTitle);
          font(ctx, 12); ctx.fillStyle = '#333'; ctx.fillText(L.empty, 220, 150);
          ctx.fillStyle = '#777'; ctx.fillText(L.emptyHint, 220, 176);
        } else if (win) {
          win95(70, 30, 520, 290, L.browserTitle);
          button({ x: 560, y: 34, w: 20, h: 16 }, win === 'post' ? '←' : 'X');
          ctx.fillStyle = '#fff'; ctx.fillRect(78, 56, 504, 256);
          font(ctx, 15, true); ctx.fillStyle = '#801020'; ctx.fillText(L.boardTitle, 92, 80);
          if (win === 'board') {
            L.posts.forEach((p, i) => {
              const r = { x: 90, y: 96 + i * 30, w: 470, h: 26 };
              if (hit(r)) { ctx.fillStyle = '#eef'; ctx.fillRect(r.x, r.y, r.w, r.h); }
              font(ctx, 13, p.open); ctx.fillStyle = p.open ? '#1a2a9a' : '#555'; ctx.fillText(p.title, 100, r.y + 18);
              font(ctx, 11); ctx.fillStyle = '#999'; ctx.fillText(p.date, 500, r.y + 18);
            });
          } else {
            font(ctx, 13, true); ctx.fillStyle = '#111'; ctx.fillText(L.posts.find(p => p.open).title, 92, 106);
            font(ctx, 12); ctx.fillStyle = '#333';
            wrap(L.postBody, 470, 12).forEach((l, i) => ctx.fillText(l, 92, 130 + i * 18));
            const r = { x: 100, y: 250, w: 220, h: 24 };
            ctx.fillStyle = hit(r) ? '#dde' : '#eee'; ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.fillStyle = '#1a2a9a'; ctx.fillText(L.attach, 108, 266);
          }
        }

        for (const d of dialogs) {
          win95(d.x, d.y, 300, 134, cancels >= 2 ? L.dlTitleOdd : L.dlTitle);
          font(ctx, 13, cancels >= 3); ctx.fillStyle = cancels >= 3 ? '#a00010' : '#111';
          wrap(message(), 260, 13).forEach((l, i) => ctx.fillText(l, d.x + 20, d.y + 50 + i * 18));
          button(dlRect(d), L.dlYes, hit(dlRect(d)));
          button(btnRect(d, 'cancel'), L.dlNo, hit(btnRect(d, 'cancel')));
          button(btnRect(d, 'close'), 'X');
        }

        if (scene === 'download') {
          win95(170, 120, 300, 100, L.dlTitle);
          const step = progress < 0.5 ? L.downloading : progress < 1 ? L.extracting : L.running;
          font(ctx, 13); ctx.fillStyle = '#111'; ctx.fillText(step, 190, 162);
          ctx.fillStyle = '#fff'; ctx.fillRect(190, 176, 260, 16);
          ctx.fillStyle = '#1a2a6a'; ctx.fillRect(190, 176, 260 * (progress < 0.5 ? progress * 2 : Math.min(1, progress * 2 - 1)), 16);
        }
        if (noteT > 0) { font(ctx, 12); ctx.fillStyle = '#ffe'; ctx.fillRect(mouse.x + 10, mouse.y + 10, ctx.measureText(note).width + 12, 20); ctx.fillStyle = '#222'; ctx.fillText(note, mouse.x + 16, mouse.y + 24); }
      },
    });
  });
}
