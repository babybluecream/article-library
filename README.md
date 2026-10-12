# article-library

Penguin Library 🐧 — 펭귄(@babybluecream)의 미국 주식 노트 아카이브입니다.
Deep Dive(개별 기업 심층 분석), 성장주 스크리닝, 아티클을 분류·공개범위·티커·검색으로 찾아보고, 줄을 누르면 X 원문이 열립니다.

빌드 과정 없이 정적 파일만으로 동작합니다. 추적 스크립트는 없습니다.

## 파일 구성

| 파일 | 설명 |
| --- | --- |
| `index.html` | 페이지 구조 (헤더, 라이브러리, 소개) |
| `style.css` | 디자인 (에디토리얼 아카이브 스타일, 라이트/다크 모드, 모바일 우선) |
| `app.js` | 검색·분류·공개범위·정렬·티커 필터, 월별 묶음 |
| `posts.json` | **글 목록 데이터 — 새 글은 여기만 수정** |
| `favicon.svg` | 펭귄 아이콘 |
| `netlify.toml` | Netlify 배포 설정 (`publish = "."`) |

## 새 글 추가하는 법

`posts.json`의 대괄호 `[ ]` 안에 아래 항목을 하나 추가합니다. 앞 항목 끝에 쉼표(`,`)를 꼭 붙이세요.

```json
{
  "title": "$NVDA Deep Dive ㅣ261015",
  "date": "2026-10-15",
  "category": "deepdive",
  "tickers": ["NVDA"],
  "url": "https://x.com/babybluecream/status/글번호",
  "summary": "목록에 보일 한두 줄 요약",
  "access": "구독"
}
```

- `title`: 제목
- `date`: 게시일, `YYYY-MM-DD` 형식 (정렬 기준)
- `category`: `deepdive`(Deep Dive) / `screening`(성장주 스크리닝) / `article`(아티클) 중 하나
- `tickers`: 종목 티커 목록, `$` 없이 대문자. 없으면 `[]`
- `url`: X 원문 주소
- `summary`: 요약 (선택)
- `access`: `구독`(구독자 전용 글 안내·일부 공개) 또는 `공개` (선택)

GitHub 웹에서 `posts.json`을 열고 연필 아이콘으로 수정 후 Commit 하면, Netlify에 연결된 경우 자동으로 다시 배포됩니다.

## 로컬에서 미리 보기

`posts.json`을 불러오기 때문에 파일을 더블클릭하면 목록이 안 보일 수 있습니다. 폴더에서 아래 명령으로 여십시오.

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Netlify 배포

Netlify → Add new site → Import from GitHub → `babybluecream/article-library` 선택.
Build command는 비워 두고 Publish directory는 `.` (netlify.toml에 이미 설정됨).
