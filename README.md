# 🛡️ GateGuard

> **지하철 개찰구 AI 기반 무임승차 실시간 감지 시스템**  
> 경기대학교 AI컴퓨터공학부 캡스톤디자인 2026 — Milestone v1.0 (Core Infrastructure Complete)

---

## 📌 프로젝트 소개

지하철 무임승차는 연간 **4,135억 원**의 손실을 유발하는 사회적 문제입니다.  
GateGuard는 기존 역무원의 육안 감시를 대체하여, **CCTV 영상을 AI가 실시간 분석**하고 무임승차(뒤따라 들어오기, 점점, 비상문 이용 등)를 자동 감지해 **관리자 대시보드에 즉시 실시간 알림(WebSocket)**을 전송하는 최첨단 보안 시스템입니다.

---

## 🏗️ 시스템 구조

```
CCTV 영상 입력 (실시간 스트림)
    ↓
비식별화 (Edge/Server) — 얼굴 감지 및 즉시 블러 처리
    ↓
YOLOv11 + ByteTrack — 다중 사람 ID 추적 및 이동 경로 분석
    ↓
Supervision — 개찰구 라인 크로싱 및 구역(Zone) 통과 감지
    ↓
무임승차 판정 (FastAPI) — 게이트 상태 불일치 시 실시간 이벤트 생성
    ↓
실시간 알림 (WebSocket Broadcast) — 모든 관리자 대시보드에 즉시 팝업 알림
    ↓
증거 영상 저장 (AWS S3) — 비동기 셀러리 워커를 통한 클립 업로드
```

---

## 🔧 기술 스택

### AI / ML
| 기술 | 역할 |
|------|------|
| YOLOv11 (Ultralytics) | 실시간 사람 감지 |
| ByteTrack | 다중 객체 ID 추적 |
| Supervision | 라인 크로싱 / 구역 통과 감지 |
| OpenCV | 영상 전처리 및 비식별화 |

### Backend (Milestone v1.0 구축 완료)
| 기술 | 역할 |
|------|------|
| Python 3.11 / FastAPI | 고성능 비동기 REST API 서버 |
| **Alembic** | 데이터베이스 마이그레이션 및 버전 관리 |
| **OAuth2 / JWT** | 관리자 권한 기반 보안 체계 (|
| **WebSocket** | 실시간 감지 알림 브로드캐스트 |
| Celery + Redis | 비동기 영상 업로드 및 알림 작업 |
| PostgreSQL + TimescaleDB | 시계열 이벤트 데이터 저장 |

---

## 🚀 개발 환경 실행 (Quick Start)

### 사전 준비
- Docker Desktop 설치 및 실행
- Python 3.11+ (백엔드 로컬 테스트용)

### 실행 방법

```bash
# 1. 저장소 클론
git clone https://github.com/CHOSOOGEUN/GateGuard.git
cd GateGuard

# 2. 전체 서비스 실행 (Docker 기반)
docker-compose up -d

# 3. 데이터베이스 마이그레이션 (중요!)
# 컨테이너 안에서 Alembic을 통해 최신 스카마를 적용합니다.
docker exec gateguard-backend-1 alembic upgrade head

# 4. API 문서 접속
# 주소: http://localhost:8000/docs
```

---

## 📡 개발자 연동 가이드

### 1. 실시간 알림 (Websocket)
- **엔드포인트**: `ws://localhost:8000/ws/events`
- **수신 타입**: `{"type": "NEW_EVENT", "data": {...}}`
- **담당 파트**: 지현(Frontend Dashboard) 연동용

### 2. 관리자 인증 (JWT)
- **인증 방식**: Bearer Token (Bearer <JWT_TOKEN>)
- **획득 경로**: `POST /api/auth/login` (Admin 계정 필요)
- **대상**: Cameras, Events 전체 조회/수정 API

---

## 🔀 브랜치 전략 (GitHub Flow)

- `master`: 배포 전용 (직접 push 금지)
- `develop`: 통합 개발 브랜치
- `feature/담당자-기능명`: 개별 기능 전용 브랜드

> **[현재 상태]** `feature/조수근-backend-complete-v1` 코드를 `master` 브랜치에 **최종 병합 완료 (Milestone v1.0 정복)** 🏁

---

## 👥 팀원 구성

| 이름 | 역할 | 담당 파트 |
|------|------|------|
| **조수근** | **백엔드 팀장** | **코어 인프라 · 보안 · 실시간 시스템** |
| **김민지** | **프로젝트 팀장** | **DB 설계 · 마이그레이션** |
| **이동근** | 인프라 | 서버 구축 · CI/CD |
| **최태양** | 인프라 | 클라우드 인프라 |
| **이지현** | **프론트팀장** | **대시보드 UI/UX** |
| **김유진** | 프론트엔드 | 클라이언트 통계 |
| **양은혜** | 프론트엔드 | 모바일 앱 |
| **윤효정** | AI | 탐지 모델 구축 |

---

> © 2026 GateGuard Team — 경기대학교 AI컴퓨터공학부 캡스톤디자인
