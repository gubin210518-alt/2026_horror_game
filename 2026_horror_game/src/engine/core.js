// 공용 상태: 불러온 데이터(D), 게임 상태(S), 설정, 세이브, 조건식, 문자열 치환
export const VW = 640, VH = 360, TILE = 32;
export const D = { maps: {} };

const SAVE = 'bihyeonsil.save', SET = 'bihyeonsil.settings';
function readLS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }

// 접근성 옵션. scare: 0 끔, 1 약하게, 2 강하게
export const settings = Object.assign({ timingWide: false, holdMash: false, scare: 2, shake: true, bgm: 0.6, sfx: 0.8 }, readLS(SET) || {});
export function saveSettings() { try { localStorage.setItem(SET, JSON.stringify(settings)); } catch { /* 저장 실패는 무시 */ } }

export const S = {};
export function resetState(name) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, {
    name: name || '나', map: null, x: 0, y: 0, dir: 'down', flags: {}, items: [], organs: [], placed: [],
    ink: 0, coins: 0, sanity: 100, goal: '', notes: [], rules: [], puzzles: [], hints: {},
    hintsUsed: 0, deaths: 0, saves: 0, companion: null, hide: { id: null, n: 0 }, pos: {},
  });
}
resetState();

// 일기장 세이브. 실패해도 false만 돌려주고 게임은 계속된다.
export function save() {
  try { localStorage.setItem(SAVE, JSON.stringify(S)); return localStorage.getItem(SAVE) != null; } catch { return false; }
}
export function hasSave() { return !!readLS(SAVE)?.map; }
export function loadSave() {
  const d = readLS(SAVE);
  if (!d || !d.map) return false;
  resetState(d.name);
  Object.assign(S, d);
  return true;
}

// 조건식: "flag", "!flag", "has:아이템", "organ:장기", "count>=3", "a & b", "a | b"
function val(k) {
  if (k.startsWith('has:')) return S.items.includes(k.slice(4));
  if (k.startsWith('organ:')) return S.organs.includes(k.slice(6)) || S.placed.includes(k.slice(6));
  if (k.startsWith('placed:')) return S.placed.includes(k.slice(7));
  if (k.startsWith('rule:')) return S.rules.includes(k.slice(5));
  if (k === 'organs') return S.organs.length;
  if (k === 'placed') return S.placed.length;
  if (['ink', 'coins', 'sanity', 'companion', 'saves'].includes(k)) return S[k];
  return S.flags[k] || 0;
}
function term(t) {
  t = t.trim();
  const neg = t[0] === '!';
  if (neg) t = t.slice(1).trim();
  const m = t.match(/^([\w.:가-힣]+)\s*(>=|<=|==|>|<)\s*(-?\d+)$/);
  let r;
  if (m) {
    const v = +val(m[1]) || 0, n = +m[3];
    r = { '>=': v >= n, '<=': v <= n, '==': v === n, '>': v > n, '<': v < n }[m[2]];
  } else r = !!val(t);
  return neg ? !r : r;
}
export function cond(e) {
  if (e == null || e === '') return true;
  if (typeof e === 'boolean') return e;
  return e.split('|').some(part => part.split('&').every(term));
}

// "@a.b" 는 dialog.json 에서 찾고, {name} 은 플레이어 이름으로 바꾼다
export function T(s) {
  if (typeof s !== 'string') return s;
  if (s[0] === '@') {
    let v = D.dialog;
    for (const k of s.slice(1).split('.')) v = v?.[k];
    if (v == null) return s;
    s = v;
  }
  return typeof s === 'string' ? s.replaceAll('{name}', S.name) : s.map(T);
}

// 받침에 따라 조사 고르기: josa('잉크','을','를') → '잉크를'
export function josa(word, withBatchim, without) {
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : false;
  return word + (has ? withBatchim : without);
}
