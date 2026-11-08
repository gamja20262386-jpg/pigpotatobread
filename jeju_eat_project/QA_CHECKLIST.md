# 제주잇 복구본 QA 체크리스트

## 파일 분리
- [x] HTML 인라인 JavaScript 제거 및 `app.js` 분리
- [x] Tailwind 설정을 `tailwind.config.js`로 분리
- [x] HTML 내부 CSS를 `style.css`로 분리
- [x] HTML에서 `style.css` 외부 스타일시트 연결
- [x] HTML 인라인 `style` 속성 0개 확인
- [x] HTML 내부 인라인 `<script>` 0개 확인

## Chromium 브라우저 클릭 테스트
- [x] 390×844 뷰포트에서 Chromium 엔진으로 화면 로드
- [x] 로그인 모달 열기
- [x] 회원가입 탭 전환
- [x] 장바구니 모달 열기
- [x] 음식 카테고리 모달 열기
- [x] 메뉴 `+ 담기` 버튼 클릭 및 장바구니 수량 1 증가 확인
- [x] 에이전트 추천 장바구니 미리보기 열기
- [x] 포장·픽업 매장 선택 화면 열기
- [x] 액션 버튼 배경색 `rgb(255, 107, 0)` 확인
- [x] 브라우저 페이지 JavaScript 오류 0건

## 코드 검사
- [x] `node --check app.js` 통과
- [x] `node --check tailwind.config.js` 통과
- [x] HTML의 외부 CSS/JS 경로 확인

## 브라우저 테스트 범위와 한계
- Chromium에서 실제 버튼 클릭과 JavaScript 상호작용을 테스트했습니다.
- 실행 환경의 브라우저 정책이 로컬 주소 탐색을 차단해 HTML DOM을 브라우저에 직접 로드하고, 실제 분리 파일인 CSS와 JavaScript를 주입하는 방식으로 검사했습니다.
- 따라서 모달과 클릭 동작은 확인했지만 Tailwind/Font Awesome/Google Fonts CDN의 네트워크 로딩 및 사용자 PC에서의 파일 더블클릭 실행은 별도 확인이 필요합니다.

## 프로젝트 한계
- 프론트엔드 데모이며 회원 계정과 주문내역은 서버/DB에 영구 저장되지 않습니다.
- 실제 결제·배달 접수·외부 AI API는 연결되어 있지 않습니다.
- AI 추천은 프로젝트 내부 음식점·메뉴 데이터 기반 키워드 추천입니다.
- 이미지·글꼴·아이콘·Tailwind 디자인은 인터넷 연결이 필요합니다.
