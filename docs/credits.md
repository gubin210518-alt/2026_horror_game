# 크레딧과 출처

## 그림

| 파일 | 만든 방법 | 비고 |
|---|---|---|
| `assets/chars/player.webp`, `yunha.webp`, `guard.webp`, `red.webp` | Higgsfield MCP, 모델 GPT Image 2 (2026-11-11 생성) | 걷기 시트. 프롬프트는 `asset-prompts.md` |
| `assets/portraits/yunha.webp` | 같음 | 대화창 초상화 |
| `assets/pics/sisters.webp` | 같음 | <가란델가의 자매들> 액자 |
| `assets/pics/title.webp` | 같음 | 타이틀 배경 |
| `assets/pics/yunha_window.webp`, `guard_face.webp`, `red_glass.webp` | 같음 (2026-11-12 생성) | 컷신용 그림 |
| `assets/pics/organs.webp`, `model.webp` | 같음 (2026-11-12 생성) | 장기 아이콘 9종, 인체 모형 |
| `assets/pics/items.webp` | 같음 (2026-11-12 생성) | 아이템 아이콘 12종 |
| `assets/pics/wallpaper.webp` | 연님의 Windows 11 바탕화면 화면 캡처에서 아이콘이 없는 가운데 부분을 잘라 냄 | 인트로 배경. Windows 기본 배경 그림이라, 공개 배포할 때는 다른 그림으로 바꾸는 것이 안전함 |
| `assets/pics/sisters_blood1~3.webp`, `sisters_blood_full.webp`, `sisters_1~4_dead.webp` | 연님이 나노바나나(Gemini)로 생성 | 피가 차오르는 단계와 찔린 모습. 오른쪽 아래의 생성 도구 표시는 액자 무늬로 덮음 |
| `assets/pics/gradphoto.webp`, `camera_shot.webp`, `ch5.webp`, `camera.webp` | Higgsfield MCP, 모델 GPT Image 2 (2026-11-12 생성) | 5장 별실: 졸업사진, 카메라 안, 사진기 앞의 윤하, 물건 시트(사진기, 특수 잉크, 찢어진 종이, 사진). `camera.webp` 는 물건 시트에서 사진기만 잘라 낸 것. 프롬프트는 `asset-prompts.md` 5번 |
| `assets/pics/ch5.webp`, `camera.webp`, `bag.webp` (2026-11-12 교체) | 연님이 나노바나나(Gemini)로 생성 | 바퀴 달린 사진기, 특수 잉크, 찢어진 종이, 가죽 가방. 앞 줄의 `ch5.webp`, `camera.webp` 를 대신함. 생성 도구 표시는 덮음 |
| `assets/pics/corpse.webp`, `head.webp` | Higgsfield MCP, 모델 GPT Image 2 (2026-11-12 생성) | 별실의 시체와 머리 |
| `assets/pics/liver.webp` | `organs.webp` 에서 간만 잘라 냄 | 별실 바닥의 간 |
| `assets/pics/gradphoto.webp` (2026-11-12 다시 짬) | Higgsfield 그림의 얼굴 타원을 잘라 새 종이에 다시 배치 | 이름 자리를 넓힘 |
| `assets/pics/cam_frame.webp`, `cam_room.webp`, `cam_yunha.webp` | Higgsfield MCP, GPT Image 2 (2026-11-13 생성, 1.5 크레딧) | 흰 방 틀(타원 구멍), 타원 너머의 별실, 들여다보는 윤하. 게임이 셋을 겹쳐 그림 |
| `assets/pics/vent_yunha.webp` | 연님이 생성 | 환풍구로 먼저 들어가는 윤하 |
| 타일, 물건, 문 | 코드로 직접 그림 (`src/engine/art.js`) | 외부 소스 없음 |

AI로 만든 그림입니다. 공개 배포 전에 Higgsfield와 Gemini 이용 약관의 상업적 이용 조건(무료 플랜 기준)을 확인하고, AI로 만든 그림임을 밝히는 것이 좋습니다.

## 소리

효과음과 배경음은 대부분 Web Audio로 직접 합성합니다 (`src/engine/audio.js`).

| 파일 | 만든 방법 |
|---|---|
| `assets/audio/laugh.mp3` | Higgsfield MCP, Mirelo 효과음 생성 (2026-11-12) |
| `assets/audio/v_*.mp3` (윤하 목소리 10줄) | Higgsfield MCP, Qwen Audio TTS, 프리셋 목소리 Pixie (2026-11-12) |

파일이 없으면 합성음으로 대신하거나(비웃는 소리) 소리 없이 넘어갑니다(목소리).

## 참고 작품

이야기 초반 흐름은 웹소설 『공포 쯔꾸르 생존기』(파급효과 작)를 참고했습니다. 5장 별실의 장면 구성과 <특수 잉크 사용 약관>, <졸업 사진 촬영 안내> 문구는 같은 작품의 웹툰 장면을 연님이 참고 자료로 준 것을 따랐습니다. 그림은 참고 사진을 쓰지 않고 새로 만들었습니다. 정리 노트는 `reference/original-notes.md`.

## 글꼴

| 파일 | 출처 | 라이선스 |
|---|---|---|
| `assets/fonts/Galmuri11.woff2`, `Galmuri11-Bold.woff2` | 갈무리(Galmuri) 2.40.3, quiple 제작. npm 패키지 `galmuri` 에서 가져옴 | SIL Open Font License 1.1 (`assets/fonts/Galmuri-LICENSE.txt`) |
