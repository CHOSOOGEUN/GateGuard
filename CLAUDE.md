# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

GateGuard — 지하철 개찰구 CCTV 영상을 AI가 실시간 분석해 무임승차를 감지하고, 관리자 대시보드에 WebSocket으로 즉시 브로드캐스트하는 시스템. 경기대학교 AI컴퓨터공학부 캡스톤디자인 2026. 팀 및 역할 분담 등 추가 컨텍스트는 루트의 `gemini.md`에 정리되어 있으니 프로젝트 상태/의사결정이 필요할 때 함께 참고할 것.

## 모노레포 구성

- `backend/` — FastAPI + SQLAlchemy(async) + Alembic + Celery. 서비스 API와 WebSocket 허브.
- `ai/` — YOLOv11 + ByteTrack + Supervision 기반 실시간 추론 파이프라인. 독립 프로세스로 돌며 HTTP로 backend에 이벤트를 POST.
- `frontend/` — React 19 + Vite + TypeScript + Tailwind + shadcn 기반 관리자 대시보드.
- `mobile/` — 역무원 알림 앱(React Native). 현재 스캐폴드 수준.
- `scripts/` — DB 시드(`db_baseline_seed.py`, `seed_data_high_density.py`), 테스트 러너(`test.sh`), 서버 모니터(`monitor.sh`).
- `docs/technical/` — AI-Backend 연동, DB 세팅, 기능명세 등 기술 문서. 통합/마이그레이션 전 반드시 확인.
- `Secrets/` — 로컬 자격증명(Git에 커밋 금지).
- `yolo11n.pt`, `ai/yolov11n-face.pt` — `.gitignore`에 의해 제외되는 가중치 파일. 로컬 배치 필요.

## 상시 사용 명령어

### 전체 스택 부팅 (Docker)

```bash
docker-compose up -d                              # db, redis, backend, worker 기동
docker exec gateguard-backend-1 alembic upgrade head   # 최초 기동/스키마 변경 후 필수
```

서비스 포트: backend 8000, postgres(TimescaleDB) 5432, redis 6379. Swagger는 `http://localhost:8000/docs`.

### 백엔드

```bash
# 테스트 (로컬 DB/Redis 기동 상태에서)
./scripts/test.sh                                 # 의존성 설치 + flake8(E9,F63,F7,F82) + pytest --cov
cd backend && pytest tests/test_events.py -v      # 단일 파일
cd backend && pytest tests/test_events.py::test_name -v   # 단일 테스트

# Alembic
cd backend && alembic revision --autogenerate -m "msg"
cd backend && alembic upgrade head
cd backend && alembic downgrade -1

# Celery 워커 (docker-compose 밖에서 돌릴 때)
cd backend && celery -A app.workers.celery_app worker --loglevel=info
```

`pytest.ini`는 `asyncio_mode=auto`, 루프 스코프 `session`. 테스트는 `aiosqlite`로 인메모리 DB를 띄우므로 TimescaleDB가 없어도 돌지만, 하이퍼테이블 관련 마이그레이션은 SQLite에서 의미 없으므로 `tests/conftest.py`가 정의한 픽스처 경로를 따를 것.

### 프론트엔드

```bash
cd frontend
npm install
npm run dev        # Vite dev (기본 5173)
npm run build      # tsc -b && vite build
npm run lint       # eslint .
```

CORS 허용 오리진은 `backend/app/core/config.py`의 `CORS_ORIGINS`에서 관리. 새 포트에서 띄우면 여기에 추가.

### AI 추론

```bash
cd ~/Projects/기초캡스톤/GateGuard
pip install -r ai/requirements.txt
python -m ai.inference          # 기본 카메라(0)에서 실시간 추론
```

`ai/inference.py`는 루트에서 `-m ai.inference`로 실행해야 한다(내부에서 `from ai.anonymizer import ...` 절대 임포트 사용). 실행 시 `backend/.env`를 `dotenv`로 로드하고 `SECRET_KEY`로 자체 JWT를 서명해 `POST /api/events/`로 감지 이벤트를 보낸다. 즉 **AI 프로세스는 backend가 먼저 떠 있어야** 동작한다.

## 아키텍처 핵심

### 런타임 데이터 흐름

1. `ai/inference.py`의 `FarewellEvasionDetector`가 카메라/RTSP 프레임을 YOLOv11로 검출 → `FaceAnonymizer`로 얼굴 블러 → `PersonTracker`(ByteTrack)로 ID 유지 → `sv.LineZone`로 라인 크로싱 판정.
2. 트리거된 track id에 대해 `deque` 기반 전후 10초 프레임 버퍼를 mp4로 로컬 저장(`temp_clips/`), `clip_url`에 로컬 경로를 담아 backend에 POST. **S3 업로드는 worker 측 책임**이고, 현재 `clip_url`이 로컬 경로로 들어오는 단계(milestone 2.0)임에 유의.
3. `backend/app/api/events.py`가 이벤트를 persist → Celery 태스크로 알림 디스패치/영상 후처리 → `app/api/websocket.py`의 `/ws/events`가 접속된 모든 관리자에게 `{"type":"NEW_EVENT", "data":{...}}` 브로드캐스트.
4. `frontend`는 `src/api/axios.ts`로 REST, 대시보드에서 WebSocket 구독.

### 백엔드 레이아웃 (`backend/app/`)

- `main.py` — FastAPI 앱. `ORJSONResponse` 기본, 전역 500 핸들러가 `{success,message,detail}` 포맷 반환. 라우터는 `/api` 프리픽스(단 `websocket.router`는 프리픽스 없음 → `/ws/events`).
- `api/` — 엔드포인트: `auth`, `cameras`, `events`, `notifications`, `websocket`. 의존성은 `api/deps.py`에 모여 있음(JWT 검증, DB 세션).
- `core/` — `config.py`(pydantic-settings, `.env` 로드), `security.py`(JWT/해시), `s3.py`(boto3 래퍼).
- `models/models.py` — SQLAlchemy 모델 단일 파일. `schemas/schemas.py` — pydantic DTO 단일 파일. 새 리소스 추가 시 이 두 파일을 갈라 쓰지 말고 동일 파일에 섹션으로 추가하는 기존 컨벤션 유지.
- `workers/celery_app.py`, `workers/tasks.py` — S3 업로드, 알림 발송 등 비동기 잡.
- `alembic/versions/` — TimescaleDB 하이퍼테이블, 압축 정책, MV(`hourly_event_stats`), 고용번호 기반 admin 확장 등 도메인 특화 마이그레이션이 누적되어 있음. 모델 변경 시 반드시 autogenerate 후 사람이 검수할 것(TimescaleDB 확장 SQL은 자동 생성되지 않음).

### 인증 모델

- `/api/auth/login` → JWT. `Authorization: Bearer <JWT>` 헤더로 나머지 API 호출. `sub`에 admin id, `email` 필드 포함.
- AI 프로세스는 `generate_master_token()`으로 `sub="1"`인 만능 토큰을 매 요청 발급. 운영 환경에서는 별도 서비스 계정 발급 경로로 교체 예정이므로, AI 연동 변경 시 이 지점과 backend 측 admin seed(`scripts/db_baseline_seed.py`)를 같이 본다.
- `SECRET_KEY`, `ALGORITHM`은 `backend/.env`와 AI 쪽에서 **동일해야** JWT 검증이 통과한다.

### DB

PostgreSQL 16 + TimescaleDB. `events`가 하이퍼테이블이며 압축/보존 정책이 마이그레이션에 들어 있음. 로컬 테스트는 SQLite(aiosqlite)로 우회되므로 시계열 관련 이슈는 docker-compose 스택에서 재현해야 한다.

## 브랜치 전략

- `master` — 배포 전용, 직접 push 금지.
- `develop` — 통합 브랜치.
- `feature/<담당자>-<기능>` — 개별 작업. 머지 방향은 feature → develop → master.

## 컨벤션/주의사항

- 백엔드 코드와 주석은 한국어 섞인 스타일(이모지·태그 `[GateGuard]` 등)을 사용한다. 기존 파일을 수정할 때는 톤을 맞추되, 새 파일이라면 과하게 흉내 내지 말 것.
- 가중치(`*.pt`, `*.pth`, `*.onnx`)와 `.env`는 gitignore됨. 리포지토리에 커밋하지 말 것.
- `backend/.env`는 AI/백엔드가 공유한다. 키 변경 시 양쪽을 동시에 고려.
- `docker-compose.yml`의 backend/worker는 `./backend:/app`와 `./scripts:/app/scripts`를 볼륨 마운트하므로, 컨테이너 안에서 스크립트를 `python /app/scripts/seed_data_high_density.py` 식으로 실행 가능.
- `Secrets/` 폴더와 루트 `.DS_Store`는 절대 스테이징하지 말 것.
