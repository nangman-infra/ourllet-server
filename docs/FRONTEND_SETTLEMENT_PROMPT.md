# 결산 기능 — 프론트엔드 연동 작업 프롬프트

아래 내용을 **프론트엔드 에이전트/개발자**에게 전달해 **결산** 탭 연동을 요청하세요.

---

## 배경

- **결산** 탭에서는 **월간 결산**을 합니다.
- 해당 월에 **돈을 많이 쓴 지출 항목**을 조회하고, **항목 제목(title)** 기준으로 **파이차트**를 그립니다.
- 백엔드에서 해당 월 지출을 제목별로 묶어 금액 합계를 내림차순으로 내려줍니다.

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
  "items": [
    { "title": "월세", "amount": 500000 },
    { "title": "식비", "amount": 350000 },
    { "title": "교통비", "amount": 120000 }
  ]
}
```

- `items`: 해당 기간 **지출(type=expense)** 만 모아, **제목(title)으로 그룹**한 뒤 **금액 합계**로 정렬(내림차순).
- 같은 제목의 내역이 여러 건이면 금액이 합쳐집니다.
- 해당 월 지출이 없으면 `items`는 빈 배열 `[]`.

---

## 에러

- `ledgerId` 누락/6자리 아님 → 400
- `period` 누락/YYYY-MM 아님 → 400
- 해당 가계부 멤버 아님 → 403

---

## 프론트 구현 제안

1. **결산** 탭에서 연·월 선택(또는 기본 이번 달) 후 `GET /v1/settlement?ledgerId=...&period=...` 호출.
2. 응답 `items`를 이용해 **파이차트**绘制: 각 슬라이스 = `title`, 값 = `amount`.
3. 툴팁/범례에 제목 + 금액(원) 표시.
4. `items`가 비어 있으면 "이번 달 지출 내역이 없어요" 등 안내 메시지 표시.

---

## 아래 블록을 복사해 프론트엔드 에이전트에게 전달

```
결산 탭에 월간 결산 기능을 구현해줘.

[기능]
- 결산 탭에서 해당 월에 돈을 많이 쓴 지출 항목을 조회한다.
- 그 항목의 **제목(title)** 기준으로 **파이차트**를 그린다.
- 같은 제목의 지출은 금액이 합쳐져서 한 슬라이스로 나온다.

[API]
- GET /api/v1/settlement?ledgerId=123456&period=YYYY-MM
- 인증: Authorization: Bearer <JWT>
- 응답: { period: "YYYY-MM", items: [ { title: string, amount: number }, ... ] }
  - items는 해당 월 지출만, 제목별 금액 합계, 금액 내림차순.

[구현]
- 연·월 선택(또는 기본 이번 달) 후 위 API 호출.
- items로 파이차트 그리기 (슬라이스 = title, 값 = amount).
- items가 비어 있으면 안내 메시지 표시.

상세 스펙은 docs/FRONTEND_SETTLEMENT_PROMPT.md 를 참고해서 구현해줘.
```
