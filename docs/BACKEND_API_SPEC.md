# Ourllet 백엔드 API 명세

## 개요
- 베이스 URL: `/api`
- 에러 응답 형식: `{ "error": "메시지" }` (JSON)
- CORS: 프론트엔드 오리진 허용
- **인증**: `/api/v1/entries`, `/api/v1/summary` 는 `Authorization: Bearer <JWT>` 필수. 미인증 시 `401`

---

## 인증 API

### POST /api/v1/auth/google
**설명:** Google ID 토큰으로 로그인(또는 가입) 후 우리 서비스 JWT 발급.

**Request Body:** `{ "idToken": "<Google ID token>" }`

**성공 (200 OK):**
```json
{
  "token": "<JWT>",
  "user": { "id": "<uuid>", "email": "...", "name": "...", "picture": "..." }
}
```
**에러:** 400 (idToken 누락/형식 오류), 401 (Google 검증 실패)

### GET /api/v1/auth/me
**설명:** 발급한 JWT로 현재 사용자 조회.

**Headers:** `Authorization: Bearer <JWT>`

**성공 (200 OK):** `{ "id", "email", "name?", "picture?" }`  
**에러:** 401 (토큰 없음/만료/위조)

---

## 1. GET /api/health

**설명:** 서비스 상태 확인.

**응답 (200 OK)**
```json
{
  "ok": true,
  "service": "ourllet-api"
}
```

---

## 2. GET /api/v1/entries

**설명:** 가계부 내역 목록. `date` 내림차순 정렬. **인증 필수** (`Authorization: Bearer <JWT>`).

**응답 (200 OK)**  
`LedgerEntry[]`  
**에러:** 401 (미인증)

---

## 3. POST /api/v1/entries

**설명:** 단건 내역 등록. **인증 필수**.

**Request Body**
| 필드   | 타입   | 필수 | 설명 |
|--------|--------|------|------|
| type   | string | O   | `"income"` \| `"expense"` |
| amount | number | O   | 양수 |
| title  | string | O   | 제목 |
| date   | string | O   | `YYYY-MM-DD` |
| memo   | string | X   | 메모 |

**검증 규칙**
- `type`: `income` 또는 `expense` 만 허용
- `amount`: 양수, 숫자
- `title`: 비어 있지 않음
- `date`: `YYYY-MM-DD` 형식

**성공 (201 Created)**  
생성된 `LedgerEntry` 객체 (JSON)

**실패 (400 Bad Request)**  
`{ "error": "메시지" }` — 검증 실패 시

---

## 4. PUT /api/v1/entries/:id

**설명:** 내역 수정. Body는 POST와 동일.

**Request Body**  
POST /api/v1/entries 와 동일 (type, amount, title, date, memo?)

**성공 (200 OK)**  
수정된 `LedgerEntry` 객체 (JSON)

**실패**
- **400 Bad Request:** `{ "error": "메시지" }` — 검증 실패
- **404 Not Found:** `{ "error": "내역을 찾을 수 없어요." }`

---

## 5. DELETE /api/v1/entries/:id

**설명:** 내역 삭제.

**성공 (204 No Content)**  
Body 없음

**실패 (404 Not Found)**  
`{ "error": "내역을 찾을 수 없어요." }`

---

## 6. POST /api/v1/entries/import

**설명:** 벌크 등록. 각 항목 검증 후 성공한 것만 DB 저장.

**Request Body**
```json
{
  "entries": [
    { "type": "income" | "expense", "amount": number, "title": string, "date": "YYYY-MM-DD", "memo?": string },
    ...
  ]
}
```

**검증:** 각 항목에 대해 POST와 동일한 검증 규칙 적용.

**응답 (200 OK)**
```json
{
  "created": number,
  "failed": number,
  "entries": LedgerEntry[],
  "errors": string[]
}
```
- `created`: 저장 성공 개수
- `failed`: 실패 개수
- `entries`: 성공적으로 생성된 LedgerEntry 배열
- `errors`: 실패한 항목에 대한 오류 메시지 배열 (순서 대응)

---

## 7. GET /api/v1/summary

**설명:** 지정 월의 수입/지출/잔액 집계.

**Query**
| 이름   | 타입   | 필수 | 설명        |
|--------|--------|------|-------------|
| period | string | O    | `YYYY-MM`   |

**응답 (200 OK)**
```json
{
  "totalIncome": number,
  "totalExpense": number,
  "balance": number,
  "period": "YYYY-MM"
}
```
- `balance` = totalIncome - totalExpense

**실패 (400 Bad Request)**  
`period` 누락 또는 형식 오류 시 `{ "error": "메시지" }`

---

## 데이터 모델: LedgerEntry

| 필드      | 타입   | 설명 |
|-----------|--------|------|
| id        | string | UUID |
| type      | "income" \| "expense" | |
| amount    | number | 양수 |
| title     | string | |
| memo      | string \| undefined | 선택 |
| date      | string | YYYY-MM-DD |
| createdAt | string | ISO 8601 |
