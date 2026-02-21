# 고정비 지출/수입 API — 프론트엔드 연동 작업 프롬프트

아래 내용을 **프론트엔드 에이전트/개발자**에게 전달해 **추가 탭**의 고정비 지출·고정비 수입 기능 연동을 요청하세요.

---

## 배경

- 백엔드에 **고정비 지출 / 고정비 수입** API가 추가되었습니다.
- **추가 탭**에서 다음 기능을 구현해야 합니다.

### 고정비 지출

- **제목**: 항목 제목 (예: "우리집 월세", "넷플릭스"). 필수, 최대 100자.
- **카테고리**: 기본 제공 — 월세, 관리비, 통신비, OTT, 구독, 대출. 사용자가 직접 입력해 추가 가능.
- **금액**: 필수.
- **지출 날짜**: 매월 몇 일인지 1–31 (dayOfMonth).
- **메모**: 선택.

### 고정비 수입

- **제목**: 항목 제목 (예: "본업 월급", "프리랜서"). 필수, 최대 100자.
- **카테고리**: 기본 제공 — 월급, 부업. 사용자가 직접 입력해 추가 가능.
- **금액**: 필수.
- **수입 날짜**: 매월 몇 일인지 1–31 (dayOfMonth).
- **메모**: 선택.

- 고정비는 **가계부(ledgerId)** 단위로 관리됩니다. 현재 선택된 가계부의 `ledgerId`(6자리)로 목록 조회·추가·수정·삭제를 합니다.

---

## API 요약 (모두 인증 필요: `Authorization: Bearer <JWT>`)

| 용도 | 메서드 | 경로 | 요약 |
|------|--------|------|------|
| 기본 카테고리 | GET | `/api/v1/fixed-entries/categories` | 지출/수입 기본 카테고리 목록 |
| 고정비 목록 | GET | `/api/v1/fixed-entries?ledgerId=123456` | 해당 가계부 고정비 전체 |
| 고정비 추가 | POST | `/api/v1/fixed-entries` | Body: ledgerId, type, title, category, amount, dayOfMonth, memo(선택) |
| 고정비 수정 | PUT | `/api/v1/fixed-entries/:id` | Body: 수정할 필드만 (type, title, category, amount, dayOfMonth, memo) |
| 고정비 삭제 | DELETE | `/api/v1/fixed-entries/:id` | - |

---

## 상세 스펙

### 1. GET `/api/v1/fixed-entries/categories`

- **쿼리/바디**: 없음.
- **응답 예시**
  ```json
  {
    "expense": ["월세", "관리비", "통신비", "OTT", "구독", "대출"],
    "income": ["월급", "부업"]
  }
  ```
- UI에서 지출/수입 폼의 카테고리 선택 시 기본 옵션으로 사용하고, 사용자가 직접 입력한 값도 허용합니다.

### 2. GET `/api/v1/fixed-entries?ledgerId=123456`

- **쿼리**
  - `ledgerId` (필수): 6자리 숫자 문자열. 현재 선택된 가계부 ID.
- **응답**: 고정비 항목 배열 (해당 가계부 소속만).
  ```json
  [
    {
      "id": "uuid",
      "ledgerId": "123456",
      "userId": "uuid",
      "type": "expense",
      "title": "우리집 월세",
      "category": "월세",
      "amount": 500000,
      "dayOfMonth": 5,
      "memo": "월세",
      "createdAt": "2025-02-18T00:00:00.000Z",
      "updatedAt": "2025-02-18T00:00:00.000Z"
    }
  ]
  ```
- `type`: `"expense"`(지출) 또는 `"income"`(수입).
- `title`: 고정비 항목 제목 (목록/상세 표시용). 기존 데이터는 `null`일 수 있음 → 표시 시 `title ?? category` 사용 권장.
- `dayOfMonth`: 1–31. 매월 해당 날짜에 발생하는 항목으로 표시하면 됩니다.

### 3. POST `/api/v1/fixed-entries`

- **Body**
  ```json
  {
    "ledgerId": "123456",
    "type": "expense",
    "title": "우리집 월세",
    "category": "월세",
    "amount": 500000,
    "dayOfMonth": 5,
    "memo": "월세"
  }
  ```
  - `ledgerId`: 6자리 숫자 문자열 (필수).
  - `type`: `"expense"` | `"income"` (필수).
  - `title`: 고정비 항목 제목, 최대 100자 (필수).
  - `category`: 문자열, 최대 100자 (필수). 기본 카테고리 또는 사용자 입력.
  - `amount`: 양수 숫자 (필수).
  - `dayOfMonth`: 1–31 정수 (필수).
  - `memo`: 문자열, 최대 500자 (선택).
- **응답**: 생성된 고정비 엔티티 (id, ledgerId, userId, type, title, category, amount, dayOfMonth, memo, createdAt, updatedAt).

### 4. PUT `/api/v1/fixed-entries/:id`

- **Param**: `id` — 고정비 항목 UUID.
- **Body**: 수정할 필드만 포함. 모두 선택(partial).
  ```json
  {
    "title": "아파트 관리비",
    "category": "관리비",
    "amount": 50000,
    "dayOfMonth": 10,
    "memo": "매월 10일"
  }
  ```
  - `type`, `title`, `category`, `amount`, `dayOfMonth`, `memo` 중 필요한 것만 보내면 됩니다.
- **응답**: 수정된 고정비 엔티티.

### 5. DELETE `/api/v1/fixed-entries/:id`

- **Param**: `id` — 고정비 항목 UUID.
- **응답**: 204 No Content.

---

## 에러 처리

- `ledgerId`가 6자리가 아니거나 누락: 400 — "ledgerId는 6자리 숫자예요."
- 해당 가계부 멤버가 아님: 403.
- `dayOfMonth`가 1–31이 아님: 400.
- 존재하지 않는 고정비 id로 수정/삭제: 404.

---

## 프론트엔드 구현 제안

1. **추가 탭**에 "고정비 지출" / "고정비 수입" 섹션을 두거나, 탭/스위치로 구분.
2. 진입 시 `GET /api/v1/fixed-entries/categories`로 기본 카테고리를 받아, 지출/수입 폼의 카테고리 선택 옵션으로 사용. 사용자 직접 입력(커스텀 카테고리)도 허용.
3. 현재 선택된 가계부 `ledgerId`로 `GET /api/v1/fixed-entries?ledgerId=...` 호출해 목록 표시. 지출/수입 필터링 표시 권장.
4. 추가: 폼에서 `ledgerId`, `type`, `title`, `category`, `amount`, `dayOfMonth`, `memo` 입력 후 `POST /api/v1/fixed-entries` 호출. 목록/카드에는 `title`을 prominently 표시.
5. 수정: 항목 선택 후 `PUT /api/v1/fixed-entries/:id` 호출.
6. 삭제: 항목 삭제 시 `DELETE /api/v1/fixed-entries/:id` 호출.

---

## 아래 블록을 복사해 프론트엔드 에이전트에게 전달

```
추가 탭에 "고정비 지출"과 "고정비 수입" 기능을 구현해줘.

[고정비 지출]
- 제목: 항목 제목 (예: "우리집 월세", "넷플릭스") — 필수, 목록/카드에 표시
- 카테고리: 기본값 월세, 관리비, 통신비, OTT, 구독, 대출 + 사용자 직접 입력 가능
- 금액, 매월 지출 날짜(1–31), 메모(선택)

[고정비 수입]
- 제목: 항목 제목 (예: "본업 월급", "부업") — 필수, 목록/카드에 표시
- 카테고리: 기본값 월급, 부업 + 사용자 직접 입력 가능
- 금액, 매월 수입 날짜(1–31), 메모(선택)

백엔드 API (모두 Authorization: Bearer <JWT> 필요):
- GET /api/v1/fixed-entries/categories → { expense: string[], income: string[] } 기본 카테고리
- GET /api/v1/fixed-entries?ledgerId=123456 → 해당 가계부 고정비 목록 (ledgerId는 현재 선택된 가계부 6자리). 각 항목에 title, category 포함.
- POST /api/v1/fixed-entries → Body: { ledgerId, type: "expense"|"income", title, category, amount, dayOfMonth, memo? }
- PUT /api/v1/fixed-entries/:id → Body: 수정할 필드만 (type, title, category, amount, dayOfMonth, memo)
- DELETE /api/v1/fixed-entries/:id

상세 스펙과 에러 처리 내용은 docs/FRONTEND_FIXED_ENTRIES_PROMPT.md 를 참고해서 구현해줘.
```
