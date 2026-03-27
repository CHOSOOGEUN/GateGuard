# 🛡️ GateGuard

> **지하철 개찰구 무임승차 자동 감지 시스템**  
> 경기대학교 AI컴퓨터공학부 캡스톤디자인 2026

---

## 📌 프로젝트 소개

지하철 무임승차는 2024년 기준 연간 **4,135억 원**의 손실을 유발하는 사회적 문제입니다.  
GateGuard는 기존 역무원의 육안 감시를 대체하여, **CCTV 영상을 AI가 실시간 분석**하고 무임승차(뒤따라 들어오기, 점프, 비상문 이용 등)를 자동 감지해 즉시 알림을 보내는 시스템입니다.

---

## 🏗️ 시스템 구조

```
CCTV 영상 입력 (실시간 스트림)
    ↓
비식별화 (Edge/Server) — 얼굴 감지 및 즉시 블러 처리
    ↓
YOLOv11 — 프레임별 사람 감지 및 바운딩 박스 생성
    ↓
Supervision + ByteTrack — 다중 사람 ID 추적 및 이동 경로 분석
    ↓
Line Crossing / Zone 감지 — 개찰구 경계 통과 + 게이트 상태 실시간 판단
    ↓
무임승차 판정 — 게이트 열림 없이 경계 통과 시 즉시 이벤트 발생
    ↓
관리자 대시보드 — 실시간 알림 + S3 영상 클립 저장
```

---

## 🔧 기술 스택

### AI / ML
| 기술 | 역할 |
|------|------|
| PyTorch | 모델 학습 프레임워크 |
| YOLOv11 (Ultralytics) | 실시간 사람 감지 |
| ByteTrack (ECCV 2022) | 다중 객체 ID 추적 |
| Supervision (Roboflow) | 존 카운팅, 라인 크로싱 감지 |
| OpenCV | 영상 전처리 및 얼굴 비식별화 |

### Backend
| 기술 | 역할 |
|------|------|
| Python 3.11 / FastAPI | REST API 서버 |
| Celery + Redis | 비동기 작업 큐 |
| PostgreSQL + TimescaleDB | 시계열 이벤트 데이터 저장 |
| AWS S3 | 무임승차 영상 클립 저장 |
| WebSocket | 실시간 감지 알림 |
| JWT | 인증 |

### Frontend
| 기술 | 역할 |
|------|------|
| React.js + Tailwind CSS + Shadcn UI | 관리자 웹 대시보드 |
| React Native | 역무원용 모바일 푸시 알림 앱 |
| Apache ECharts | 통계 및 히트맵 시각화 |

### Infra
| 기술 | 역할 |
|------|------|
| Docker + Docker Compose | 컨테이너 기반 개발/배포 |
| AWS EC2 + Nginx + SSL | 프로덕션 서버 운영 |
| GitHub Actions | CI/CD 자동화 |

---

## 👥 팀원 구성

| 이름 | 학과 | 역할 |
|------|------|------|
| **조수근** | 컴퓨터공학과 | 백엔드 팀장 · AI 보조 |
| **김민지** | 컴퓨터공학과 | 팀 팀장 · DB |
| 이동근 | 컴퓨터공학과 | 인프라 · 서버 |
| 최태양 | 컴퓨터공학과 | 인프라 · 서버 |
| **이지현** | 컴퓨터공학과 | 프론트엔드 팀장 |
| 김유진 | 컴퓨터공학과 | 프론트엔드 |
| 양은혜 | 컴퓨터공학과 | 프론트엔드 |
| 윤효정 | 인공지능전공 | AI |

---

## 📁 프로젝트 구조

```
GateGuard/
├── backend/            # FastAPI 서버
│   ├── app/
│   │   ├── api/        # REST API 엔드포인트
│   │   ├── models/     # DB 모델 (SQLAlchemy)
│   │   ├── schemas/    # Pydantic 스키마
│   │   └── workers/    # Celery 비동기 작업
│   ├── Dockerfile
│   └── requirements.txt
├── ai/                 # AI 추론 파이프라인
│   ├── inference.py    # YOLOv11 + Supervision 추론 로직
│   ├── tracker.py      # ByteTrack 추적 로직
│   └── anonymizer.py   # 얼굴 비식별화
├── frontend/           # React.js 대시보드
│   ├── src/
│   └── package.json
├── mobile/             # React Native 역무원 앱
├── docker-compose.yml
└── README.md
```

---

## 🚀 개발 환경 실행

### 사전 준비
- Docker Desktop 설치 및 실행
- Python 3.11+
- Node.js 20+

### 실행 방법

```bash
# 저장소 클론
git clone https://github.com/CHOSOOGEUN/AdCatch.git
cd AdCatch

# 전체 서비스 실행 (백엔드 + DB + Redis)
docker-compose up -d

# 프론트엔드 개발 서버 실행
cd frontend && npm install && npm run dev
```

---

## 🌐 DB 구조 (초안)

```sql
events       -- id, camera_id, timestamp, clip_url, track_id, confidence, status
cameras      -- id, location, station_name, is_active
admins       -- id, email, password, created_at
notifications -- id, event_id, sent_at, read_at
```

---

## 🔀 브랜치 전략

```
main            ← 배포용 (직접 push 금지)
├── develop     ← 통합 브랜치
│   ├── feature/조수근-backend-api
│   ├── feature/이지현-dashboard-ui
│   └── feature/윤효정-yolo-pipeline
```

> **GitHub Flow** 기반: `feature/담당자-기능명` → PR → 코드 리뷰 → merge

---

## 📚 향후 고도화 계획

1. **동작 분석 (Action Recognition):** 점프, 숙이기 등 무임승차 특유 동작 인식 모델 연동
2. **엣지 컴퓨팅:** NVIDIA Jetson 등 엣지 디바이스에서 1차 분석 수행
3. **통계 대시보드 강화:** 시간대별/개찰구별 무임승차 취약 지점 히트맵 제공

---

## 📌 참고 자료

| 항목 | URL |
|------|-----|
| Supervision 라이브러리 | https://github.com/roboflow/supervision |
| Shadcn UI | https://ui.shadcn.com/ |
| ByteTrack 논문 (ECCV 2022) | https://arxiv.org/abs/2110.06864 |
| AI Hub 교통 CCTV 데이터셋 | https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=165 |
| MOTChallenge 벤치마크 | https://motchallenge.net/ |
| 서울 지하철 무임승차 손실 (2024) | https://www.sedaily.com/NewsView/2GNWOJFF0H |

---

> © 2026 GateGuard Team — 경기대학교 AI컴퓨터공학부 캡스톤디자인
