# 크레딧과 출처

## 그림

| 파일 | 만든 방법 | 비고 |
|---|---|---|
| `assets/chars/player.png`, `yunha.png`, `guard.png`, `red.png` | Higgsfield MCP, 모델 GPT Image 2 (2026-11-11 생성) | 걷기 시트. 프롬프트는 `asset-prompts.md` |
| `assets/portraits/yunha.png` | 같음 | 대화창 초상화 |
| `assets/pics/sisters.png` | 같음 | <가란델가의 자매들> 액자 |
| `assets/pics/title.png` | 같음 | 타이틀 배경 |
| `assets/pics/yunha_window.png`, `guard_face.png`, `red_glass.png` | 같음 (2026-11-12 생성) | 컷신용 그림 |
| `assets/pics/organs.png`, `model.png` | 같음 (2026-11-12 생성) | 장기 아이콘 9종, 인체 모형 |
| `assets/pics/items.png`, `wallpaper.png` | 같음 (2026-11-12 생성) | 아이템 아이콘 12종, 인트로 바탕화면 배경 |
| `assets/pics/sisters_blood1~3.png`, `sisters_blood_full.png`, `sisters_1~4_dead.png` | 연님이 나노바나나(Gemini)로 생성 | 피가 차오르는 단계와 찔린 모습. 오른쪽 아래의 생성 도구 표시는 액자 무늬로 덮음 |
| 타일, 물건, 문 | 코드로 직접 그림 (`src/engine/art.js`) | 외부 소스 없음 |

AI로 만든 그림입니다. 공개 배포 전에 Higgsfield와 Gemini 이용 약관의 상업적 이용 조건(무료 플랜 기준)을 확인하고, AI로 만든 그림임을 밝히는 것이 좋습니다.

## 소리

모든 효과음과 배경음은 Web Audio로 직접 합성합니다 (`src/engine/audio.js`). 외부 음원은 쓰지 않았습니다.

## 참고 작품

이야기 초반 흐름은 웹소설 『공포 쯔꾸르 생존기』(파급효과 작)를 참고했습니다. 정리 노트는 `reference/original-notes.md`.
