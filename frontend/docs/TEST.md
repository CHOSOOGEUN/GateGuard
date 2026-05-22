## 테스트 방법

### 1. 백엔드 실행

```bash
docker compose up -d
docker compose exec backend alembic upgrade head
docker compose exec backend python seed.py
```

### 2. 프론트엔드 실행

```bash
cd frontend
npm run dev
```

### 3. 로그인

프론트 실행 후 표시되는 주소로 접속하여 아래 계정으로 로그인합니다.

- ID: `EMP00001`
- PW: `admin1234`

### 4. 이벤트 데이터 생성

`http://localhost:8000/docs` 접속 후 `POST /api/events/` 요청을 아래와 같이 보냅니다.

```json
{
  "camera_id": 1,
  "event_type": "tailgating",
  "clip_url": "https://demo.gateguard.com/clips/tailgate_001.mp4",
  "track_id": 101,
  "confidence": 0.72
}
```
