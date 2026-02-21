# 고정비(fixed-entries) API — excludedDates 스펙

## 배경

- 내역 탭에서 **"고정비 삭제"** = **그 달만 취소**(해당 날짜만 적용 제외)로 동작한다.
- 예: 2월 19일 고정 지출만 취소 → 2월 19일만 제외, 3월 19일은 그대로 유지.
- 이를 위해 고정비 항목에 **excludedDates** 필드를 두고, 해당 날짜들에는 해당 고정비를 미적용한다.

---

## 1. 스키마

- **필드**: `excludedDates`
- **타입**: `string[]`
- **형식**: 각 요소는 `YYYY-MM-DD` (예: `"2026-02-19"`)
- **의미**: 이 날짜들에는 해당 고정비 미적용 (해당 일에만 “삭제/취소”된 것으로 간주)

저장 시:

- DB 컬럼: `simple-array` (nullable). 없으면 `null`, 응답에서는 `[]`로 내려준다.
- 요청/응답에서는 항상 배열로 다룬다.

---

## 2. GET /v1/fixed-entries?ledgerId={ledgerId}

- 응답 배열의 **각 항목**에 `excludedDates` 포함.
- 값이 없으면 **빈 배열 `[]`** 로 내려준다 (필드 생략하지 않음).

응답 예시:

```json
[
  {
    "id": "uuid",
    "ledgerId": "123456",
    "userId": "uuid",
    "type": "expense",
    "title": "월세",
    "category": "월세",
    "amount": 500000,
    "dayOfMonth": 5,
    "memo": null,
    "excludedDates": ["2026-02-19", "2026-03-19"],
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

## 3. PUT /v1/fixed-entries/:id

- **Request body**에 `excludedDates: string[]` 허용.
- 전달된 배열로 **excludedDates 전체를 치환(덮어쓰기)** 한다.
- 다른 필드만 보내고 `excludedDates`를 생략하면 기존 `excludedDates`는 유지된다.

요청 예시:

```json
{
  "excludedDates": ["2026-02-19", "2026-03-19"]
}
```

- 서버에서 **YYYY-MM-DD 형식 검증** 및 **중복 제거** 후 저장한다.
- 잘못된 형식 요소는 무시된다.

---

## 4. POST /v1/fixed-entries (생성)

- Request body에 **선택 필드**로 `excludedDates: string[]` 허용.
- 없으면 `[]`와 동일하게 동작한다.

---

## 5. 검증 및 정규화 (선택 사항 구현됨)

- **형식**: 각 요소는 `YYYY-MM-DD` 정규식 검증.
- **중복 제거**: 같은 날짜가 여러 번 오면 하나만 유지.
- **정렬**: 저장 시 날짜 배열을 정렬해 둠 (선택).
- **개수**: 366개 이하 (연도 최대 일수).

---

## 6. 에러

- `excludedDates` 요소가 YYYY-MM-DD가 아닌 경우: class-validator에서 400.
- 배열이 366개 초과: 400.
