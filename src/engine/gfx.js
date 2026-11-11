// 걷기 시트(3칸 x 4줄: 아래, 왼쪽, 오른쪽, 위). 그림 파일이 없으면 임시 도형 시트를 만들어 같은 방식으로 그린다.
import { D } from './core.js';
import { characterSheet } from './art.js';

const cache = {};
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

export function sheet(name) {
  if (cache[name]) return cache[name];
  const a = D.game.actors?.[name] || {};
  cache[name] = characterSheet(a);
  if (a.sheet) loadKeyed(a.sheet).then(c => { cache[name] = c; }).catch(() => { /* 파일이 없으면 임시 시트 유지 */ });
  return cache[name];
}

// 그림 한 장(초상화 등). 아직 못 읽었거나 파일이 없으면 null
const pics = {};
export function pic(url) {
  if (!(url in pics)) { pics[url] = null; loadKeyed(url).then(c => { pics[url] = c; }).catch(() => { /* 파일 없음 */ }); }
  return pics[url];
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
