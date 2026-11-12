# 제주잇 복구본 QA 체크리스트

## 파일 분리
- [x] HTML 인라인 JavaScript 제거 및 `app.js` 분리
- [x] Tailwind 설정을 `tailwind.config.js`로 분리
- [x] HTML 내부 `<style>` CSS를 `style.css`로 분리
- [x] HTML에서 `style.css` 외부 스타일시트 연결
- [x] HTML 인라인 `style` 속성 0개 확인
- [x] HTML 내부 인라인 `<script>` 0개 확인
- [x] HTML의 JavaScript/CSS 파일 경로 확인

## 기존 기능 보존 확인
- [x] 음식 카테고리 화면 열기
- [x] 메뉴 `+ 담기` 버튼 클릭 및 장바구니 수량 증가
- [x] 장바구니 모달 열기
- [x] 에이전트 추천 장바구니 미리보기 열기
- [x] 로그인 모달 열기
- [x] 회원가입 탭 전환
- [x] 포장·픽업 매장 선택 화면 열기
- [x] 주황색 액션 버튼 CSS 적용 확인 (`rgb(255, 107, 0)`)

## 자동 검사 결과
- [x] `node --check app.js` 통과
- [x] `node --check tailwind.config.js` 통과
- [x] Chromium 브라우저 기능 테스트 통과 (390×844 뷰포트)
- [x] 테스트 중 JavaScript 페이지 오류 0건
- [x] HTML의 `onclick` 함수 및 앱 진입 함수 확인

## 브라우저 테스트 범위와 한계
- 실제 Chromium 엔진에서 HTML 화면을 로드하고 버튼을 클릭하여 로그인 모달, 회원가입 탭, 카테고리, 메뉴 담기, 장바구니, 에이전트 미리보기, 포장·픽업 화면을 확인했습니다.
- 실행 환경의 브라우저 정책이 로컬 주소 탐색을 차단하여, HTML 문서를 브라우저 DOM에 직접 넣고 분리된 `style.css`와 `app.js`를 주입하는 방식으로 테스트했습니다. 따라서 실제 Chromium에서 JavaScript 실행과 클릭 상호작용은 확인했지만, 운영체제의 파일 더블클릭 방식으로 여는 과정과 Tailwind/Font Awesome/Google Fonts CDN의 실제 네트워크 로딩은 완전하게 검증하지 못했습니다.
- 사용자 PC에서 ZIP 압축을 푼 뒤 `jeju_eat.html`을 열어 최종 스타일과 이미지 표시를 한 번 더 확인하는 것이 좋습니다.

## 실행 환경 및 한계
- 이 프로젝트는 프론트엔드 데모입니다. 회원 계정과 주문내역은 실제 서버/DB에 저장되지 않으며 실제 결제·배달 접수·외부 AI API도 연결되어 있지 않습니다.
- AI 추천 검색은 프로젝트 내부의 음식점·메뉴 데이터에 대한 키워드 기반 추천 데모입니다. 외부 생성형 AI와 연결된 기능은 아닙니다.
- 음식 이미지, 글꼴, 아이콘, Tailwind CSS CDN은 인터넷 연결이 필요합니다.
