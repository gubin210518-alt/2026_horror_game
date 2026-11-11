// 걷기 시트(3칸 x 4줄: 아래, 왼쪽, 오른쪽, 위). 그림 파일이 없으면 임시 도형 시트를 만들어 같은 방식으로 그린다.
import { D } from './core.js';

const cache = {};
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

export function sheet(name) {
  if (cache[name]) return cache[name];
  const a = D.game.actors?.[name] || {};
  cache[name] = placeholder(a.color || '#999');
  if (a.sheet) loadKeyed(a.sheet).then(c => { cache[name] = c; }).catch(() => { /* 파일이 없으면 임시 시트 유지 */ });
  return cache[name];
}

// #00FF00 배경을 투명하게 지운 캔버스를 돌려준다
export function loadKeyed(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = canvas(img.width, img.height), g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        if (p[i + 1] > 140 && p[i] < 120 && p[i + 2] < 120 && p[i + 1] > p[i] * 1.4) p[i + 3] = 0;
      }
      g.putImageData(d, 0, 0);
      res(c);
    };
    img.onerror = rej;
    img.src = url;
  });
}

function placeholder(color) {
  const fw = 32, fh = 48, c = canvas(fw * 3, fh * 4), g = c.getContext('2d');
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
    const x = col * fw, y = row * fh;
    g.fillStyle = '#222'; // 다리. 칸마다 번갈아 내밀기
    g.fillRect(x + 10, y + 36, 5, col === 0 ? 11 : 8);
    g.fillRect(x + 17, y + 36, 5, col === 2 ? 11 : 8);
    g.fillStyle = color; g.fillRect(x + 8, y + 19, 16, 18); // 몸
    g.fillStyle = '#e8c9a0'; g.beginPath(); g.arc(x + 16, y + 12, 8, 0, 7); g.fill(); // 머리
    g.fillStyle = '#1a1a1a';
    if (row === 3) { g.beginPath(); g.arc(x + 16, y + 12, 8, 0, 7); g.fill(); } // 뒷모습
    else {
      g.beginPath(); g.arc(x + 16, y + 10, 8, Math.PI, 0); g.fill(); // 앞머리
      if (row === 0) { g.fillRect(x + 12, y + 12, 2, 3); g.fillRect(x + 18, y + 12, 2, 3); }
      if (row === 1) g.fillRect(x + 10, y + 12, 2, 3);
      if (row === 2) g.fillRect(x + 20, y + 12, 2, 3);
    }
  }
  return c;
}
