# 백엔드 배포 (api.junoshon.cloud / 192.168.11.19)

Nest 서버를 최신 버전으로 올린 뒤 GET/POST `/api/v1/auth/google` 이 모두 동작하도록 할 때 참고용입니다.

## 1. 서버(192.168.11.19)에서 할 일

```bash
# 프로젝트 디렉터리로 이동 (실제 경로에 맞게)
cd ~/ourllet-server   # 또는 배포용 레포 경로

# 최신 코드 받기 (사용 중인 브랜치로)
git fetch origin
git checkout develop   # 또는 main
git pull origin develop

# 의존성 설치
npm install
# 또는 pnpm install

# 빌드
npm run build

# 프로세스 재시작 (방식에 따라 하나만)
# Docker 사용 시 (build만 하면 컨테이너는 안 올라감 → 반드시 up -d)
docker compose up -d --build
# 백엔드만 다시 빌드·재기동할 때:
# docker compose up -d --build backend

# 또는 PM2 사용 시
pm2 restart ourllet-api

# 또는 node 직접 실행 시
# 기존 프로세스 종료 후
npm run start:prod
```

- 컨테이너에는 `restart: unless-stopped` 가 걸려 있어서, 서버 재부팅 후에도 자동으로 postgres·backend 가 올라옵니다.

## 2. 동작 확인

- **GET** (브라우저에서 접속):  
  `https://api.junoshon.cloud/api/v1/auth/google`  
  → Google 로그인 페이지로 리다이렉트되어야 함.

- **POST** (curl 또는 프론트에서):  
  `POST https://api.junoshon.cloud/api/v1/auth/google`  
  Body: `{ "idToken": "<Google id_token>" }`  
  → `{ "token", "user" }` JSON 응답.

- **헬스**:  
  `https://api.junoshon.cloud/api/health`  
  → `{ "ok": true, "service": "ourllet-api" }`.

## 3. 여전히 "Cannot POST" 가 나올 때

- 방금 재시작한 프로세스가 실제로 **새로 빌드된 코드**를 쓰는지 확인 (캐시된 이전 빌드가 아닌지).
- `npm run build` 또는 `docker compose build --no-cache backend` 로 다시 빌드 후 재시작.
