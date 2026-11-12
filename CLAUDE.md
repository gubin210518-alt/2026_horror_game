# 2026_horror_game (비현실)

학교 하나를 무대로 한 공포 쯔꾸르풍 탈출 웹게임. 모든 답변과 게임 속 글은 한국어로 쓴다.

## 이 프로젝트의 작업 방식 (템플릿 규칙보다 우선)

- 진행은 단계 단위. 단계가 끝나면 무엇을 만들었는지, 어떻게 실행하는지, 연님에게 필요한 것이 무엇인지 짧게 보고한다
- 브랜치는 `dev/game-build`. 기능 단위로 한국어 커밋을 남기고 push한다. force push 금지. main에 직접 작업하지 않는다
- 기획 문서의 "확정"은 바꾸지 않는다. "제안"은 기본값으로 구현하되, 바꾸면 `docs/05-build-plan.md`의 "제안에서 바꾼 것"에 이유와 함께 적는다
- 이야기나 엔딩처럼 연님이 정해야 하는 것은 임의로 정하지 않고 묻는다
- 크레딧이 드는 생성(Higgsfield 등) 전에는 잔액을 확인한다. 유료 플랜 가입, 무료 체험 시작, 결제 수단 등록, 구매는 하지 않는다
- 배포: Vercel 실제 사이트(2026sjhg.vercel.app)는 `dev/game-build` 브랜치를 추적한다. 이 브랜치에 push하면 바로 반영된다. main에는 push하지 않는다
- API 키, 토큰, 비밀번호는 커밋하지 않는다
- M0 인트로는 전부 게임 안에서 그린 가짜 화면이다. 실제 파일 다운로드나 브라우저 alert를 쓰지 않는다

## Technology Stack

- **Engine**: Web — 직접 만든 HTML5 Canvas 엔진 (`src/engine/`). 쯔꾸르풍이지만 RPG Maker가 아니다
- **Language**: JavaScript (ES 모듈). 빌드 도구와 외부 라이브러리 없음
- **Version Control**: Git, 작업 브랜치 `dev/game-build`
- **Build System**: 없음. `node server.js` 또는 `py -m http.server 8080` 으로 바로 실행
- **Asset Pipeline**: `assets/` 에 PNG를 넣으면 불러올 때 `#00FF00` 배경을 지우고 칸 여백을 맞춘다 (`src/engine/gfx.js`). 프롬프트와 경로는 `docs/asset-prompts.md`

코드와 데이터 위치:

| 위치 | 내용 |
|---|---|
| `src/engine/` | 엔진 핵심: 입력, 맵과 충돌, 추격 AI, 이벤트 해석기, 메뉴, 세이브, 그림, 소리 |
| `src/minigames/` | 미니게임 (M0 인트로, 격자, 박자, 순서, 연타, 장기) |
| `data/` | 맵, 대사, 아이템, 퍼즐 정답, 규칙 카드, 쪽지 (JSON). 기획 수정은 여기서 한다 |
| `test/` | 데이터 검사, 화면 없는 브라우저로 실제 키 입력을 넣는 통과 검사 |
| `design/game-brief.md` | 게임 기획 전체 (요약, 시스템, 스토리라인, 미니게임, 정해야 할 것) |
| `docs/` | 구현 계획(05), 그림 프롬프트, 출처, 참고 노트 |

## 검사

```
node test/check-data.mjs   # 데이터 오타 검사
node test/stage1.mjs       # 엔진 검사 (서버를 켠 상태에서)
node test/stage2.mjs       # 인트로~4장 통과 검사
```

`.claude/settings.json` 이 `rm -rf` 를 막는다. 임시 폴더를 지우는 대신 새 이름의 폴더를 쓴다.

코드 문법 확인은 파일을 `.mjs` 로 복사해 `node --check` 한다. `.js` 그대로는 모듈 문법 오류를 놓친다.

---

# Claude Code Game Studios 작업 체계

아래는 [Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) v1.3.0 (MIT, `.claude/LICENSE-CCGS`)에서 가져온 내용이다. 위의 "이 프로젝트의 작업 방식"과 다르면 위쪽을 따른다.

49개의 에이전트와 스킬(`.claude/agents/`, `.claude/skills/`)이 영역을 나눠 맡는다.

## Project Structure

@.claude/docs/directory-structure.md

## Technical Preferences

`project.yaml` 이 설정의 기준이다 (엔진, 플랫폼, 이름 규칙, 접근성). 스킬은 `resolve_config` 로 읽는다 (`.claude/docs/config-resolution.md`).

## Coordination Rules

@.claude/docs/coordination-rules.md

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

`.claude/docs/context-management.md` 는 필요할 때 읽는 참고 문서다. 그중 두 가지는 다른 곳에서 이름으로 인용되므로 여기에 적어 둔다.

- **`production/session-state/active.md` 가 세션 체크포인트다.** 압축, 중단, `/clear` 뒤에는 이 파일부터 읽는다
- **`.claude/scripts/` 의 도우미는 관찰만 내놓고 판정하지 않는다**

## 이 프로젝트에서 꺼 둔 것

- 훅(자동 실행 스크립트)과 상태줄, 스크립트 자동 허용 목록은 꺼 두었다. 원래 설정은 `.claude/settings.template.json` 에 그대로 있다. 훅 스크립트를 읽어 본 뒤 켜고 싶으면 그 파일의 `hooks`, `statusLine`, `permissions.allow` 를 `.claude/settings.json` 으로 옮기면 된다
- 위험한 명령을 막는 목록(`permissions.deny`)은 켜져 있다
- 템플릿의 "파일을 쓸 때마다 승인", "지시 없이는 커밋 금지", "trunk 방식" 규칙은 쓰지 않는다
