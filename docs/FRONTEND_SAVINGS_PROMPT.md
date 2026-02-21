# 저축 기능 — 프론트엔드 연동 작업 프롬프트

아래 내용을 **프론트엔드 에이전트/개발자**에게 전달해 **저축** 기능 연동을 요청하세요.

---

## 배경

- 백엔드에 **저축(savings)** 타입이 내역(entries)에 추가되었습니다.
- 지출(expense)·수입(income)과 동일한 내역 API를 쓰며, `type: 'savings'`와 `category`로 구분합니다.
- **이번달 요약**의 잔액은 **잔액 = 수입 - (지출 + 저축)** 으로 계산되며, 백엔드에서 `totalSavings`와 `balance`를 내려주므로 **프론트에서는 해당 값을 그대로 표시하면 됩니다.**

---

## UI/UX 요구사항

1. **저축 구분**
   - 저축 관련 텍스트·금액은 **초록색**으로 표시해 지출·수입과 구분한다.
2. **배치**
   - 저축 항목/버튼은 **지출·수입 근처**에 두고, 레이아웃상 자연스러운 위치(예: 내역 리스트 상단 탭, FAB 옆 버튼 등)에 배치한다.
3. **달력**
   - 해당 날짜에 저축이 있음을 나타내는 **인디케이터는 초록색**으로 표시한다.
4. **홈 이번달 요약**
   - **잔액 = 수입 - (지출 + 저축)** 으로 표시한다.
   - 백엔드에서 `totalIncome`, `totalExpense`, `totalSavings`, `balance`를 내려주므로, 이 값을 그대로 사용해 표시하면 된다. (계산은 백엔드에서 수행됨)

---

## 저축 입력 폼 (저축 버튼/탭 선택 시)

- **카테고리**: 기본 제공 — 예금, 적금, 주식, 채권. 사용자가 직접 입력해 추가 가능.
- **금액**: 필수.
- **제목**: 필수.
- **날짜**: YYYY-MM-DD.
- **메모**: 선택.

(지출·수입과 동일한 필드 구성, 저축만 `type: 'savings'`와 `category` 사용.)

---

## API 요약 (모두 인증: `Authorization: Bearer <JWT>`)

| 용도 | 메서드 | 경로 | 요약 |
|------|--------|------|------|
| 저축 기본 카테고리 | GET | `/api/v1/entries/savings-categories` | 예금, 적금, 주식, 채권 배열 |
| 내역 목록(지출·수입·저축) | GET | `/api/v1/entries?ledgerId=123456` | type에 income, expense, savings 포함 |
| 내역 추가 | POST | `/api/v1/entries` | 저축 시 type: "savings", category 필수 |
| 내역 수정 | PUT | `/api/v1/entries/:id` | 동일 |
| 내역 삭제 | DELETE | `/api/v1/entries/:id` | - |
| 이번달 요약 | GET | `/api/v1/summary?ledgerId=123456&period=YYYY-MM` | totalSavings, balance(수입-(지출+저축)) 포함 |

---

## 상세 스펙

### 1. GET `/api/v1/entries/savings-categories`

- **응답 예시**: `["예금", "적금", "주식", "채권"]`
- 저축 폼의 카테고리 선택 옵션으로 사용하고, 사용자 직접 입력도 허용.

### 2. GET `/api/v1/entries?ledgerId=123456`

- 응답 배열 각 항목에 `type`이 `"income"` | `"expense"` | `"savings"` 로 올 수 있음.
- 저축 항목은 `type === 'savings'` 이며, `category`가 있음(예금, 적금 등). 이 항목들은 **초록색**으로 표시.

### 3. POST `/api/v1/entries` (저축 추가)

- **Body 예시**
  ```json
  {
    "ledgerId": "123456",
    "type": "savings",
    "category": "적금",
    "amount": 500000,
    "title": "월 적금",
    "date": "2026-02-18",
    "memo": "자동이체"
  }
  ```
  - `type`: `"savings"` (저축일 때 필수).
  - `category`: 문자열 필수 (예금, 적금, 주식, 채권 또는 사용자 입력).
  - `amount`, `title`, `date` 필수, `memo` 선택.

### 4. PUT `/api/v1/entries/:id`

- 저축 수정 시에도 동일하게 `type`, `category`, `amount`, `title`, `date`, `memo` 전송.

### 5. GET `/api/v1/summary?ledgerId=123456&period=2026-02`

- **응답 예시**
  ```json
  {
    "totalIncome": 3000000,
    "totalExpense": 1500000,
    "totalSavings": 500000,
    "balance": 1000000,
    "period": "2026-02"
  }
  ```
  - `balance` = 수입 - (지출 + 저축). 이 값을 **남은 잔액**으로 표시하면 됨.

---

## 에러 처리

- 저축 추가 시 `type: "savings"` 인데 `category` 누락 → 400 (저축일 때는 카테고리 필수).

---

## 아래 블록을 복사해 프론트엔드 에이전트에게 전달

```
저축 기능을 구현해줘.

[UI/UX]
- 저축은 **초록색**으로 구분 (텍스트·금액).
- 저축 항목/버튼은 지출·수입 근처에 배치 (위치는 디자인적으로 자연스럽게).
- 달력에서 저축이 있는 날은 **초록색 인디케이터**로 표시.
- 홈 이번달 요약의 **남은 잔액** = 수입 - (지출 + 저축). 백엔드에서 totalSavings와 balance를 내려주므로 그대로 표시하면 됨 (계산은 백엔드에서 함).

[저축 입력 폼]
- 카테고리: 기본값 예금, 적금, 주식, 채권 + 사용자 직접 입력 가능.
- 금액, 제목, 날짜(YYYY-MM-DD), 메모(선택).

[API]
- GET /api/v1/entries/savings-categories → 저축 기본 카테고리 배열.
- GET /api/v1/entries?ledgerId=123456 → 내역 목록 (type에 income, expense, savings 포함). savings 항목은 초록색 표시.
- POST /api/v1/entries → 저축 추가 시 Body: { ledgerId, type: "savings", category, amount, title, date, memo? }.
- PUT /api/v1/entries/:id, DELETE /api/v1/entries/:id → 동일.
- GET /api/v1/summary?ledgerId=...&period=YYYY-MM → totalIncome, totalExpense, totalSavings, balance. balance가 잔액(수입-(지출+저축)).

상세 스펙은 docs/FRONTEND_SAVINGS_PROMPT.md 를 참고해서 구현해줘.
```
