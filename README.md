# Ourllet API (가계부 백엔드)

NestJS + PostgreSQL 기반 가계부 API. 프론트엔드(Next.js)와 동일한 API 계약을 따릅니다.

## 요구 사항

- Node.js 24.x
- pnpm (또는 npm)
- PostgreSQL

## 설치 및 실행

```bash
# 의존성 설치 (pnpm 사용 시)
pnpm install

# 또는 npm
npm install

# 환경 변수 (선택, 기본값 있음)
cp .env.example .env

# 개발 서버 (포트 기본 3001)
pnpm run start:dev
# 또는
npm run start:dev

# 프로덕션 빌드 후 실행
pnpm run build && pnpm run start:prod
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| PORT | 서버 포트 | 3001 |
| DATABASE_HOST | PostgreSQL 호스트 | localhost |
| DATABASE_PORT | PostgreSQL 포트 | 5432 |
| DATABASE_USER | DB 사용자 | postgres |
| DATABASE_PASSWORD | DB 비밀번호 | postgres |
| DATABASE_NAME | DB 이름 | ourllet |

## API 개요

- `GET /api/health` — 상태 확인
- `GET /api/v1/entries` — 내역 목록 (date 내림차순)
- `POST /api/v1/entries` — 단건 등록 (201)
- `PUT /api/v1/entries/:id` — 내역 수정
- `DELETE /api/v1/entries/:id` — 내역 삭제 (204)
- `POST /api/v1/entries/import` — 벌크 등록
- `GET /api/v1/summary?period=YYYY-MM` — 월별 집계

상세 명세는 `docs/BACKEND_API_SPEC.md`를 참고하세요.

## 에러 응답

모든 에러는 `{ "error": "메시지" }` 형식의 JSON으로 반환됩니다.

## CORS

프론트엔드 오리진 허용(`origin: true`)으로 설정되어 있습니다.
