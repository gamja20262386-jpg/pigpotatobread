# 제주잇 React + Express 프로젝트

기존 정적 HTML 시연본은 보존하고, React 화면과 Express API를 분리한 새 개발 버전입니다.

## 폴더 구조
- client/src/pages: 홈, 카테고리, 로그인/회원가입, 장바구니, 주문내역, 마이페이지
- client/src/api.js: 프론트엔드 API 통신
- server/routes: 인증, 카탈로그, 장바구니, 주문, 추천 API
- server/middleware/auth.js: JWT 인증
- server/lib/db.js: 개발용 JSON 데이터 저장

## 실행
Node.js 18 이상 설치 후 이 폴더에서 실행합니다.
1. npm install
2. .env.example을 복사해 .env로 저장하고 JWT_SECRET을 변경합니다.
3. npm run dev
4. 프론트엔드: http://localhost:5173
5. 백엔드 상태 확인: http://localhost:4000/api/health

## API
- POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me
- GET /api/categories, GET /api/stores, GET /api/products
- GET /api/cart, POST /api/cart/items, PATCH /api/cart/items/:productId, DELETE /api/cart/items/:productId
- GET /api/orders, POST /api/orders
- POST /api/recommendations

## 구현 범위와 주의
- 비밀번호는 bcrypt 해시로 저장하고 로그인은 JWT 토큰을 발급합니다.
- 장바구니는 로그인 사용자 또는 브라우저 세션 ID에 연결됩니다.
- 주문은 로그인한 사용자만 생성하며, 매장별 상품/배달팁을 서버에서 다시 계산합니다.
- 추천은 외부 AI가 아닌 규칙 기반 데모입니다.
- JSON 파일 저장은 개발용입니다. 실제 배포 전 PostgreSQL 등으로 교체하고, HTTPS, 비밀키 관리, rate limit, 재고/주문 트랜잭션 등을 보강해야 합니다.
- 실제 결제는 연동되어 있지 않습니다.
