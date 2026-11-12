# 제주잇 — 1팀 통합본

제주 음식 배달 + 동문시장 상점 추천 웹 서비스입니다. 팀원 브랜치 작업을 `통합` 브랜치에서 하나의 앱으로 합쳤습니다.

## 실행할 앱
**`jeju_eat_react/`** (React + Express) 하나입니다. 실행 방법은 [`jeju_eat_react/README.md`](jeju_eat_react/README.md)를 보세요.

```
cd jeju_eat_react
npm install
npm run dev      # http://localhost:5173
npm test         # 추천 로직 테스트
```

## 통합 내역 (2026-11-12)
| 브랜치 | 작업 | 통합 결과 |
|---|---|---|
| 재강 | 제주잇 React + Express (로그인·장바구니·주문 API) | 통합 앱의 기반 |
| 승한 | 제주마켓 AI (동문시장 가상 상점 6곳·상품 12개, 품절, 예산·키워드 추천, 테스트) | `/market` 페이지, `POST /api/recommendations/chat`, `tests/`로 이식 |
| 유빈 | (통합 시점에 올라온 작업 없음) | — |

## 폴더
- `jeju_eat_react/` — 통합 앱
- `archive/` — 통합 전 버전 보관 (실행 대상 아님)
  - `jeju_eat_static/` — 재강 정적 HTML/JS 분리본
  - `jeju_eat_static_old/` — 재강 정적 분리본 이전 복사본
  - `first_single_html/` — 최초 단일 HTML
  - `jeju_market_static/` — 승한 제주마켓 AI 원본 (보고서·설계·시연 대본 `docs/` 포함). `/css`, `/js` 절대경로를 쓰므로 이 폴더 자체를 Live Server 루트로 열어야 합니다.

## 한계
- AI 추천은 규칙 기반(키워드·예산)이며 생성형 AI API와 연결되어 있지 않습니다.
- 매장·상품은 과제 시연용 가상 데이터입니다.
- 공개 저장소에 API 키, 비밀번호, 개인정보를 올리지 마세요. (`.env`는 `.gitignore`로 제외)
