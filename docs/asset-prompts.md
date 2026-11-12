# 그림 프롬프트 목록

> 2026-11-11: 아래 1번(걷기 시트 4장)과 윤하 초상화, 자매 액자, 타이틀 배경은 Higgsfield(GPT Image 2)로 이미 만들어 넣었습니다. 마음에 안 드는 그림만 같은 프롬프트로 다시 만들어 같은 경로에 덮어쓰면 됩니다. 남은 것은 경비 초상화와 컷신용 그림입니다.

나노바나나나 GPT 이미지에 아래 프롬프트를 넣어 만든 뒤, 적힌 경로에 그대로 저장하면 됩니다. 코드는 고칠 필요가 없습니다. 파일이 없으면 지금처럼 코드로 그린 그림이 대신 나옵니다.

> 용량을 줄이려고 그림을 모두 WebP로 바꿔 두었습니다 (28.9MB → 1.9MB). 아래에 적힌 `.png` 경로의 그림은 지금 같은 이름의 `.webp` 로 들어 있습니다.
> 그림을 새로 만들어 바꿀 때는 **같은 이름의 `.webp` 를 지우고** `.png` 를 넣으세요. 게임이 `.webp` 가 없으면 `.png` 를 찾아 쓰고, 초록 배경도 그때 지웁니다.

## 공통 규칙

모든 프롬프트 맨 앞에 아래 문구를 붙입니다.

```
16-bit top-down RPG pixel art, RPG Maker style, 3/4 overhead view, dark muted horror color palette, dim eerie lighting, crisp pixels, no text, no letters, no UI.
```

- 캐릭터와 초상화는 배경을 `#00FF00` 단색으로 만듭니다. 게임이 불러올 때 초록색을 지웁니다.
- 그림 안에 글자는 넣지 않습니다. 글자는 게임 코드가 그립니다.
- 파일 형식은 PNG.

## 1. 걷기 시트 (지금 넣으면 바로 적용)

한 장에 3칸 x 4줄, 총 12칸을 같은 크기로 넣습니다. 한 인물의 모든 방향을 한 장에 넣어야 같은 사람으로 나옵니다.

- 줄 순서(위에서부터): 정면(아래를 봄), 왼쪽, 오른쪽, 뒷모습(위를 봄)
- 칸 순서(왼쪽부터): 왼발 내밈, 서 있음, 오른발 내밈
- 권장 크기: 가로 3 : 세로 4 비율이 아니라, **한 칸이 가로 2 : 세로 3** 이 되게 (예: 전체 768 x 1536). 칸 크기가 달라도 게임이 키에 맞춰 줄여 그립니다
- 칸마다 인물이 칸 가운데, 발이 칸 아래쪽에 오게

공통으로 뒤에 붙일 문구:

```
Character walking sprite sheet, exactly 3 columns by 4 rows, 12 equal-sized cells arranged in a strict grid. Row 1: facing front (toward viewer). Row 2: facing left. Row 3: facing right. Row 4: facing back (away from viewer). In each row: left foot forward, standing still, right foot forward. Same character in every cell, identical outfit and proportions, full body, feet at the bottom of each cell, centered in each cell. Solid flat #00FF00 green background, no shadows on the background, no grid lines.
```

| 저장 경로 | 인물 | 프롬프트 (공통 문구들 사이에 넣기) |
|---|---|---|
| `assets/chars/player.png` | 주인공 | `A Korean high school boy, short black hair, navy school blazer with white shirt and dark tie, dark trousers, ordinary and slightly tired look.` |
| `assets/chars/yunha.png` | 윤하 | `A Korean high school girl ghost, long straight dark hair, white short-sleeve school blouse with red ribbon, navy pleated skirt, pale skin, playful mischievous smile.` |
| `assets/chars/guard.png` | 경비 | `A night security guard, blue uniform and peaked cap, holding a flashlight, gaunt face, bloodshot red eyes, unnaturally stiff posture, unsettling.` |
| `assets/chars/red.png` | 붉은 형체 | `A hunched humanoid figure with raw red skin, no hair, no clothes detail, long arms hanging low, blank white eyes, slow and heavy.` |

## 2. 대화창 초상화 (지금 넣으면 바로 적용)

정사각형 한 장, 얼굴과 어깨까지. 대화창 왼쪽에 60 x 60 크기로 들어갑니다.

공통으로 뒤에 붙일 문구:

```
Character portrait, head and shoulders, facing slightly toward the viewer, square image, solid flat #00FF00 green background.
```

| 저장 경로 | 인물 | 프롬프트 |
|---|---|---|
| `assets/portraits/yunha.png` | 윤하 | `A Korean high school girl ghost, long straight dark hair, white school blouse with red ribbon, pale skin, playful mischievous smile.` |
| `assets/portraits/guard.png` | 경비 | `A night security guard, blue peaked cap, gaunt face, bloodshot red eyes, expressionless.` |

## 3. 다음에 받을 것 (아직 코드가 받지 않음)

아래는 3단계에서 넣을 자리를 만든 뒤 프롬프트를 추가합니다. 지금 만들어 두셔도 됩니다.

- (완료) 타이틀 화면 배경 `assets/pics/title.png`
- (완료) <가란델가의 자매들> 액자 그림 `assets/pics/sisters.png`
- 컷신용 큰 그림: 창문 속 윤하, 경비의 얼굴, 유리를 깨는 붉은 형체

타일(바닥, 벽, 책상 등)은 AI로 만들면 칸 경계가 맞지 않아서 코드로 그린 것을 계속 씁니다.

## 수정이 필요할 때

넣어 보고 이상하면(칸이 어긋남, 초록 테두리가 남음, 방향 순서가 다름) 파일 이름과 증상을 알려 주세요. 코드 쪽에서 맞추거나 프롬프트를 고쳐 이 문서에 다시 적겠습니다.

## 4. 아직 못 만든 것 (크레딧이 떨어져서 남겨 둔 목록)

2026-11-12 기준 Higgsfield 크레딧을 다 써서 아래는 만들지 못했습니다. 다른 계정을 연결해 주시면 제가 이어서 만들고, 직접 만드실 때는 아래 프롬프트를 쓰시면 됩니다. 모든 프롬프트 앞에 맨 위의 공통 문구를 붙입니다.

컷신용 그림 3장(창문 속 윤하, 경비, 유리를 깨는 붉은 형체)은 이미 만들어 넣었습니다: `assets/pics/yunha_window.png`, `guard_face.png`, `red_glass.png`.

### 지금 넣으면 바로 적용되는 것

| 저장 경로 | 용도 | 비율 | 프롬프트 |
|---|---|---|---|
| `assets/portraits/guard.png` | 경비 대화창 초상화 | 1:1 | `RPG Maker dialogue portrait style. Character portrait, head and shoulders filling the frame, square image, solid flat pure green #00FF00 background. A creepy night security guard, dark blue peaked cap, gaunt pale gray face, bloodshot glowing red eyes, expressionless. No green color on the character.` |

### 5장 이후에 쓸 것 (4단계에서 자리를 만든 뒤 적용)

| 저장 경로 | 용도 | 비율 | 프롬프트 |
|---|---|---|---|
| `assets/pics/graduation.png` | 강당의 졸업사진 (얼굴이 지워진 단체 사진) | 3:2 | `Cutscene illustration. An old faded class graduation photograph in a wooden frame on a dark wall: five high school students in uniform sitting in a row on chairs on a stage, a second row standing behind them. Every face is scratched out and blank. Dust, water stains, eerie.` |
| `assets/pics/photo_developed.png` | 촬영 후 현상된 사진 (주인공과 윤하 뒤에 낯선 학생들) | 3:2 | `Cutscene illustration. A freshly developed photograph lying on a wooden stage floor: a high school boy in a navy blazer and a pale girl with long black hair standing side by side, and behind them several unfamiliar students in old-fashioned uniforms with blurred, smiling faces who should not be there. Flash-lit, unsettling.` |
| `assets/pics/cctv.png` | CCTV 화면 | 16:9 | `Cutscene illustration. A grainy black-and-white CCTV monitor view of an empty school corridor at night, scan lines and static, a tall dark figure standing motionless at the far end, timestamp area left blank.` |
| `assets/pics/rooftop.png` | 옥상, 마지막 장면 | 16:9 | `Cutscene illustration. A school rooftop at night just before dawn, chain-link fence, a single door at the far end leaking warm white light through its edges, a faint line of sunrise on the horizon, quiet and bittersweet.` |
| `assets/pics/ending_true.png` | 진엔딩 | 16:9 | `Cutscene illustration. Early morning, a high school boy in a navy blazer and a girl with long black hair in a white blouse walking out through the school front gate together, seen from behind, soft sunrise light, long shadows, peaceful after a long night.` |
| `assets/pics/ending_alone.png` | 혼자 나오는 엔딩 | 16:9 | `Cutscene illustration. Early morning, a high school boy in a navy blazer standing alone outside the school gate looking back at the building; in one upper window a pale girl with long black hair waves goodbye, smiling. Soft cold dawn light, melancholy.` |

### 있으면 좋은 것 (코드 그림을 대신할 수 있는 것)

타일은 AI로 만들면 칸 경계가 맞지 않아 권하지 않습니다. 대신 아래처럼 물건 하나씩은 바꿀 수 있습니다. 필요하시면 말씀해 주세요. 받는 자리를 만들겠습니다.

- 인체 모형 (과학실), 사물함 벽, 칠판, 책상, 전시장 등 물건 그림: 각각 `#00FF00` 배경의 정면 3/4 시점 한 장
- 아이템 아이콘 (잉크병, 열쇠, 손전등, 물감칼, 황산병, <읽으면 죽는 책>, 장기 9종): 한 장에 격자로

## 5. 게임 아이콘 (인트로 바탕화면의 `비현실.exe`)

지금은 코드로 그린 창 모양 아이콘입니다. 아래 프롬프트로 한 장 만들어 `assets/pics/game_icon.png` 로 넣으면 바로 바뀝니다. 배경은 투명이거나 아무 색이어도 됩니다 (네모 그대로 그려집니다).

```
A small square app icon for an old unfinished 2009 indie RPG horror game, 16-bit pixel art, dark background, a dark school window with one faint red light, eerie and simple, strong silhouette readable at 32x32 pixels, no text, no letters. Square 1:1.
```

## 6. 윤하 목소리

Higgsfield의 음성 합성(Qwen Audio TTS, 프리셋 목소리 Pixie, 음높이 1.2)으로 만들었습니다. 파일은 `assets/audio/v_*.mp3` 이고, 같은 이름으로 덮어쓰면 바뀝니다.

| 파일 | 대사 | 쓰이는 곳 |
|---|---|---|
| `v_one.mp3`, `v_two.mp3`, `v_three.mp3` | 하나. / 둘. / 셋! | 비밀서고 문, 액자 뒤집기 |
| `v_fast.mp3` | 너무 빨라! 다시. | 박자가 안 맞았을 때 |
| `v_run.mp3` | 지금이야! 뛰어! | 경비에게서 풀려날 때, 붉은 형체가 나올 때 |
| `v_frog.mp3`, `v_rat.mp3`, `v_dont.mp3` | 이것 봐라~ / 이번엔 쥐! / 도망가지 마~ | 실험실 장난 |
| `v_first.mp3`, `v_caught.mp3` | 내가 먼저 가 볼게. / 잡았다. | 환풍구 |
| `laugh.mp3` | (비웃는 소리, 효과음 생성) | 자매 그림에서 틀렸을 때 |

목소리를 바꾸고 싶으면 원하는 느낌(예: 더 높게, 더 속삭이듯)을 알려 주세요. 다른 프리셋 목소리로 다시 만들 수 있습니다.
