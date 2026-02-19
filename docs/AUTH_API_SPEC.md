# 백엔드 인증 API 사양 (Google OAuth + JWT)

가계부 앱의 **회원가입/로그인** 및 **인증 유지**를 위해 백엔드에서 구현할 API와 동작을 정리한 문서입니다. 프론트는 이미 Google OAuth로 ID 토큰을 받아 이 API를 호출하고, 발급받은 JWT를 로컬스토리지에 저장해 사용합니다.

---

## 1. 목표

- **Google 계정으로만** 가입/로그인 (이메일·이름 등은 Google에서 제공)
- Google에서 받은 **ID 토큰(id_token)** 을 백엔드에서 검증 후, 우리 서비스용 **JWT** 발급
- 발급한 JWT로 사용자 구분 (가계부 초대 등 추후 기능에서 사용)
- 기존 내역 API(`/v1/entries`) 등은 **JWT 필수**로 전환해, 로그인한 사용자만 접근 가능하게 함

---

## 2. 프론트엔드 동작 요약 (참고)

- **진입 시**: 로컬스토리지에 토큰이 없으면 `/login`으로 이동, Google 로그인 버튼 표시
- **Google 로그인 성공 시**: Google이 준 **ID 토큰(credential)** 을 `POST /v1/auth/google` body에 `{ idToken: string }` 으로 전송
- **백엔드 응답**: `{ token: string, user: { id, email, name?, picture? } }` → 프론트는 `token`을 로컬스토리지에 저장하고, 이후 모든 API 요청에 `Authorization: Bearer <token>` 헤더로 포함
- **앱 재실행 시**: 로컬스토리지의 토큰으로 `GET /v1/auth/me` 호출해 현재 사용자 정보 조회 및 로그인 상태 유지

---

## 3. 구현할 API

### 3.1 Google 로그인 (가입 또는 로그인)

**요청**

- **Method**: `POST`
- **Path**: `/v1/auth/google` (또는 `/api/v1/auth/google` — 기존 API prefix에 맞춤)
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  { "idToken": "<Google에서 받은 JWT id_token>" }
  ```

**동작**

1. `idToken`을 **Google 공개키로 검증** (예: Google OAuth2 라이브러리 또는 JWKS 사용).
2. 검증 성공 시 payload에서 **고유 식별자(sub)** 와 필요 시 **email, name, picture** 추출.
3. **DB에서 해당 Google sub로 사용자 조회**
   - 있으면: 해당 사용자로 로그인 처리.
   - 없으면: 사용자 레코드 생성 후 로그인 처리 (회원가입 겸 로그인).
4. 우리 서비스용 **JWT** 발급 (payload 예: `{ sub: userId, ... }`, 만료 시간 설정).
5. **응답**:
   - **Status**: `200`
   - **Body**:
     ```json
     {
       "token": "<발급한 JWT>",
       "user": {
         "id": "<우리 DB 사용자 id>",
         "email": "<이메일>",
         "name": "<이름, 선택>",
         "picture": "<프로필 이미지 URL, 선택>"
       }
     }
     ```

**에러**

- `idToken` 누락/형식 오류: `400`
- Google 검증 실패(만료, 서명 오류 등): `401`
- 기타 서버 에러: `5xx`

---

### 3.2 현재 사용자 조회 (토큰 검증)

**요청**

- **Method**: `GET`
- **Path**: `/v1/auth/me`
- **Headers**: `Authorization: Bearer <우리가 발급한 JWT>`

**동작**

1. `Authorization` 헤더에서 JWT 추출 후 **서명·만료 검증**.
2. 유효하면 payload의 사용자 id로 **DB에서 사용자 조회**.
3. **응답**:
   - **Status**: `200`
   - **Body**:
     ```json
     {
       "id": "<사용자 id>",
       "email": "<이메일>",
       "name": "<이름, 선택>",
       "picture": "<프로필 이미지 URL, 선택>"
     }
     ```

**에러**

- 토큰 없음/만료/위조: `401`
- 사용자 없음: `401` 또는 `404`

---

## 4. 기존 API 보호 (인증 필수)

- **대상**: 내역 CRUD 등 인증이 필요한 API (예: `GET/POST/PUT/DELETE /v1/entries`, `/v1/entries/:id` 등).
- **방식**:  
  - 모든 요청에서 `Authorization: Bearer <JWT>` 를 확인.  
  - JWT가 없거나 유효하지 않으면 `401` 반환.  
  - 유효하면 payload에서 **userId**를 꺼내서, 해당 사용자의 데이터만 조회/수정/삭제하도록 처리.

(추후 "가계부 초대" 기능에서는 가계부 단위로 멤버/권한을 두고, `userId`와 가계부 id를 함께 사용하면 됨.)

---

## 5. 사용자 모델 제안

- **식별**: Google `sub` 값을 **유일 키**로 저장 (또는 우리 자체 `id`를 PK로 두고 `google_sub`를 유일 인덱스).
- **저장 필드 예**:  
  `id`, `google_sub`, `email`, `name`, `picture`, `created_at`, `updated_at`  
  (이메일/이름/사진은 Google payload에서 선택적으로 저장.)

---

## 6. 환경/설정

- **Google OAuth**:  
  - 백엔드에서 ID 토큰 검증 시 사용하는 **Google Client ID** (프론트와 동일한 것 사용 가능).  
  - 필요 시 서비스 계정 또는 OAuth 클라이언트 설정.
- **JWT**:  
  - 서명용 **비밀키(또는 키 페어)** 와 **만료 시간** (예: 7일, 30일) 설정.

---

## 7. 체크리스트 (구현 완료 시 확인)

- [x] `POST /v1/auth/google` — body `idToken` 검증, 사용자 생성/조회, JWT 발급, `{ token, user }` 반환
- [x] `GET /v1/auth/me` — `Authorization: Bearer` JWT 검증, 현재 사용자 정보 반환
- [x] 기존 내역 API에 JWT 필수 적용, 401 미인증 처리
- [x] 사용자 테이블(또는 스키마)에 `google_sub` 기준 생성/조회

이 사양대로 구현하면 프론트의 "Google 로그인 → 로컬스토리지 저장 → 재진입 시 로그인 유지" 흐름과 그대로 연동됩니다.
