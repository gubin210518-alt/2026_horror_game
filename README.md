# 2026_horror_game

학교 하나를 무대로 한 공포 쯔꾸르풍 탈출 웹게임 기획 저장소입니다.

## 문서

| 파일 | 내용 |
|---|---|
| [design/game-brief.md](design/game-brief.md) | 게임 기획 전체: 요약, 인물과 공통 시스템, 전체 스토리라인, 미니게임 M0~M19, 정해야 할 것 |
| [docs/05-build-plan.md](docs/05-build-plan.md) | 구현 계획, 쓸 도구, 단계, 제안에서 바꾼 것 |
| [docs/reference/original-notes.md](docs/reference/original-notes.md) | 참고 작품 정리 노트 |
| [docs/archive/](docs/archive/) | 이전 버전 기획 문서 |

## 실행

```
node server.js
```

브라우저에서 http://localhost:8080 을 엽니다. (`py -m http.server 8080` 으로 켜도 됩니다)

검사는 서버를 켠 채로:

```
node test/check-data.mjs   # 데이터 오타 검사 (서버 없이도 됨)
node test/stage1.mjs       # 엔진 검사
node test/stage2.mjs       # 인트로~4장 통과 검사
```

그림을 직접 만들어 넣으려면 [docs/asset-prompts.md](docs/asset-prompts.md) 를 보세요.

## 표기 규칙

- 확정: 연님이 정한 내용
- 제안: Claude가 채운 내용. 연님 확인 필요

## 진행 상황

- [x] 전체 스토리라인 초안
- [x] 미니게임 상세 초안
- [ ] 정해야 할 것 확정 (`design/game-brief.md` 4부)
- [ ] 이미지 제작
- [x] 게임 엔진 뼈대 (이동, 대화창, 조사, 맵 전환)
- [x] 1~4장 구현
- [ ] 5장 이후 구현
- [ ] 테스트
