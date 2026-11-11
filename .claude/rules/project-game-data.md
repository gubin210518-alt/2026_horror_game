---
paths:
  - "data/**/*.json"
  - "src/engine/**"
  - "src/minigames/**"
---

# 2026_horror_game 데이터와 엔진 규칙

이 프로젝트 전용 규칙이다. 쯔꾸르(RPG Maker)용으로 요청된 세 가지 규칙을, 직접 만든 Canvas 엔진에 맞게 옮겼다.

## 1. 데이터와 맵 파일은 고치기 전에 되돌릴 수 있게 한다

- `data/*.json` 과 `data/maps/*.json` 을 고치기 전에, 작업 폴더가 깨끗한지(`git status`) 확인한다. 커밋되지 않은 변경이 있으면 먼저 커밋하거나 파일을 따로 복사해 둔다
- 여러 파일을 한꺼번에 바꾸는 스크립트를 돌릴 때는 돌리기 전에 커밋한다
- 고친 뒤에는 `node test/check-data.mjs` 를 돌린다. 없는 아이템, 없는 대사, 맵 밖 좌표, 막힌 도착 지점을 잡아 준다
- "확정"으로 표시된 기획 내용(정답, 대사, 진행 순서)은 바꾸지 않는다. 연님이 직접 쓴 글(`data/notes.json` 의 <제물의 일기장> 등)은 손대지 않는다

## 2. 엔진 핵심은 함부로 고치지 않는다

- 엔진 핵심은 `src/engine/` (core, input, world, events, ui, gfx, art, audio) 다
- 새 장면이나 퍼즐을 넣으려고 엔진을 고치지 않는다. 먼저 3번의 방법으로 되는지 본다
- 엔진을 고쳐야 한다면(버그, 여러 장면이 같이 쓸 기능) 고친 뒤 `test/stage1.mjs` 와 `test/stage2.mjs` 를 모두 돌린다

## 3. 기능은 데이터(이벤트)나 미니게임 모듈로 추가한다

- 장면, 대사, 아이템, 문, 조건은 `data/` 의 JSON 이벤트 명령으로 만든다 (`say`, `choice`, `give`, `set`, `if`, `goto`, `timer`, `minigame` 등. 전체 목록은 `test/check-data.mjs` 의 COMMANDS)
- 고유한 조작이 필요한 것만 `src/minigames/` 에 모듈로 추가하고, 정답과 수치는 `data/puzzles.json` 에 둔다
- 새 이벤트 명령이나 미니게임을 추가하면 `test/check-data.mjs` 의 목록에도 등록한다
