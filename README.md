# AI 첫걸음 — GitHub · Supabase · Netlify · OpenAI API

## 구성
- `public/index.html`: 공개 웹사이트 (퀴즈 + 관리자용 AI 체험)
- `netlify/functions/ask-ai.mjs`: OpenAI API 중계 함수 (서버에서만 실행)
- `database/setup.sql`: 퀴즈 DB 초기 설정
- `netlify.toml`: 정적 파일 배포 위치와 서버 함수 폴더 설정

Netlify 배포 프로젝트는 이 GitHub 저장소의 `main`을 자동 배포하도록 연결합니다.
**중요:** 배포 폴더는 `public`입니다. `netlify/functions`는 공개 폴더 밖에 둡니다.

## 관리자 AI 데모 활성화 (학생 대상 정식 서비스 이전)
1. OpenAI Platform에서 API 키를 발급하고 결제/사용량 한도를 확인합니다.
2. Netlify > Project configuration > Environment variables에 다음 항목을 추가합니다.
   - `OPENAI_API_KEY`: OpenAI Platform에서 발급한 비밀 키. **GitHub/HTML에 넣지 않습니다.**
   - `AI_DEMO_ACCESS_CODE`: 임의로 만든 **10자 이상의 비밀 테스트 코드**. OpenAI API 키와 달라야 합니다.
   - `AI_CHAT_ENABLED`: `true` (운영자 테스트를 시작할 때만)
   - `OPENAI_MODEL`: 선택 사항, 기본 `gpt-5.4-mini`
3. 위 변수가 Netlify Functions에서 사용 가능하도록 지정합니다. 설정한 후 **새로 배포**합니다.
4. 웹사이트의 'AI 체험'으로 이동해 테스트 코드와 **개인정보 없는 교육 질문**을 입력해 봅니다.
5. 비용/안전 문제가 우려되면 Netlify의 `AI_CHAT_ENABLED`를 `false`로 바꾸고 재배포합니다.

### 안전 / 비용
- 테스트 코드 없이는 OpenAI를 호출할 수 없습니다.
- 함수는 IP별 분당 5요청으로 제한하고, 질문을 300자 이하로 받습니다.
- 입력과 출력 모두 OpenAI Moderation API로 검사합니다.
- `store: false`로 Responses API 저장을 비활성화합니다.
- AI 호출은 사용량에 따라 비용이 발생합니다. **OpenAI 프로젝트 월 예산/알림을 반드시 확인**하세요.
- 질문 내용과 비밀 키는 애플리케이션 로그에 남기지 않습니다.
- 개인정보 감지는 일부 패턴만 탐지하므로 완벽하지 않습니다.
- 이 구현은 **운영자 테스트용**입니다. 초등학생 등 미성년자의 자유 입력을 받는 공개 서비스로 전환하기 전에 개인정보 처리, 연령별 고지, 운영자 모니터링/신고, 추가 보호조치, 사용량 악용 방지 등을 별도로 설계해야 합니다. 특히 13세 미만 아동의 개인정보를 OpenAI API로 처리하려면 OpenAI의 Under-18 지침에서 규정한 ZDR(Zero Data Retention) 조건을 먼저 충족해야 합니다.

## 테스트
- 퀴즈 영역에서 Supabase의 문제 3개가 표시되는지 확인
- 관리자 코드를 입력하지 않으면 AI 답변이 생성되지 않는지 확인
- 올바른 코드 + 정상적인 교육 질문으로 답변이 표시되는지 확인
- Netlify > Logs에서 함수 오류 확인

## 참고 문서
- https://docs.netlify.com/build/functions/get-started/
- https://docs.netlify.com/build/functions/environment-variables/
- https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance
