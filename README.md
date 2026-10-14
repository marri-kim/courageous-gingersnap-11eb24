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


## 로그인 및 관리자/사용자 계정 설정
- 로그인 화면: 웹사이트의 **로그인** 메뉴. Supabase Auth 이메일/비밀번호 인증 사용.
- 일반 사용자: 로그인과 공개 퀴즈 이용 가능.
- 관리자: 로그인 후 **퀴즈 공개 여부** 설정 가능. 실제 허용 여부는 DB RLS 정책이 결정함.
- 회원가입 폼은 미제공. 교육용 미성년 계정은 운영자가 생성하고 개인정보 수집·보호 절차를 별도로 검토.
- Supabase Dashboard → Authentication → Users → Add user 에서 사용자 이메일/임시 비밀번호로 각각 계정을 생성합니다. 비밀번호를 이 대화나 GitHub에 공유하지 마세요.
- 모든 신규 계정은 자동으로 `public.user_roles.role = 'user'`로 설정됩니다. 관리자로 지정할 때는 Supabase SQL Editor에서 아래 SQL을 실행하세요 (실제 관리자 이메일로 바꾸기).
```sql
update public.user_roles
set role = 'admin'
where user_id = (
  select id from auth.users where email = '관리자_이메일@example.com'
);
```
- 처리 후 `select role from public.user_roles where user_id = (select id from auth.users where email = '관리자_이메일@example.com');`로 `admin` 확인. 로그인 후 권한이 바뀌지 않으면 로그아웃 후 다시 로그인.
- 관리자 역할은 브라우저에서 수정할 수 없으며 Auth/DB를 통해서만 설정해야 합니다.
- Supabase Dashboard → Authentication → Providers에서 Email 활성화 상태를 확인하세요. 직접 계정을 생성할 때 임시 비밀번호를 안전한 방법으로 전달하고 사용자가 새 비밀번호로 변경하게 해야 합니다.
- 로그인과 관리자 화면은 구현했으나 실제 계정이 아직 없어 인증 실사용 테스트는 별도로 필요합니다.
- OpenAI 관리자 테스트 코드는 기존 방식으로 별도 보호됩니다. 관리자 로그인만으로 AI 질문 제한이 해제되는 것은 아닙니다.


## 웹사이트 관리자 허가번호 회원가입 (테스트 전용)

가입 흐름: 사이트 로그인 섹션 → 이메일과 관리자 허가번호 입력 → Netlify `/api/request-signup`에서 승인 코드 검증 → Supabase 초대 메일 → 이메일 링크 클릭 → 12자 이상 비밀번호 생성 → 로그인. 신규 계정은 항상 `user` 역할이며, **허가번호는 관리자 역할을 부여하지 않습니다.**

### Netlify 환경변수 (Project configuration > Environment variables)

- `SUPABASE_SECRET_KEY`: Supabase → Project Settings → API Keys에 있는 **sb_secret_...** 서버용 키. **GitHub·HTML·채팅에 절대로 공유하지 마세요.**
- `SIGNUP_APPROVAL_CODE`: 테스트용 허가번호 `1234`
- `SIGNUP_ENABLED`: `true` (테스트 완료 후에는 `false`)
- `SIGNUP_REDIRECT_URL`: 선택. 미입력 시 `https://courageous-gingersnap-11eb24.netlify.app/?invite=1`로 이동합니다.
  - marpoong.com HTTPS 정상 연결 이후 변경할 경우 Supabase Auth 리디렉션 주소도 동시에 추가해야 합니다.

변수를 저장한 다음 Netlify에서 **Trigger deploy**를 실행해야 적용됩니다. 환경변수 scope는 Functions에서 읽을 수 있도록 설정해야 합니다.

### 반드시 확인할 Supabase 설정

1. Supabase Dashboard → Authentication → URL Configuration
   - Site URL은 접속 가능한 사이트 URL
   - Redirect URLs에는 `https://courageous-gingersnap-11eb24.netlify.app/?invite=1`를 추가
2. Authentication → Sign In / Providers 또는 일반 인증 설정의 **Allow new users to sign up**를 **OFF**로 설정 (공개 `auth.signUp` 우회를 막고, 서버에서의 초대만 허용). 이메일 로그인은 계속 허용합니다.
3. Authentication → Email Templates → Invite user 템플릿이 초대 링크(`{{ .ConfirmationURL }}`)를 유지하고 있는지 확인합니다.
4. 초기 Supabase 메일 발송에는 시간당 제한이 있을 수 있습니다. 실사용 서비스에는 별도 SMTP 설정을 권장합니다.
5. 이메일 확인용 테스트는 본인이 소유한 이메일로만 진행합니다.

### 보안 유의사항

- 4자리 코드 `1234`는 추측이 매우 쉬워 **정식 공개용으로 부적절합니다.** 초기 동작 확인에만 사용한 뒤 임의의 긴 코드로 변경하고 Netlify를 재배포하세요.
- 비밀키와 허가번호는 서버 환경변수에서만 읽으며 브라우저 코드에는 들어가지 않습니다.
- Netlify 함수에 IP별 분당 3회 속도 제한을 설정했습니다. 다수 IP를 이용한 공격까지 완벽하게 막지는 못하므로 공개 서비스에서는 CAPTCHA·관리자 승인 워크플로가 추가로 필요합니다.
- 회원가입 초대 메일에 있는 링크로 들어왔을 때 비밀번호 설정 화면이 나타납니다.
- **실제 서버 발송·가입·로그인 절차는 환경변수 등록 후 별도 테스트가 필요합니다.**
