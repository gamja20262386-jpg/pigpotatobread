제주잇 분리형 프로젝트 실행 방법

1. ZIP 파일을 압축 해제합니다.
2. 아래 6개 파일이 같은 폴더 안에 있는지 확인합니다.
   - jeju_eat.html
   - app.js
   - style.css
   - tailwind.config.js
   - QA_CHECKLIST.md
   - README.txt
3. jeju_eat.html 파일을 Chrome 또는 Edge에서 엽니다.
4. HTML 파일만 다른 폴더로 옮기면 app.js, style.css 및 설정 파일을 찾지 못하므로 모든 파일을 같은 폴더에 두세요.
5. 음식 사진·글꼴·아이콘·Tailwind 디자인은 외부 CDN을 사용하므로 인터넷 연결이 필요합니다.

주의: 프론트엔드 시연용 프로젝트입니다. 실제 서버 회원가입, 영구 계정 저장, 실제 결제/배달 접수, 외부 AI API는 연결되어 있지 않습니다.

파일 분리 상태:
- HTML 구조: jeju_eat.html
- JavaScript 기능: app.js
- CSS 스타일: style.css
- Tailwind 설정: tailwind.config.js

주황색 액션 버튼 테마도 유지되어 있습니다. 자세한 테스트 결과는 QA_CHECKLIST.md를 확인하세요.
