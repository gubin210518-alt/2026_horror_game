// Web Audio로 직접 만드는 효과음. 파일을 쓰지 않는다.
import { settings } from './core.js';

let ac;
// [파형, 시작 주파수, 끝 주파수, 길이(초), 크기]
const P = {
  blip: ['square', 520, 520, 0.04, 0.15],
  ok: ['square', 660, 880, 0.07, 0.18],
  get: ['triangle', 520, 1040, 0.18, 0.3],
  door: ['noise', 300, 120, 0.18, 0.35],
  locked: ['square', 140, 110, 0.12, 0.25],
  step: ['noise', 180, 90, 0.05, 0.12],
  alert: ['sawtooth', 300, 900, 0.3, 0.35],
  scare: ['noise', 2000, 200, 0.5, 0.8],
  die: ['sawtooth', 220, 40, 0.9, 0.5],
  save: ['triangle', 392, 784, 0.4, 0.3],
  bad: ['sawtooth', 160, 90, 0.25, 0.3],
  glass: ['noise', 9000, 2500, 0.35, 0.7],
  scream: ['sawtooth', 500, 1400, 0.7, 0.45],
  shutter: ['noise', 7000, 500, 0.09, 0.6],
  wheel: ['noise', 900, 260, 0.22, 0.35],
  tear: ['noise', 5200, 700, 0.75, 0.65],
};

// 여럿이 키득거리는 소리: 짧게 끊어지는 높은 음이 조금씩 내려간다
function laugh(vol) {
  const t0 = ac.currentTime;
  for (let voice = 0; voice < 3; voice++) for (let i = 0; i < 9; i++) {
    const t = t0 + voice * 0.07 + i * (0.105 + voice * 0.012), f = (760 - i * 28) * (1 + voice * 0.12);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = voice === 1 ? 'triangle' : 'square';
    o.frequency.setValueAtTime(f * 1.15, t); o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11 * vol * settings.sfx, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.09);
  }
}

export function sfx(name, vol = 1) {
  try {
    ac ||= new AudioContext();
    if (ac.state === 'suspended') ac.resume();
    const buf = buffers[name];
    if (buf) { // 파일로 넣은 소리 (game.json sounds)
      const src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = buf; g.gain.value = vol * settings.sfx; src.connect(g); g.connect(ac.destination); src.start();
      return;
    }
    if (name.startsWith('v_')) return; // 목소리 파일이 없으면 조용히 넘어간다
    if (name === 'laugh') return laugh(vol);
    const [type, f0, f1, dur, v] = P[name] || P.blip;
    const t = ac.currentTime, g = ac.createGain();
    g.gain.setValueAtTime(v * vol * settings.sfx, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g.connect(ac.destination);
    let src;
    if (type === 'noise') {
      const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      src.connect(f); f.connect(g);
    } else {
      src = ac.createOscillator(); src.type = type;
      src.frequency.setValueAtTime(f0, t); src.frequency.exponentialRampToValueAtTime(f1, t + dur);
      src.connect(g);
    }
    src.start(t); src.stop(t + dur);
  } catch { /* 소리가 안 나도 게임은 계속 */ }
}

// 배경음: 낮게 웅웅거리는 소리와 바람. 추격 중에는 심장 박동이 겹친다. 모두 합성음
let bgm;
export function music(chasing) {
  try {
    if (!ac || ac.state !== 'running') return; // 첫 입력으로 소리가 켜진 뒤부터
    const t = ac.currentTime;
    if (!bgm) {
      const master = ac.createGain(), pulse = ac.createGain();
      master.gain.value = 0; pulse.gain.value = 0;
      master.connect(ac.destination); pulse.connect(ac.destination);
      for (const [f, v] of [[55, 0.5], [58.3, 0.4], [110.4, 0.12]]) { // 서로 조금 어긋난 낮은 음이 울렁거린다
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(master); o.start();
      }
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const wind = ac.createBufferSource(), wf = ac.createBiquadFilter(), wg = ac.createGain();
      wind.buffer = buf; wind.loop = true; wf.type = 'bandpass'; wf.frequency.value = 320; wf.Q.value = 0.8; wg.gain.value = 0.18;
      wind.connect(wf); wf.connect(wg); wg.connect(master); wind.start();
      const lfo = ac.createOscillator(), lg = ac.createGain(); // 바람이 세졌다 약해졌다
      lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(wf.frequency); lfo.start();
      const heart = ac.createOscillator(), am = ac.createGain(), beat = ac.createOscillator(), bg = ac.createGain(); // 심장 박동
      heart.frequency.value = 48; am.gain.value = 0; beat.type = 'square'; beat.frequency.value = 2.3; bg.gain.value = 1;
      beat.connect(bg); bg.connect(am.gain); heart.connect(am); am.connect(pulse); heart.start(); beat.start();
      bgm = { master, pulse };
    }
    bgm.master.gain.setTargetAtTime(settings.bgm * 0.16, t, 0.8);
    bgm.pulse.gain.setTargetAtTime(chasing ? settings.bgm * 0.5 : 0, t, 0.3);
  } catch { /* 소리가 안 나도 게임은 계속 */ }
}

// 소리 파일을 미리 받아 둔다. 이름 → 경로 (data/game.json 의 sounds). 없는 파일은 건너뛰고 합성음을 쓴다
const buffers = {};
export async function loadSounds(map = {}) {
  try { ac ||= new AudioContext(); } catch { return; }
  await Promise.all(Object.entries(map).map(async ([name, url]) => {
    try {
      const r = await fetch(url);
      if (r.ok) buffers[name] = await ac.decodeAudioData(await r.arrayBuffer());
    } catch { /* 파일이 없거나 못 읽으면 합성음 */ }
  }));
}

// 첫 입력에 소리를 켠다
for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, () => { try { ac ||= new AudioContext(); if (ac.state === 'suspended') ac.resume(); } catch { /* 무시 */ } }, { passive: true });
