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
};

export function sfx(name, vol = 1) {
  try {
    ac ||= new AudioContext();
    if (ac.state === 'suspended') ac.resume();
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
