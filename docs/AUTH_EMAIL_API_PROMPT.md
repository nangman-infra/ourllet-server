# 이메일 인증코드 로그인/회원가입 API — 프론트엔드 연동 프롬프트

아래 내용을 **프론트엔드 에이전트/개발자**에게 전달해 로그인·회원가입 화면 연동을 요청하세요.

---

## 배경

- **이메일 + 6자리 인증코드**로 로그인/회원가입합니다. 비밀번호 없음.
- 흐름: 이메일 입력 → 인증코드 전송 요청 → 이메일에서 6자리 확인 → 코드 입력 → (기존 사용자) 로그인 완료 / (신규) 회원가입 폼 → 닉네임·가계부 이름 입력 후 가입 완료.
- 로그인 성공 시 **JWT**를 받아 `localStorage` 등에 저장하고, 이후 API 요청 시 `Authorization: Bearer <token>` 으로 사용합니다.
- **Google 로그인**은 현재 비활성화되어 있습니다.

---

## API 요약 (인증 필요 없는 것만 표시, me는 JWT 필요)

| 용도 | 메서드 | 경로 | 인증 |
|------|--------|------|------|
| 인증코드 전송 | POST | `/api/v1/auth/send-code` | 없음 |
| 인증코드 검증 | POST | `/api/v1/auth/verify` | 없음 |
| 회원가입 | POST | `/api/v1/auth/register` | 없음 |
| 내 정보 | GET | `/api/v1/auth/me` | Bearer JWT |

---

## 상세 스펙

### 1. POST `/api/v1/auth/send-code`

- **Body**
  ```json
  { "email": "user@example.com" }
  ```
- **성공 시**
  ```json
  { "ok": true }
  ```
- 해당 이메일로 **6자리 숫자 인증코드**가 전송됩니다. (SMTP 미설정 시 개발 환경에서는 서버 로그에만 출력될 수 있음.)
- 5분 이내에 아래 verify로 코드를 검증해야 합니다.

### 2. POST `/api/v1/auth/verify`

- **Body**
  ```json
  { "email": "user@example.com", "code": "123456" }
  ```
- **기존 사용자 (로그인)**  
  ```json
  {
    "needSignup": false,
    "token": "eyJhbGc...",
    "user": { "id": "uuid", "email": "user@example.com", "name": "닉네임" }
  }
  ```
  - 이 경우 `token`을 저장하고 로그인 완료 처리 (예: localStorage + 로그인 상태로 전환).

- **신규 사용자 (회원가입 필요)**  
  ```json
  {
    "needSignup": true,
    "signupToken": "eyJhbGc..."
  }
  ```
  - 이 경우 회원가입 폼(닉네임, 가계부 이름)을 보여주고, 사용자 입력 후 아래 register 호출.

- **에러**  
  - 코드 불일치/만료: `401` + 메시지 (예: "인증코드가 맞지 않거나 만료됐어요.")

### 3. POST `/api/v1/auth/register`

- **Body**
  ```json
  {
    "signupToken": "verify에서 받은 signupToken",
    "nickname": "사용할 닉네임",
    "ledgerName": "최초 사용할 가계부 이름"
  }
  ```
- **성공 시**
  ```json
  {
    "token": "eyJhbGc...",
    "user": { "id": "uuid", "email": "user@example.com", "name": "닉네임" }
  }
  ```
  - `token`을 저장하고 로그인 완료 처리.  
  - 백엔드에서 해당 사용자로 **가계부 1개가 자동 생성**되며, 이름은 `ledgerName`으로 설정됩니다.

- **에러**  
  - signupToken 만료: `401` (다시 인증코드 받기 안내)  
  - 이미 가입된 이메일: `400` (로그인 안내)

### 4. GET `/api/v1/auth/me`

- **헤더**: `Authorization: Bearer <JWT>`
- **성공 시**
  ```json
  { "id": "uuid", "email": "user@example.com", "name": "닉네임" }
  ```
- 로그인 여부 확인·프로필 표시용.

---

## 프론트엔드 작업 체크리스트

1. **로그인/가입 진입**
   - 이메일 입력 필드 + "인증코드 받기" 버튼 → `POST /api/v1/auth/send-code` 호출 후 "이메일로 전송된 6자리 코드를 입력해 주세요" 안내.

2. **인증코드 입력**
   - 6자리 숫자 입력 필드 + "확인" 버튼 → `POST /api/v1/auth/verify` 호출.
   - `needSignup === false` → `token`, `user` 저장 후 메인(또는 대시보드)으로 이동. JWT는 `localStorage` 등에 저장.
   - `needSignup === true` → `signupToken` 보관 후 **회원가입 폼**으로 전환.

3. **회원가입 폼**
   - 입력 항목: **닉네임**, **가계부 이름** (최초 사용할 가계부 이름).
   - "가입하기" 버튼 → `POST /api/v1/auth/register` with `{ signupToken, nickname, ledgerName }`.
   - 성공 시 `token`, `user` 저장 후 로그인 완료와 동일하게 처리.

4. **인증 상태 유지**
   - API 요청 시 `Authorization: Bearer <token>` 헤더에 JWT 포함.
   - 앱 초기 로드 시 저장된 JWT로 `GET /api/v1/auth/me` 호출해 로그인 상태 복원.

5. **에러 처리**
   - 401: 인증코드 오류/만료, signupToken 만료 → 사용자에게 메시지 표시.
   - 400: 이메일 형식 오류, 이미 가입된 이메일 등 → 메시지 표시.

---

## 복사용 프롬프트 (프론트 에이전트에게 전달)

```
로그인/회원가입을 이메일 인증코드 방식으로 구현해줘.

1) 로그인 화면
- 이메일 입력 + "인증코드 받기" → POST /api/v1/auth/send-code { email }
- 6자리 인증코드 입력 + "확인" → POST /api/v1/auth/verify { email, code }
- 응답이 needSignup: false 이면 token, user 받아서 localStorage에 token 저장하고 로그인 완료(메인으로 이동).
- 응답이 needSignup: true 이면 signupToken 저장하고 회원가입 폼으로 전환.

2) 회원가입 폼 (닉네임, 가계부 이름만)
- 닉네임, 가계부 이름 입력 + "가입하기" → POST /api/v1/auth/register { signupToken, nickname, ledgerName }
- 성공 시 token, user 저장 후 로그인 완료 처리(메인으로 이동).

3) 인증 유지
- API 호출 시 헤더: Authorization: Bearer <token>
- 앱 로드 시 저장된 token으로 GET /api/v1/auth/me 호출해 로그인 상태 복원.

4) 에러 메시지는 백엔드 응답 메시지를 사용자에게 보여줘.
```

---

## 환경 변수 (백엔드, 참고)

- 이메일 전송을 위해 서버에 SMTP 설정이 있으면 실제 발송되고, 없으면 개발 시 서버 로그에만 인증코드가 출력됩니다.
- 선택: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`
