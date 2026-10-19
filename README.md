# article-library

Penguin Terminal 🐧 — 펭귄(@babybluecream)의 미국 주식 노트 아카이브입니다.
미국 주식 리서치(Deep Dive·스크리닝 결과)를 중심으로 투자론, 스크리닝 방법, 재테크·부동산, 시황, 시장·매크로, 팁까지 11개 탭과 단계별 '전체 읽어보기'로 정리했습니다. 줄을 누르면 X 원문이 열립니다.

빌드 과정 없이 정적 파일만으로 동작합니다. 추적 스크립트는 없습니다.
디자인은 다크 터미널(블룸버그풍)이며, 라이트 모드는 크림색 종이 터미널입니다. 웹폰트는 오픈 라이선스(OFL)인 IBM Plex Mono, Nanum Gothic Coding, Pretendard를 씁니다.

## 파일 구성

| 파일 | 설명 |
| --- | --- |
| `index.html` | 페이지 구조 (헤더, 시작하기, 전체 읽어보기, 라이브러리, 구독 안내) |
| `style.css` | 디자인 (터미널 스타일, 다크/라이트 모드, 모바일 우선) |
| `app.js` | 검색·분류·세부 분류·FREE/X 아티클 필터·티커·정렬, 읽기 순서 화면 |
| `posts.json` | **글 목록 데이터 — 새 글은 여기만 수정** |
| `path.json` | 탭 목록과 '전체 읽어보기' 단계(글 번호 순서, 구독 안내 위치) |
| `favicon.svg` | 🐧 아이콘 |
| `netlify.toml` | Netlify 배포 설정 (`publish = "."`) |

## 새 글 추가하는 법

`posts.json`의 대괄호 `[ ]` 안에 항목을 하나 추가합니다. 앞 항목 끝에 쉼표(`,`)를 꼭 붙이세요.

```json
{
  "title": "$NVDA Deep Dive ㅣ261015",
  "date": "2026-10-15",
  "category": "us",
  "sub": "Deep Dive",
  "tickers": ["NVDA"],
  "url": "https://x.com/babybluecream/status/글번호",
  "summary": "원문에서 옮긴 한두 줄",
  "source": "본인",
  "access": "free"
}
```

- `category`: `us`(미국주식 리서치) / `principle`(투자론·원칙) / `method`(스크리닝 방법) / `money`(재테크·절세·연금) / `realestate`(부동산) / `market`(시황: 모닝콜·나이트콜·나이트캡·아페리티프 등 일일 시황) / `macro`(시장·매크로) / `econ`(경제 상식) / `tips`(팁·사이트 공유) / `translation`(번역) / `extra`(별도 읽을거리). `start`는 읽기 순서 0단계 전용(탭에 안 보임).
- `sub`: 세부 분류 이름(자유 입력, 같은 이름끼리 묶임)
- `source`: `본인` / `정리` / `번역` — 화면에는 `번역`만 [번역] 태그로 표시
- `access`: `free`(공개) / `sample`(공개된 구독 샘플) / `locked`(구독자 전용 → 🔒 카드, 제목·날짜·티커만 표시하므로 `summary`는 비워 두기)
- `label`(선택): `WSJ 정리`, `증권사 리포트 정리` 등 출처 라벨. 라벨이 있고 요약이 비어 있으면 "요약을 싣지 않습니다" 안내가 나옵니다(유료 원문 저작권 보호).
- `xarticle`(선택): X 아티클(장문)이면 `true` → ARTICLE 표시, 'X 아티클만' 필터
- 날짜순 정렬·번호·티커·통계는 자동입니다. `title`, `date`, `url`이 빠진 항목은 표시되지 않습니다.

GitHub 웹에서 `posts.json`을 열고 연필 아이콘으로 수정 후 Commit 하면, Netlify에 연결된 경우 자동으로 다시 배포됩니다.

## Finviz 추천 링크

상단 바와 구독 안내 영역의 「Finviz 가입하기」 버튼은 추천(홍보대사) 링크입니다. `index.html`(3곳)과 `app.js`(읽기 순서 3단계 1곳)에서 `affilId=324420513`을 검색하면 나옵니다. 링크는 `rel="sponsored noopener"`로 새 탭에서 열리고, 옆에 「추천 링크 (Finviz 홍보대사) · 가입 시 소정의 수수료를 받을 수 있습니다.」 고지가 붙어 있습니다.

## 로컬에서 미리 보기

`posts.json`을 불러오기 때문에 파일을 더블클릭하면 목록이 안 보일 수 있습니다. 폴더에서 아래 명령으로 여십시오.

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Netlify 배포

Netlify → Add new site → Import from GitHub → `babybluecream/article-library` 선택.
Build command는 비워 두고 Publish directory는 `.` (netlify.toml에 이미 설정됨).
