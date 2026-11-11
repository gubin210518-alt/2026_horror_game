// 의존성 없는 브라우저 자동 테스트 도구. 화면 없는 Edge/Chrome을 띄워 실제 키 입력으로 게임을 조작한다.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function open(url, port = 9400 + Math.floor(Math.random() * 500)) {
  const exe = BROWSERS.find(existsSync);
  if (!exe) throw new Error('Edge 또는 Chrome을 찾지 못했습니다');
  const dir = mkdtempSync(join(tmpdir(), 'cdp-'));
  const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    '--no-first-run', '--window-size=1280,720',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', // 화면이 멈추지 않게
    '--autoplay-policy=no-user-gesture-required', 'about:blank']);
  // 윈도우에서는 브라우저가 프로세스를 여러 개 띄우므로, 이 검사용 폴더를 쓰는 프로세스를 모두 찾아 끝낸다
  const tag = dir.split(/[\/]/).pop();
  const kill = () => (process.platform === 'win32'
    ? spawnSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${tag}*' -and $_.ProcessId -ne $PID } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`])
    : proc.kill());
  process.on('exit', kill); // 검사가 중간에 죽어도 브라우저를 남기지 않는다
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { /* 아직 안 뜸 */ }
  }
  if (!target) { kill(); throw new Error('브라우저가 뜨지 않았습니다'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const waiting = new Map(), errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    waiting.set(++id, res); ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => rej(new Error('브라우저 응답 없음: ' + method)), 20000);
  });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url });
  await sleep(1200);

  const page = {
    errors,
    async ev(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval 실패: ' + expression);
      return r.result.result.value;
    },
    async keyDown(code) { await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: code }); },
    async keyUp(code) { await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code }); },
    // 화면이 n번 그려질 때까지 기다린다. 화면 없는 브라우저는 프레임 속도가 불규칙해서 시간 대신 프레임으로 맞춘다
    frames(n = 2) { return page.ev(`new Promise(r => { let k = ${n}; const f = () => (--k > 0 ? requestAnimationFrame(f) : r(true)); requestAnimationFrame(f); })`); },
    async key(code) { await page.keyDown(code); await page.frames(3); await page.keyUp(code); await page.frames(3); },
    async mouse(type, x, y) { await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); },
    async click(x, y) { await page.mouse('mouseMoved', x, y); await page.mouse('mousePressed', x, y); await page.mouse('mouseReleased', x, y); await sleep(80); },
    async shot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(r.result.data, 'base64')); },
    // 조건이 참이 될 때까지 기다린다
    async until(expression, ms = 8000) {
      for (const end = Date.now() + ms; Date.now() < end;) { if (await page.ev(expression)) return true; await sleep(100); }
      throw new Error('시간 초과: ' + expression);
    },
    close() { ws.close(); kill(); },
  };
  return page;
}

// 작은 검사 도우미
export function checker() {
  const fails = [];
  let n = 0;
  return {
    ok(cond, name) { n++; console.log((cond ? '  통과  ' : '  실패  ') + name); if (!cond) fails.push(name); },
    done(page) {
      if (page.errors.length) { console.log('콘솔 오류:\n' + page.errors.join('\n')); fails.push('콘솔 오류'); }
      console.log(`\n${n}개 중 ${n - fails.length + (page.errors.length ? 1 : 0)}개 통과` + (fails.length ? `, 실패: ${fails.join(', ')}` : ''));
      page.close();
      process.exit(fails.length ? 1 : 0);
    },
  };
}
