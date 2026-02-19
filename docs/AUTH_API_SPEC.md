# 백엔드 인증 API 사양 (Google OAuth + JWT)

가계부 앱의 **회원가입/로그인** 및 **인증 유지**를 위한 백엔드 API 사양입니다.

**원하는 인증 흐름**: 프론트가 백엔드로 인증을 요청 → 백엔드가 Google OAuth로 사용자를 보냄 → Google이 **백엔드**로 콜백 → 백엔드가 사용자 생성/조회 후 JWT 발급 → 백엔드가 **프론트**로 토큰을 넘겨 응답.

---

## 1. 목표

- **Google 계정으로만** 가입/로그인
- **OAuth 콜백은 백엔드**가 받음 (구글이 백엔드 URL로 리다이렉트)
- 백엔드가 우리 서비스용 **JWT** 발급 후, **프론트 로그인 페이지**로 리다이렉트해 토큰 전달 (`/login#token=...`)
- (선택) 클라이언트에서 idToken을 직접 보내는 **POST /v1/auth/google** 도 지원 가능
- 기존 내역 API는 **JWT 필수**, 미인증 시 401

---

## 2. 전체 흐름 (리다이렉트 방식, 메인)

1. **프론트**: 사용자가 "Google로 로그인" 클릭 → 브라우저가 **백엔드** `GET /api/v1/auth/google` 로 이동
2. **백엔드**: Google OAuth 인증 URL로 **리다이렉트** (client_id, redirect_uri=**백엔드 콜백 URL**, scope, state 등)
3. **Google**: 사용자 로그인/동의 후 **백엔드 콜백 URL**로 리다이렉트 (`?code=...&state=...`)
4. **백엔드**: `GET /api/v1/auth/callback/google` 에서 code·state 수신 → code로 id_token 교환 → id_token 검증 → 사용자 생성/조회 → JWT 발급 → **프론트** `{FRONTEND_APP_URL}/login#token={JWT}` 로 리다이렉트
5. **프론트**: `/login` 페이지에서 hash의 `token`을 읽어 로컬스토리지에 저장 후 홈으로 이동

---

## 3. 구현된 API

### 3.1 OAuth 진입 (Google 로그인 시작)

- **Method**: `GET`
- **Path**: `/api/v1/auth/google`

**동작**

1. CSRF용 **state** 생성 후 쿠키에 저장
2. **redirect_uri** = 백엔드 자신의 콜백 URL (예: `https://api.junoshon.cloud/api/v1/auth/callback/google`)
3. Google OAuth 인증 URL로 **302 리다이렉트**  
   - `https://accounts.google.com/o/oauth2/v2/auth`  
   - 쿼리: `client_id`, `redirect_uri`, `response_type=code`, `scope=openid email profile`, `state`, `access_type=offline`, `prompt=consent`

---

### 3.2 OAuth 콜백 (Google → 백엔드, 이후 프론트로 전달)

- **Method**: `GET`
- **Path**: `/api/v1/auth/callback/google`
- **Query**: Google이 전달하는 `code`, `state`, (실패 시) `error` 등

**동작**

1. **state** 검증 (쿠키와 비교). 불일치 시 프론트 로그인 페이지로 `?error=invalid_state` 리다이렉트
2. **code**로 Google token endpoint에 요청 → **id_token** 수신
3. **id_token**을 Google 공개키로 검증
4. payload에서 **sub**, **email**, **name**, **picture** 추출
5. DB에서 **google_sub**로 사용자 조회 → 없으면 생성 (회원가입 겸 로그인)
6. 우리 서비스용 **JWT** 발급
7. **프론트 로그인 페이지**로 리다이렉트:  
   `{FRONTEND_APP_URL}/login#token={JWT}`  
   실패 시: `{FRONTEND_APP_URL}/login?error=...` (예: `backend_auth`, `invalid_state`, `no_code`)

**환경 변수**

- **FRONTEND_APP_URL**: 프론트 앱 기준 URL (예: `https://ourllet.junoshon.cloud`, 로컬 `http://localhost:3000`). 리다이렉트 대상으로 사용.
- **BACKEND_APP_URL**: 백엔드 기준 URL (예: `https://api.junoshon.cloud`). redirect_uri 생성에 사용.

---

### 3.3 Google 로그인 (idToken 직접 전달, 선택)

- **Method**: `POST`
- **Path**: `/api/v1/auth/google`
- **Headers**: `Content-Type: application/json`
- **Body**: `{ "idToken": "<Google에서 받은 JWT id_token>" }`

**동작**

1. **idToken**을 Google 공개키로 검증
2. 검증 성공 시 payload에서 **sub**, **email**, **name**, **picture** 추출
3. DB에서 해당 **google_sub**로 사용자 조회 → 없으면 생성
4. 우리 서비스용 **JWT** 발급
5. **응답**: Status `200`, Body `{ "token": "<JWT>", "user": { "id", "email", "name?", "picture?" } }`

(프론트에서 Google One Tap/팝업으로 idToken을 받아 이 엔드포인트를 호출하는 경우에 사용.)

---

### 3.4 현재 사용자 조회 (토큰 검증)

- **Method**: `GET`
- **Path**: `/api/v1/auth/me`
- **Headers**: `Authorization: Bearer <우리가 발급한 JWT>`

**동작**

1. JWT 추출 후 **서명·만료 검증**
2. 유효하면 payload의 사용자 id로 **DB에서 사용자 조회**
3. **응답**: Status `200`, Body `{ "id", "email", "name?", "picture?" }`

**에러**: 토큰 없음/만료/위조 → `401`

---

## 4. 기존 API 보호 (인증 필수)

- 내역 CRUD 등: `Authorization: Bearer <JWT>` 확인, 없거나 유효하지 않으면 `401`
- 유효하면 payload에서 **userId**를 꺼내 해당 사용자 데이터만 조회/수정/삭제

---

## 5. 사용자 모델

- **google_sub** 를 유일 키로 저장 (자체 `id` PK + `google_sub` 유일)
- 필드: `id`, `google_sub`, `email`, `name`, `picture`, `created_at`, `updated_at`

---

## 6. 환경/설정 (백엔드)

- **Google OAuth**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (콜백에서 code 교환 시 필요)
- **BACKEND_APP_URL**: OAuth redirect_uri 기준 (예: `https://api.junoshon.cloud`)
- **FRONTEND_APP_URL**: OAuth 성공/실패 후 리다이렉트할 프론트 앱 URL
- **JWT**: `JWT_SECRET`, `JWT_EXPIRES_IN`

**Google Cloud Console**

- OAuth 클라이언트의 **승인된 리디렉션 URI**에 **백엔드 콜백 URL** 등록  
  예: `https://api.junoshon.cloud/api/v1/auth/callback/google`  
  (로컬: `http://localhost:3001/api/v1/auth/callback/google`)

---

## 7. 체크리스트 (구현 완료 시)

- [x] `GET /api/v1/auth/google` — Google OAuth URL로 리다이렉트 (redirect_uri = 백엔드 콜백 URL, state 쿠키)
- [x] `GET /api/v1/auth/callback/google` — code·state 수신, code→id_token 교환, 사용자 생성/조회, JWT 발급, **프론트** `{FRONTEND_APP_URL}/login#token=...` 로 리다이렉트
- [x] (선택) `POST /api/v1/auth/google` — body `idToken` 검증, 사용자 생성/조회, JWT 발급, `{ token, user }` 반환
- [x] `GET /api/v1/auth/me` — Bearer JWT 검증, 현재 사용자 정보 반환
- [x] 기존 내역 API에 JWT 필수 적용, 401 미인증 처리
- [x] 사용자 테이블에 `google_sub` 기준 생성/조회

이 사양대로 구현하면 "프론트 → 백엔드 인증 요청 → 백엔드가 구글 OAuth → 구글이 백엔드로 콜백 → 백엔드가 프론트에 토큰 전달" 구조가 됩니다.
