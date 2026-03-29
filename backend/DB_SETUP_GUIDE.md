# DB 설정 및 테스트 가이드

## 1. 서버 실행

```bash
# 프로젝트 루트에서
docker compose up -d
```

## 2. Alembic 마이그레이션 실행

```bash
# 기존 테이블 생성 + TimescaleDB 하이퍼테이블 변환
docker compose exec backend alembic upgrade head
```

### 마이그레이션 내역
| 리비전 | 설명 |
|--------|------|
| `a4437e459dcf` | 초기 테이블 생성 (admins, cameras, events, notifications) |
| `b5521f8a3c10` | TimescaleDB 확장 활성화 + events 하이퍼테이블 변환 |

## 3. 시드 데이터 삽입

```bash
docker compose exec backend python seed.py
```

### 생성되는 계정
| 이메일 | 비밀번호 | 용도 |
|--------|----------|------|
| `admin@gateguard.com` | `admin1234` | 메인 관리자 |
| `station01@gateguard.com` | `station1234` | 역무원 테스트 |

### 생성되는 카메라
| 역명 | 위치 | 상태 |
|------|------|------|
| 광교역 | 개찰구 1번 게이트 | 활성 |
| 광교역 | 개찰구 2번 게이트 | 활성 |
| 광교중앙역 | 개찰구 1번 게이트 | 활성 |
| 광교중앙역 | 개찰구 2번 게이트 | 비활성 |
| 상현역 | 비상문 출구 | 활성 |

## 4. Swagger 흐름 테스트

브라우저에서 `http://localhost:8000/docs` 접속 후 아래 순서대로 진행:

### Step 1: 로그인
1. `POST /api/auth/login` 클릭
2. Request body 입력:
   ```json
   {
     "email": "admin@gateguard.com",
     "password": "admin1234"
   }
   ```
3. Execute → `access_token` 값 복사

### Step 2: 토큰 등록
1. 페이지 상단 **Authorize** 버튼 클릭
2. Value에 `Bearer {복사한_토큰}` 입력 후 Authorize

### Step 3: 카메라 목록 확인
1. `GET /api/cameras` → Execute
2. 시드 데이터로 삽입한 5개 카메라가 보이면 성공

### Step 4: 이벤트 생성
1. `POST /api/events` 클릭
2. Request body:
   ```json
   {
     "camera_id": 1,
     "clip_url": "https://example.com/test-clip.mp4",
     "track_id": 42,
     "confidence": 0.95
   }
   ```
3. Execute → 201 응답 확인

### Step 5: 이벤트 조회
1. `GET /api/events` → Execute
2. 방금 생성한 이벤트가 목록에 표시되면 전체 흐름 정상

## 5. TimescaleDB 확인 (선택)

```bash
docker compose exec db psql -U gateguard -c "\dx"
# timescaledb 확장이 목록에 있으면 OK

docker compose exec db psql -U gateguard -c "SELECT * FROM timescaledb_information.hypertables;"
# events 테이블이 하이퍼테이블로 표시되면 OK
```
