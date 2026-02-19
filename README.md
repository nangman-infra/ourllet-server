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
| GOOGLE_CLIENT_ID | Google OAuth Client ID (ID 토큰 검증) | — |
| JWT_SECRET | 우리 서비스 JWT 서명 비밀키 | — |
| JWT_EXPIRES_IN | JWT 만료 (예: 7d) | 7d |

## API 개요

- `GET /api/health` — 상태 확인 (인증 불필요)
- `POST /api/v1/auth/google` — Google 로그인, JWT 발급 (body: `{ idToken }`)
- `GET /api/v1/auth/me` — 현재 사용자 조회 (Bearer JWT 필수)
- `GET /api/v1/entries` — 내역 목록 (인증 필수)
- `POST /api/v1/entries` — 단건 등록 (201, 인증 필수)
- `PUT /api/v1/entries/:id` — 내역 수정 (인증 필수)
- `DELETE /api/v1/entries/:id` — 내역 삭제 (204, 인증 필수)
- `POST /api/v1/entries/import` — 벌크 등록 (인증 필수)
- `GET /api/v1/summary?period=YYYY-MM` — 월별 집계 (인증 필수)

상세 명세는 `docs/BACKEND_API_SPEC.md`를 참고하세요.

## 에러 응답

모든 에러는 `{ "error": "메시지" }` 형식의 JSON으로 반환됩니다.

## CORS

- 기본 허용 오리진: `https://ourllet.junoshon.cloud`, `http://localhost:3000`
- `CORS_ORIGIN` 환경 변수로 쉼표 구분 추가 가능.

**리버스 프록시(nginx, Caddy 등) 뒤에서 CORS 에러가 나면:**

1. **OPTIONS 요청이 백엔드까지 전달되는지** 확인하세요. 프록시가 OPTIONS를 막거나 별도 처리하면 브라우저 preflight가 실패합니다.
2. **프록시에서 CORS 헤더를 덮어쓰지 않도록** 하세요. 백엔드(3001)로 프록시만 하고, CORS 헤더는 Nest에서 내려보내게 두는 것이 좋습니다.
3. nginx 예시 (API로만 전달):
   ```nginx
   location /api/ {
     proxy_pass http://127.0.0.1:3001;
     proxy_http_version 1.1;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
4. 배포 후 반드시 **백엔드 컨테이너를 재시작**해 새 CORS 설정이 적용되도록 하세요: `docker compose up -d --build backend`
