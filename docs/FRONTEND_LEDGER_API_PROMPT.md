# 가계부 공동 사용(초대코드) API — 프론트엔드 연동 작업 프롬프트

아래 내용을 **프론트엔드 에이전트/개발자**에게 전달해 API 연동을 요청하세요.

---

## 배경

- 백엔드에 **가계부 공동 사용** 기능이 추가되었습니다.
- 가계부마다 **6자리 숫자 초대코드**가 있고, **한 가계부에 최대 2명**만 참여할 수 있습니다.
- **설정 탭**에 다음 두 가지가 필요합니다:
  1. **가계부로 초대하기**: 6자리 초대코드 생성/표시
  2. **가계부에 참여하기**: 초대코드 입력으로 다른 가계부 참여

- **entries(내역)**와 **summary(요약)**는 이제 **가계부(ledgerId)** 단위로 동작합니다.  
  사용자가 속한 가계부 목록을 불러와, 선택한 가계부의 `ledgerId`로 내역/요약 API를 호출해야 합니다.

---

## API 요약 (모두 인증 필요: `Authorization: Bearer <JWT>`)

| 용도 | 메서드 | 경로 | 요약 |
|------|--------|------|------|
| 내 가계부 목록 | GET | `/api/v1/ledgers` | 내가 속한 가계부 ID 목록 |
| 초대코드 생성 | POST | `/api/v1/ledgers/invite-code` | 새 가계부 생성 후 6자리 코드 반환 |
| 가계부 참여 | POST | `/api/v1/ledgers/join` | Body: `{ "code": "123456" }` |
| 내역 목록 | GET | `/api/v1/entries?ledgerId=123456` | 해당 가계부 내역 |
| 내역 추가 | POST | `/api/v1/entries` | Body에 `ledgerId`(6자리) 포함 |
| 내역 수정 | PUT | `/api/v1/entries/:id` | Body에 `ledgerId` 포함 권장 |
| 내역 삭제 | DELETE | `/api/v1/entries/:id` | - |
| 내역 일괄 import | POST | `/api/v1/entries/import` | Body: `{ "ledgerId": "123456", "entries": [...] }` |
| 요약 | GET | `/api/v1/summary?ledgerId=123456&period=YYYY-MM` | 해당 가계부·해당 월 요약 |

---

## 상세 스펙

### 1. GET `/api/v1/ledgers`

- **응답 예시**
  ```json
  { "ledgerIds": ["123456", "789012"] }
  ```
- 앱 진입 시 또는 설정 화면 진입 시 호출해, **현재 사용자가 속한 가계부 ID 목록**을 받습니다.  
  이 목록으로 “현재 선택된 가계부”를 정하고, entries/summary 호출 시 해당 `ledgerId`를 사용합니다.

### 2. POST `/api/v1/ledgers/invite-code`

- **Body**: 없음
- **응답 예시**
  ```json
  { "ledgerId": "123456", "code": "123456" }
  ```
- **설정 > 가계부로 초대하기** 버튼 클릭 시 호출합니다.  
  새 가계부가 생성되고, 현재 사용자가 멤버로 추가되며, 6자리 초대코드가 반환됩니다.  
  이 코드를 다른 사람에게 알려주면, 그 사람이 “가계부에 참여하기”에서 입력해 들어올 수 있습니다.

### 3. POST `/api/v1/ledgers/join`

- **Body**
  ```json
  { "code": "123456" }
  ```
- **성공 시**
  ```json
  { "ledgerId": "123456" }
  ```
- **설정 > 가계부에 참여하기**에서 초대코드 6자리 입력 후 “참여” 시 호출합니다.  
  이미 2명이면 `409 Conflict` 등으로 실패할 수 있으므로, 에러 메시지를 사용자에게 보여주세요.

### 4. GET `/api/v1/entries?ledgerId=123456`

- 쿼리 **필수**: `ledgerId` (6자리 숫자)
- 현재 선택된 가계부의 내역 목록을 가져올 때 사용합니다.

### 5. POST `/api/v1/entries`

- **Body 예시**
  ```json
  {
    "ledgerId": "123456",
    "type": "income",
    "amount": 10000,
    "title": "월급",
    "date": "2025-02-18",
    "memo": "선택"
  }
  ```
- `ledgerId`는 **필수**이며, 현재 사용자가 멤버인 가계부 ID여야 합니다.

### 6. PUT `/api/v1/entries/:id`

- **Body**: POST와 동일하게 `ledgerId` 포함 가능 (기존 내역의 가계부는 변경되지 않음).

### 7. POST `/api/v1/entries/import`

- **Body**
  ```json
  {
    "ledgerId": "123456",
    "entries": [
      { "type": "expense", "amount": 5000, "title": "점심", "date": "2025-02-18" }
    ]
  }
  ```
- 해당 가계부에 대해서만 일괄 import 합니다.

### 8. GET `/api/v1/summary?ledgerId=123456&period=2025-02`

- 쿼리 **필수**: `ledgerId`(6자리), `period`(YYYY-MM)  
- 선택된 가계부·선택된 월의 수입/지출/잔액 요약입니다.

---

## 프론트엔드 작업 체크리스트

1. **설정 탭**
   - **가계부로 초대하기**: `POST /api/v1/ledgers/invite-code` 호출 후 응답의 `code`(또는 `ledgerId`)를 6자리로 표시. (복사하기 버튼 권장)
   - **가계부에 참여하기**: 6자리 입력 필드 + 참여 버튼 → `POST /api/v1/ledgers/join` with `{ "code": "123456" }`. 성공 시 `ledgerId`를 “내 가계부 목록”에 반영하고, 필요 시 해당 가계부로 전환.

2. **가계부 선택**
   - 앱 로드 또는 설정 후 `GET /api/v1/ledgers`로 `ledgerIds` 수신.
   - “현재 선택된 가계부” 상태를 하나 두고, 설정 또는 별도 UI로 전환 가능하게 처리.
   - `ledgerIds`가 비어 있으면, “가계부로 초대하기”를 한 번 호출해 첫 가계부를 만들고 그 `ledgerId`를 선택 상태로 둡니다.

3. **내역/요약**
   - 모든 **entries** 호출에 현재 선택된 `ledgerId` 사용:  
     `GET /api/v1/entries?ledgerId=...`, POST/PUT/import body에 `ledgerId` 포함.
   - **summary** 호출 시 `ledgerId`와 `period` 모두 쿼리에 포함:  
     `GET /api/v1/summary?ledgerId=...&period=YYYY-MM`.

4. **에러 처리**
   - `409`: 가계부가 이미 2명일 때 참여 거부 → “이 가계부는 이미 2명이 사용 중이에요.” 등 안내.
   - `404`: 잘못된 초대코드 또는 해당 가계부 권한 없음 → 적절한 메시지 표시.

---

## 로컬 테스트

- 백엔드: `http://localhost:3001` (또는 `npm run start:dev` / Docker 포트)
- 위 API를 순서대로 호출해 보며,  
  “초대코드 생성 → 참여 → 내역/요약에 ledgerId 넣어 호출” 흐름이 동작하는지 확인하면 됩니다.
