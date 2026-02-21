# 결산 기능 — 프론트엔드 연동 작업 프롬프트

아래 내용을 **프론트엔드 에이전트/개발자**에게 전달해 **결산** 탭 연동을 요청하세요.

---

## 배경

- **결산** 탭에서는 **월간 결산**을 합니다.
- 파이차트 **전체 = 해당 월 총 수입(100%)**. 슬라이스는 **고정비·저축·지출(카테고리별)** 로 구성됩니다.
- `totalIncome`을 100%로 두고, 각 `items[].amount` 비율로 파이를 그립니다.

---

## API

| 항목 | 내용 |
|------|------|
| Method | GET |
| Path | `/api/v1/settlement?ledgerId=123456&period=YYYY-MM` |
| 인증 | `Authorization: Bearer <JWT>` |
| 쿼리 | `ledgerId` (6자리), `period` (YYYY-MM) |

**응답 예시**

```json
{
  "period": "2026-02",
  "totalIncome": 3000000,
  "items": [
    { "label": "월세", "amount": 300000, "type": "fixed" },
    { "label": "관리비", "amount": 150000, "type": "fixed" },
    { "label": "저축", "amount": 600000, "type": "savings" },
    { "label": "식비", "amount": 400000, "type": "expense" },
    { "label": "기타", "amount": 550000, "type": "expense" }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| period | string | YYYY-MM |
| totalIncome | number | 해당 월 총 수입 (파이 100% 기준) |
| items | array | 슬라이스 목록 (금액 합계 기준 정렬) |
| items[].label | string | 표시 라벨 |
| items[].amount | number | 금액 |
| items[].type | string | `"fixed"` \| `"savings"` \| `"expense"` |

- **fixed**: 고정비 (해당 월 적용분, excludedDates 반영).
- **savings**: 해당 월 저축 합계 1개.
- **expense**: 일반 지출을 카테고리별로 묶음. 기본 카테고리(월세, 관리비, 통신비, OTT, 구독, 대출 등)는 각각 슬라이스, 그 외는 **"기타"** 한 슬라이스.

---

## 에러

- `ledgerId` 누락/6자리 아님 → 400
- `period` 누락/YYYY-MM 아님 → 400
- 해당 가계부 멤버 아님 → 403

---

## 프론트 구현 제안

1. 연·월 선택 후 `GET /v1/settlement?ledgerId=...&period=...` 호출.
2. 파이차트: 전체 = `totalIncome`(100%), 각 슬라이스 = `items[].label`, 값 = `items[].amount` (비율 = amount / totalIncome).
3. `type`별로 색/스타일 구분 가능 (fixed / savings / expense).
4. `items`가 비어 있으면 빈 상태 메시지 표시.

---

## 아래 블록을 복사해 프론트엔드 에이전트에게 전달

```
결산 탭에 월간 결산 기능을 구현해줘.

[기능]
- 파이차트 전체 = 해당 월 **총 수입(100%)**. 슬라이스는 고정비·저축·지출(카테고리별)로 구성.
- 각 슬라이스: label(표시명), amount(금액), type("fixed"|"savings"|"expense").

[API]
- GET /api/v1/settlement?ledgerId=123456&period=YYYY-MM
- 인증: Authorization: Bearer <JWT>
- 응답: { period, totalIncome, items: [ { label, amount, type }, ... ] }
  - totalIncome = 해당 월 총 수입. 파이 비율 = (item.amount / totalIncome) * 100.

[구현]
- 연·월 선택 후 API 호출.
- totalIncome을 100%로 파이차트, items로 슬라이스 (label, amount, type 구분 표시).
- items 비어 있으면 빈 상태 메시지.

상세 스펙은 docs/FRONTEND_SETTLEMENT_PROMPT.md 를 참고해서 구현해줘.
```
