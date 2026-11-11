// M0 인트로: 게임 안에서 그린 가짜 컴퓨터. 실제 다운로드나 브라우저 알림창은 쓰지 않는다.
// 바탕화면, 폴더, 메모장, 사진 보기, 시작 메뉴, 인터넷 창이 간단히 동작한다. 글과 파일 목록은 data/dialog.json 의 intro 에 있다.
// 끝나면 플레이어 이름을 돌려준다.
import { D, VW as GW, VH as GH } from '../engine/core.js';
import { mouse, pressed, consume } from '../engine/input.js';
import { push, pop, font, wrap } from '../engine/ui.js';
import { sfx } from '../engine/audio.js';
import { pic } from '../engine/gfx.js';

// 가짜 컴퓨터 화면의 해상도. 게임 화면(640x360)보다 촘촘하게 그려서, 아이콘과 창이 실제 바탕화면처럼 작게 보인다
const VW = 960, VH = 540;
const ms = { get x() { return mouse.x * VW / GW; }, get y() { return mouse.y * VH / GH; } }; // 이 해상도로 바꾼 마우스 위치
const hit = (r, x = ms.x, y = ms.y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const TASK = 26; // 작업 표시줄 높이

export function intro() {
  return new Promise(res => {
    const L = D.dialog.intro, K = L.desktop, canvas = document.getElementById('c');
    let scene = 'login', name = '', t = 0, cancels = 0, progress = 0, toastText = '', toastT = 0, startOpen = false, downloaded = false;
    let wins = [];       // 열린 창들. 뒤에 있을수록 위
    let dialogs = [];    // 다운로드 창들 { x, y, cancel: {dx,dy}, close: {dx,dy} }
    let drag = null, wasDown = false;

    // 한글 입력을 위해 이름 칸만 진짜 입력 상자를 캔버스 위에 겹친다
    const input = Object.assign(document.createElement('input'), { maxLength: 8, placeholder: L.namePlaceholder });
    Object.assign(input.style, { position: 'fixed', font: '16px "Malgun Gothic",sans-serif', textAlign: 'center', background: 'rgba(255,255,255,.92)', border: '1px solid #8aa', borderRadius: '6px', outline: 'none' });
    document.body.appendChild(input);
    const place = () => {
      const r = canvas.getBoundingClientRect(), k = r.width / VW;
      Object.assign(input.style, { left: r.left + (VW / 2 - 90) * k + 'px', top: r.top + 306 * k + 'px', width: 180 * k + 'px', height: 26 * k + 'px', fontSize: 14 * k + 'px' });
    };
    place(); input.focus();
    const login = () => { name = input.value.trim() || L.defaultName; input.remove(); scene = 'desktop'; t = 0; sfx('ok'); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) login(); });
    const loginBtn = { x: VW / 2 - 40, y: 342, w: 80, h: 26 };

    // ----- 바탕화면 아이콘 (두 줄) -----
    const icons = () => [...K.icons, ...(downloaded ? [{ label: L.exeName, kind: 'exe', open: 'exe' }] : [])]
      .map((ic, i) => ({ ...ic, x: 12 + Math.floor(i / 4) * 66, y: 10 + (i % 4) * 62, w: 60, h: 56 }));

    // ----- 창 -----
    const SIZE = { folder: [300, 190], note: [300, 200], photo: [300, 210], pc: [280, 150], browser: [520, 292], msg: [260, 100] };
    const openWin = (type, data = {}) => {
      const same = wins.find(w => w.type === type && w.key === data.key);
      if (same) { wins = wins.filter(w => w !== same).concat(same); return same; }
      const [w, h] = SIZE[type], n = wins.length;
      const win = { type, ...data, w, h, x: type === 'browser' ? 220 : 300 + (n % 4) * 24, y: type === 'browser' ? 100 : 120 + (n % 4) * 20 };
      wins.push(win); sfx('blip');
      return win;
    };
    const open = what => {
      if (what === 'browser') return openWin('browser', { key: 'browser', page: 'board', title: L.browserTitle });
      if (what === 'pc') return openWin('pc', { key: 'pc', title: K.pcTitle });
      if (what === 'noapp') return openWin('msg', { key: 'noapp', title: K.noappTitle, text: K.noapp });
      if (what === 'exe') return openWin('msg', { key: 'exe', title: L.exeName, text: L.running });
      if (what.startsWith('file:')) { const f = K.files[what.slice(5)]; return openWin('note', { key: what, title: f.title + ' - ' + K.notepad, text: f.text }); }
      if (what.startsWith('photo:')) { const f = K.photos[what.slice(6)]; return openWin('photo', { key: what, title: f.title, image: f.image, text: f.text }); }
      const f = K.folders[what];
      return openWin('folder', { key: what, title: f.title, folder: what });
    };
    const closeBtn = w => ({ x: w.x + w.w - 24, y: w.y + 3, w: 20, h: 18 });
    const titleBar = w => ({ x: w.x, y: w.y, w: w.w - 26, h: 24 });
    const folderFiles = w => {
      const f = K.folders[w.folder], list = [...f.files];
      if (w.folder === 'games' && downloaded) list.push({ name: L.exeName, kind: 'exe', open: 'exe' });
      return list.map((file, i) => ({ ...file, x: w.x + 14 + (i % 4) * 70, y: w.y + 60 + Math.floor(i / 4) * 62, w: 64, h: 56 }));
    };
    // 인터넷 창 안의 누를 곳
    const postRow = (w, i) => ({ x: w.x + 16, y: w.y + 104 + i * 26, w: w.w - 32, h: 24 });
    const attachBtn = w => ({ x: w.x + 24, y: w.y + 222, w: 230, h: 24 });
    const backBtn = w => ({ x: w.x + 8, y: w.y + 30, w: 22, h: 18 });

    // ----- 다운로드 창 -----
    const newDialog = (x, y) => ({ x, y, cancel: { dx: 200, dy: 96 }, close: { dx: 276, dy: 4 } });
    const btnRect = (d, k) => (k === 'close' ? { x: d.x + d.close.dx, y: d.y + d.close.dy, w: 18, h: 16 } : { x: d.x + d[k].dx, y: d.y + d[k].dy, w: 80, h: 24 });
    const dlRect = d => ({ x: d.x + 20, y: d.y + 96, w: 100, h: 24 });
    const message = () => [L.dl0, L.dl1, L.dl2, L.dl3.replaceAll('{name}', name)][Math.min(3, cancels)];
    const toast = s => { toastText = s; toastT = 2.2; };

    // ----- 작업 표시줄 -----
    const startBtn = { x: VW / 2 - 84, y: VH - TASK + 3, w: 22, h: 20 };
    const taskApps = [{ kind: 'folder', open: 'docs', x: VW / 2 + 20 }, { kind: 'net', open: 'browser', x: VW / 2 + 46 }, { kind: 'txt', open: 'file:homework', x: VW / 2 + 72 }];
    const startMenu = { x: VW / 2 - 140, y: VH - TASK - 176, w: 220, h: 170 };
    const startItems = () => K.startApps.map((a, i) => ({ ...a, x: startMenu.x + 14 + i * 66, y: startMenu.y + 40, w: 60, h: 56 }));
    const powerBtn = { x: startMenu.x + startMenu.w - 34, y: startMenu.y + startMenu.h - 28, w: 22, h: 20 };

    // 자동 테스트용: 지금 화면에서 누를 곳들
    window.__intro = () => {
      const ic = icons(), b = wins.find(w => w.type === 'browser'), top = wins[wins.length - 1], d = dialogs[dialogs.length - 1];
      const mid = r => [(r.x + r.w / 2) * GW / VW, (r.y + r.h / 2) * GH / VH];
      return { scene, cancels, dialogs, windows: wins.map(w => w.type), page: b?.page, ui: {
        net: mid(ic.find(i => i.kind === 'net')), folder: mid(ic.find(i => i.open === 'docs')), note: mid(ic.find(i => i.kind === 'txt')),
        close: top ? mid(closeBtn(top)) : null, start: mid(startBtn), back: b ? mid(backBtn(b)) : null,
        otherPost: b ? mid(postRow(b, 0)) : null, gamePost: b ? mid(postRow(b, L.posts.findIndex(p => p.open))) : null, attach: b ? mid(attachBtn(b)) : null,
        dlNo: d ? mid(btnRect(d, 'cancel')) : null, dlX: d ? mid(btnRect(d, 'close')) : null, dlYes: d ? mid(dlRect(d)) : null,
      } };
    };

    const m = push({
      kind: 'intro', mouse: true,
      update(dt) {
        t += dt; toastT -= dt;
        const click = mouse.clicked, pressedNow = mouse.down && !wasDown;
        wasDown = mouse.down;
        if (scene === 'login') { place(); if (click && hit(loginBtn)) login(); return; }

        if (scene === 'desktop') {
          // 세 번 취소한 뒤에는 다운로드 말고는 누를 수 없다: 버튼이 커서를 피해 도망간다
          if (cancels >= 3) for (const d of dialogs) for (const k of ['cancel', 'close']) {
            const r = btnRect(d, k), cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = cx - ms.x, dy = cy - ms.y, dist = Math.hypot(dx, dy);
            if (dist < 70) {
              const b = d[k], sp = 420 * dt / (dist || 1);
              b.dx = Math.max(-d.x + 4, Math.min(VW - d.x - r.w - 4, b.dx + dx * sp));
              b.dy = Math.max(-d.y + 4, Math.min(VH - d.y - r.h - 4, b.dy + dy * sp));
            }
          }
          // 창 끌기
          if (drag) {
            if (!mouse.down) drag = null;
            else { drag.w.x = Math.max(-drag.w.w + 60, Math.min(VW - 60, ms.x - drag.dx)); drag.w.y = Math.max(0, Math.min(VH - TASK - 24, ms.y - drag.dy)); }
          } else if (pressedNow && !dialogs.length) {
            for (let i = wins.length - 1; i >= 0; i--) {
              const w = wins[i];
              if (hit(titleBar(w))) { wins = wins.filter(x => x !== w).concat(w); drag = { w, dx: ms.x - w.x, dy: ms.y - w.y }; break; }
              if (hit(w)) break;
            }
          }
          if (!click) return;

          for (let i = dialogs.length - 1; i >= 0; i--) { // 다운로드 창이 맨 위
            const d = dialogs[i];
            if (hit(dlRect(d))) { dialogs = []; wins = []; startOpen = false; scene = 'download'; t = 0; sfx('ok'); return; }
            if (hit(btnRect(d, 'cancel'))) { cancels++; sfx(cancels >= 2 ? 'bad' : 'blip'); if (cancels >= 3) sfx('alert'); return; }
            if (hit(btnRect(d, 'close'))) { // X를 누르면 창이 하나 더 생긴다
              dialogs.push(newDialog(120 + Math.random() * 540, 80 + Math.random() * 270)); sfx('bad'); return;
            }
            if (hit({ x: d.x, y: d.y, w: 300, h: 134 })) return;
          }
          if (dialogs.length) return;

          if (startOpen) {
            const it = startItems().find(a => hit(a));
            startOpen = false;
            if (it) return void open(it.open);
            if (hit(powerBtn)) return void (toast(K.power), sfx('bad'));
            if (hit(startMenu)) return;
          }
          for (let i = wins.length - 1; i >= 0; i--) {
            const w = wins[i];
            if (!hit(w)) continue;
            wins = wins.filter(x => x !== w).concat(w);
            if (hit(closeBtn(w))) { wins = wins.filter(x => x !== w); sfx('blip'); return; }
            if (w.type === 'folder') { const f = folderFiles(w).find(f => hit(f)); if (f) open(f.open); }
            if (w.type === 'browser') {
              if (w.page === 'post' && hit(backBtn(w))) { w.page = 'board'; return; }
              if (w.page === 'board') L.posts.forEach((p, k) => { if (hit(postRow(w, k))) { w.page = 'post'; w.post = k; sfx('ok'); } });
              else if (L.posts[w.post].open && hit(attachBtn(w))) { dialogs = [newDialog(330, 200)]; sfx('ok'); }
            }
            return;
          }
          if (hit(startBtn)) { startOpen = !startOpen; sfx('blip'); return; }
          const app = taskApps.find(a => hit({ x: a.x, y: VH - TASK + 3, w: 22, h: 20 }));
          if (app) return void open(app.open);
          const ic = icons().find(i => hit(i));
          if (ic) open(ic.open);
          return;
        }

        if (scene === 'download') { // 다운로드 → 압축 해제 → 실행. 모두 연출
          progress = Math.min(1, t / 6);
          if (progress >= 1) downloaded = true;
          if (t > 7.5) { scene = 'title'; t = 0; sfx('save'); }
          return;
        }
        if (scene === 'title') {
          if (t > 1 && (click || pressed('ok'))) { consume('ok'); scene = 'off'; t = 0; sfx('die'); }
          return;
        }
        if (scene === 'off' && t > 2.2) { pop(m); res(name); }
      },

      draw(ctx) { ctx.save(); ctx.scale(GW / VW, GH / VH); this.paint(ctx); ctx.restore(); },

      paint(ctx) {
        const rr = (x, y, w, h, r, fill, stroke) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } };
        const text = (s, x, y, px = 12, color = '#222', bold = false, align = 'left') => { font(ctx, px, bold); ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(s, x, y); ctx.textAlign = 'left'; };
        const wallpaper = blur => {
          const bg = pic(L.wallpaper);
          if (bg) { const k = Math.max(VW / bg.width, VH / bg.height); ctx.imageSmoothingEnabled = true; ctx.drawImage(bg, (VW - bg.width * k) / 2, (VH - bg.height * k) / 2, bg.width * k, bg.height * k); }
          else { const g = ctx.createLinearGradient(0, 0, VW, VH); g.addColorStop(0, '#9cc0e8'); g.addColorStop(1, '#1a4aa8'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
          if (blur) { ctx.fillStyle = 'rgba(20,40,80,.45)'; ctx.fillRect(0, 0, VW, VH); }
        };
        // 종류별 작은 아이콘
        const glyph = (kind, x, y, s = 28) => {
          const u = s / 28;
          if (kind === 'folder') { rr(x, y + 5 * u, 28 * u, 19 * u, 2 * u, '#e8b84a'); rr(x, y + 2 * u, 12 * u, 6 * u, 2 * u, '#d8a030'); rr(x, y + 9 * u, 28 * u, 15 * u, 2 * u, '#f8d070'); }
          else if (kind === 'bin') { rr(x + 6 * u, y + 6 * u, 16 * u, 19 * u, 2 * u, '#dfe8f0', '#8a98a8'); rr(x + 4 * u, y + 3 * u, 20 * u, 4 * u, 1 * u, '#b8c4d0'); for (let i = 0; i < 3; i++) { ctx.fillStyle = '#8a98a8'; ctx.fillRect(x + (10 + i * 4) * u, y + 10 * u, u, 11 * u); } }
          else if (kind === 'pc') { rr(x + 1 * u, y + 3 * u, 26 * u, 17 * u, 2 * u, '#2a3a5a'); rr(x + 3 * u, y + 5 * u, 22 * u, 13 * u, 1 * u, '#5aa0e8'); ctx.fillStyle = '#8a98a8'; ctx.fillRect(x + 11 * u, y + 20 * u, 6 * u, 3 * u); ctx.fillRect(x + 7 * u, y + 23 * u, 14 * u, 2 * u); }
          else if (kind === 'net') { ctx.beginPath(); ctx.arc(x + 14 * u, y + 14 * u, 12 * u, 0, 7); ctx.fillStyle = '#2a8ae0'; ctx.fill(); ctx.strokeStyle = '#d8f0ff'; ctx.lineWidth = 1.2 * u; ctx.beginPath(); ctx.ellipse(x + 14 * u, y + 14 * u, 5 * u, 12 * u, 0, 0, 7); ctx.moveTo(x + 2 * u, y + 14 * u); ctx.lineTo(x + 26 * u, y + 14 * u); ctx.stroke(); ctx.lineWidth = 1; }
          else if (kind === 'img') { rr(x + 2 * u, y + 4 * u, 24 * u, 20 * u, 2 * u, '#fff', '#8a98a8'); rr(x + 4 * u, y + 6 * u, 20 * u, 16 * u, 1 * u, '#7ab8e8'); ctx.fillStyle = '#3a8a4a'; ctx.beginPath(); ctx.moveTo(x + 4 * u, y + 22 * u); ctx.lineTo(x + 12 * u, y + 13 * u); ctx.lineTo(x + 18 * u, y + 19 * u); ctx.lineTo(x + 21 * u, y + 16 * u); ctx.lineTo(x + 24 * u, y + 22 * u); ctx.fill(); }
          else if (kind === 'exe') { // 게임 아이콘: assets/pics/game_icon.png 가 있으면 그 그림, 없으면 창 모양
            const gi = L.exeIcon && pic(L.exeIcon);
            if (gi) { ctx.imageSmoothingEnabled = true; ctx.drawImage(gi, x + 2 * u, y + 2 * u, 24 * u, 24 * u); }
            else { rr(x + 2 * u, y + 3 * u, 24 * u, 22 * u, 2 * u, '#f4f4f8', '#6a7078'); rr(x + 2 * u, y + 3 * u, 24 * u, 6 * u, 2 * u, '#3a4250'); rr(x + 6 * u, y + 12 * u, 9 * u, 10 * u, 1 * u, '#8a1420'); ctx.fillStyle = '#c8ccd4'; ctx.fillRect(x + 17 * u, y + 12 * u, 6 * u, 1.5 * u); ctx.fillRect(x + 17 * u, y + 16 * u, 6 * u, 1.5 * u); ctx.fillRect(x + 17 * u, y + 20 * u, 4 * u, 1.5 * u); }
          }
          else { // 문서
            rr(x + 5 * u, y + 2 * u, 18 * u, 24 * u, 2 * u, '#fff', '#8a98a8');
            ctx.fillStyle = kind === 'doc' ? '#3a7ad8' : '#8a98a8';
            for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 * u, y + (8 + i * 4) * u, (i === 3 ? 7 : 12) * u, 1.5 * u);
          }
        };
        const windowFrame = (w, active) => {
          ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
          rr(w.x, w.y, w.w, w.h, 6, '#f3f5f8'); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
          rr(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1, 6, null, active ? '#7a8aa0' : '#b0b8c4');
          text(w.title, w.x + 10, w.y + 16, 12, active ? '#1a1a1a' : '#777');
          const c = closeBtn(w), hot = hit(c);
          if (hot) rr(c.x, c.y, c.w, c.h, 3, '#e03a3a');
          text('✕', c.x + c.w / 2, c.y + 13, 11, hot ? '#fff' : '#444', false, 'center');
          ctx.fillStyle = '#dde2e8'; ctx.fillRect(w.x + 1, w.y + 24, w.w - 2, 1);
        };
        const button = (r, label, primary, hot) => { rr(r.x, r.y, r.w, r.h, 4, primary ? (hot ? '#1a6ad8' : '#0a5ac8') : (hot ? '#f0f2f6' : '#fdfdfd'), primary ? null : '#b8c0cc'); text(label, r.x + r.w / 2, r.y + r.h / 2 + 4, 12, primary ? '#fff' : '#1a1a1a', false, 'center'); };

        if (scene === 'login') { // 잠금 화면처럼: 위에 큰 시계, 가운데에 사용자
          wallpaper(true);
          text(L.clock.replace(/^\S+\s/, ''), VW / 2, 118, 60, '#fff', false, 'center'); text(K.dateLong, VW / 2, 146, 15, '#e8f0fa', false, 'center');
          ctx.beginPath(); ctx.arc(VW / 2, 228, 40, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
          ctx.fillStyle = '#7a94bc'; ctx.beginPath(); ctx.arc(VW / 2, 216, 14, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(VW / 2, 258, 26, Math.PI * 1.08, Math.PI * 1.92); ctx.fill();
          text(L.loginTitle, VW / 2, 292, 16, '#fff', true, 'center');
          button(loginBtn, L.loginButton, true, hit(loginBtn));
          text(L.loginHint, VW / 2, 388, 11, '#d8e4f4', false, 'center');
          return;
        }
        if (scene === 'title' || scene === 'off') {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
          const k = scene === 'off' ? Math.max(0, 1 - t / 0.5) : 1; // 화면이 꺼진다
          if (k > 0) {
            const gw = 544, gh = 408, gx = (VW - gw) / 2, gy = (VH - gh) / 2; // 4:3 게임 화면
            ctx.save(); ctx.translate(0, VH / 2); ctx.scale(1, k); ctx.translate(0, -VH / 2);
            ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
            const bg = pic(D.game.titleImage);
            if (bg) { const z = Math.max(gw / bg.width, gh / bg.height); ctx.imageSmoothingEnabled = false; ctx.drawImage(bg, gx + (gw - bg.width * z) / 2, gy + (gh - bg.height * z) / 2, bg.width * z, bg.height * z); }
            ctx.fillStyle = 'rgba(0,0,12,.5)'; ctx.fillRect(gx, gy, gw, gh);
            ctx.shadowColor = '#600008'; ctx.shadowBlur = 14; text(D.game.title, VW / 2, gy + 140, 76, '#b01020', true, 'center'); ctx.shadowBlur = 0;
            text(L.gameSub, VW / 2, gy + 172, 13, '#aaa', false, 'center');
            const mx = VW / 2 - 78, my = gy + 232; // 옛 쯔꾸르풍 메뉴 창
            const grad = ctx.createLinearGradient(0, my, 0, my + 96); grad.addColorStop(0, '#2a3a8a'); grad.addColorStop(1, '#101848');
            ctx.fillStyle = grad; ctx.fillRect(mx, my, 156, 96); ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 2; ctx.strokeRect(mx + 1, my + 1, 154, 94); ctx.lineWidth = 1;
            L.titleMenu.forEach((o, i) => {
              if (i === 0 && (t * 2.5 | 0) % 2) { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(mx + 8, my + 10 + i * 26, 140, 24); }
              text(o, VW / 2, my + 28 + i * 26, 15, i === 1 ? '#7a82a8' : '#fff', false, 'center');
            });
            for (let y = gy; y < gy + gh; y += 3) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(gx, y, gw, 1); } // 주사선
            if (scene === 'title' && t > 1) text(L.pressStart, VW / 2, gy + gh - 18, 12, '#ccc', false, 'center');
            ctx.restore();
          } else if (t < 0.9) { ctx.fillStyle = '#fff'; ctx.fillRect(VW / 2 - 90 * (1 - t), VH / 2, 180 * (1 - t), 1); }
          return;
        }

        // ----- 바탕화면 -----
        wallpaper(false);
        const idle = !wins.length && !dialogs.length && scene === 'desktop';
        for (const ic of icons()) {
          const hot = hit(ic) && idle, blink = ic.kind === 'net' && idle && (t * 2 | 0) % 2;
          if (hot || blink) rr(ic.x, ic.y, ic.w, ic.h, 4, blink ? 'rgba(255,240,150,.35)' : 'rgba(255,255,255,.22)', blink ? '#fff8c0' : 'rgba(255,255,255,.5)');
          glyph(ic.kind, ic.x + 16, ic.y + 4);
          font(ctx, 10); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(ic.label, ic.x + 30.5, ic.y + 46.5); ctx.fillStyle = '#fff'; ctx.fillText(ic.label, ic.x + 30, ic.y + 46); ctx.textAlign = 'left';
        }

        // ----- 창들 -----
        wins.forEach((w, i) => {
          windowFrame(w, i === wins.length - 1);
          if (w.type === 'folder') {
            rr(w.x + 8, w.y + 30, w.w - 16, 20, 3, '#fff', '#c8d0da'); text('› ' + w.title, w.x + 16, w.y + 44, 11, '#555');
            const files = folderFiles(w);
            if (!files.length) text(K.folders[w.folder].empty, w.x + w.w / 2, w.y + 110, 12, '#888', false, 'center');
            for (const f of files) {
              if (hit(f) && i === wins.length - 1) rr(f.x, f.y, f.w, f.h, 3, '#dde8f8', '#a8c4e8');
              glyph(f.kind, f.x + 18, f.y + 4); text(f.name.length > 9 ? f.name.slice(0, 8) + '…' : f.name, f.x + 32, f.y + 48, 10, '#222', false, 'center');
            }
          } else if (w.type === 'note') {
            text(K.noteMenu, w.x + 10, w.y + 40, 11, '#555');
            ctx.fillStyle = '#fff'; ctx.fillRect(w.x + 1, w.y + 46, w.w - 2, w.h - 47);
            font(ctx, 12); ctx.fillStyle = '#1a1a1a'; wrap(w.text, w.w - 24, 12).forEach((l, k) => ctx.fillText(l, w.x + 12, w.y + 64 + k * 17));
          } else if (w.type === 'photo') {
            ctx.fillStyle = '#1a1c22'; ctx.fillRect(w.x + 1, w.y + 25, w.w - 2, w.h - 26);
            const im = w.image && pic(w.image);
            if (im) { const k = Math.min((w.w - 20) / im.width, (w.h - 46) / im.height); ctx.imageSmoothingEnabled = true; ctx.drawImage(im, w.x + (w.w - im.width * k) / 2, w.y + 30, im.width * k, im.height * k); }
            text(w.text || '', w.x + w.w / 2, w.y + w.h - 8, 11, '#aaa', false, 'center');
          } else if (w.type === 'pc') {
            K.pc.forEach((l, k) => text(l, w.x + 16, w.y + 48 + k * 20, 12, '#333'));
            rr(w.x + 16, w.y + 116, w.w - 32, 10, 3, '#dde2e8'); rr(w.x + 16, w.y + 116, (w.w - 32) * 0.59, 10, 3, '#2a7ad8');
            const load = scene === 'download' ? 80 + Math.sin(t * 9) * 15 : 6 + Math.abs(Math.sin(t * 1.3)) * 9; // 다운로드 중에는 사용량이 치솟는다
            text(K.cpu + ' ' + Math.round(load) + '%', w.x + 16, w.y + 142, 11, load > 50 ? '#c02020' : '#666');
          } else if (w.type === 'msg') {
            wrap(w.text, w.w - 40, 12).forEach((l, k) => text(l, w.x + 20, w.y + 52 + k * 18, 12, '#222'));
          } else if (w.type === 'browser') {
            rr(w.x + 36, w.y + 30, w.w - 46, 18, 9, '#fff', '#c8d0da'); text(K.url, w.x + 48, w.y + 43, 11, '#555');
            text(w.page === 'post' ? '←' : '⌂', w.x + 19, w.y + 44, 13, w.page === 'post' ? '#1a5ac8' : '#999', false, 'center');
            ctx.fillStyle = '#fff'; ctx.fillRect(w.x + 1, w.y + 54, w.w - 2, w.h - 55);
            ctx.fillStyle = '#2a1014'; ctx.fillRect(w.x + 1, w.y + 54, w.w - 2, 26); text(L.boardTitle, w.x + 16, w.y + 72, 14, '#e8c8c8', true);
            if (w.page === 'board') {
              text(K.boardHead, w.x + 16, w.y + 96, 10, '#999');
              L.posts.forEach((p, k) => {
                const r = postRow(w, k);
                if (hit(r) && i === wins.length - 1) { ctx.fillStyle = '#f0f4fa'; ctx.fillRect(r.x, r.y, r.w, r.h); }
                ctx.fillStyle = '#e4e8ee'; ctx.fillRect(r.x, r.y + r.h, r.w, 1);
                text(p.title, r.x + 8, r.y + 16, 12, p.open ? '#1a2a9a' : '#2a3a6a', !!p.open);
                text(p.by || K.author, r.x + r.w - 130, r.y + 16, 10, '#888'); text(p.date, r.x + r.w - 76, r.y + 16, 10, '#999'); text(String(p.views || 0), r.x + r.w - 8, r.y + 16, 10, '#999', false, 'right');
              });
            } else {
              const p = L.posts[w.post];
              text(p.title, w.x + 16, w.y + 100, 13, '#111', true); text((p.by || K.author) + '  ·  ' + (p.posted || p.date) + '  ·  ' + K.viewsLabel + ' ' + p.views, w.x + 16, w.y + 116, 10, '#999');
              font(ctx, 12); ctx.fillStyle = '#333'; wrap(p.body || '', w.w - 40, 12).forEach((l, k) => ctx.fillText(l, w.x + 16, w.y + 138 + k * 17));
              if (p.open) { const a = attachBtn(w); rr(a.x, a.y, a.w, a.h, 3, hit(a) ? '#dde8f8' : '#eef2f8', '#a8b8d0'); text(L.attach, a.x + 8, a.y + 16, 12, '#1a2a9a'); }
              (p.comments || []).forEach((c, k) => { text(c[0], w.x + 16, w.y + 262 + k * 13, 10, '#666', true); text(c[1], w.x + 70, w.y + 262 + k * 13, 10, '#555'); });
            }
          }
        });

        // ----- 다운로드 창 -----
        for (const d of dialogs) {
          windowFrame({ x: d.x, y: d.y, w: 300, h: 134, title: cancels >= 2 ? L.dlTitleOdd : L.dlTitle }, true);
          ctx.fillStyle = '#f3f5f8'; ctx.fillRect(d.x + 270, d.y + 2, 28, 21); // 닫기 단추는 따로 그린다 (도망가므로)
          font(ctx, 13, cancels >= 3); ctx.fillStyle = cancels >= 3 ? '#a00010' : '#111';
          wrap(message(), 260, 13).forEach((l, i) => ctx.fillText(l, d.x + 20, d.y + 52 + i * 18));
          button(dlRect(d), L.dlYes, true, hit(dlRect(d)));
          button(btnRect(d, 'cancel'), L.dlNo, false, hit(btnRect(d, 'cancel')));
          const c = btnRect(d, 'close'); rr(c.x, c.y, c.w, c.h, 3, hit(c) ? '#e03a3a' : '#f3f5f8'); text('✕', c.x + 9, c.y + 12, 11, hit(c) ? '#fff' : '#444', false, 'center');
        }

        if (scene === 'download') {
          windowFrame({ x: 330, y: 210, w: 300, h: 100, title: L.dlTitle }, true);
          const step = progress < 0.5 ? L.downloading : progress < 1 ? L.extracting : L.running;
          text(step, 350, 252, 13, '#111');
          rr(350, 266, 260, 12, 6, '#dde2e8'); rr(350, 266, Math.max(12, 260 * (progress < 0.5 ? progress * 2 : Math.min(1, progress * 2 - 1))), 12, 6, '#0a5ac8');
        }

        // ----- 시작 메뉴와 작업 표시줄 -----
        if (startOpen) {
          rr(startMenu.x, startMenu.y, startMenu.w, startMenu.h, 8, 'rgba(238,242,248,.97)', '#a8b4c4');
          text(K.pinned, startMenu.x + 14, startMenu.y + 24, 12, '#333', true);
          for (const a of startItems()) { if (hit(a)) rr(a.x, a.y, a.w, a.h, 4, '#dde8f8'); glyph(a.kind, a.x + 16, a.y + 6); text(a.label, a.x + 30, a.y + 50, 10, '#222', false, 'center'); }
          ctx.fillStyle = '#d0d8e2'; ctx.fillRect(startMenu.x + 1, startMenu.y + startMenu.h - 36, startMenu.w - 2, 1);
          ctx.beginPath(); ctx.arc(startMenu.x + 24, startMenu.y + startMenu.h - 18, 9, 0, 7); ctx.fillStyle = '#6a8ab8'; ctx.fill();
          text(name, startMenu.x + 40, startMenu.y + startMenu.h - 14, 12, '#222');
          rr(powerBtn.x, powerBtn.y, powerBtn.w, powerBtn.h, 4, hit(powerBtn) ? '#dde8f8' : null); text('⏻', powerBtn.x + 11, powerBtn.y + 15, 13, '#444', false, 'center');
        }
        ctx.fillStyle = 'rgba(232,238,246,.92)'; ctx.fillRect(0, VH - TASK, VW, TASK);
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, VH - TASK, VW, 1);
        if (startOpen || hit(startBtn)) rr(startBtn.x - 2, startBtn.y - 1, 26, 22, 4, 'rgba(255,255,255,.8)');
        for (let i = 0; i < 4; i++) { ctx.fillStyle = '#1a6ad8'; ctx.fillRect(startBtn.x + 3 + (i % 2) * 9, startBtn.y + 2 + Math.floor(i / 2) * 9, 8, 8); } // 시작 단추
        rr(VW / 2 - 54, VH - TASK + 4, 66, 18, 9, '#fff', '#c8d0da'); text('⌕ ' + L.start, VW / 2 - 46, VH - 9, 10, '#888');
        for (const a of taskApps) { if (hit({ x: a.x, y: VH - TASK + 3, w: 22, h: 20 })) rr(a.x - 2, VH - TASK + 2, 26, 22, 4, 'rgba(255,255,255,.8)'); glyph(a.kind, a.x + 2, VH - TASK + 4, 18); }
        text(L.clock, VW - 10, VH - 14, 10, '#222', false, 'right'); text(K.date, VW - 10, VH - 4, 9, '#444', false, 'right');
        if (toastT > 0) { font(ctx, 12); const tw = ctx.measureText(toastText).width + 20; rr(VW - tw - 10, VH - TASK - 34, tw, 26, 5, 'rgba(30,34,44,.92)'); text(toastText, VW - tw, VH - TASK - 17, 12, '#fff'); }
      },
    });
  });
}
