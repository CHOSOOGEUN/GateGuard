# GateGuard 프로젝트 컨텍스트
> 이 파일을 읽고 프로젝트 전체 맥락을 파악한 뒤 대화를 이어가세요.

---

## 프로젝트 개요

**프로젝트명**: GateGuard (게이트가드)
**팀명**: GateGuard
**소속**: 경기대학교 AI컴퓨터공학부 캡스톤디자인 2026
**GitHub 레포**: https://github.com/CHOSOOGEUN/GateGuard

지하철 개찰구 CCTV 영상을 AI가 실시간 분석해 무임승차(뒤따라 들어오기, 점프, 비상문 이용 등)를 자동 감지하고 역무원에게 즉시 알림을 보내는 시스템.

---

## 주제 변경 히스토리

| 단계 | 주제 | 변경 이유 |
|------|------|-----------|
| 최초 | 지하철 무임승차 감지 | — |
| 1차 변경 | AdCatch (불법 광고물 탐지 신고) | — |
| 2차 변경 (현재) | GateGuard (지하철 무임승차 감지) | 멘토 피드백: AdCatch는 AI 필요성 약함, 문제 규모 작음 |

**멘토 피드백 핵심**: "AI 필요성과 문제 크기 측면에서 아쉬움이 있다"
→ 지하철 무임승차로 복귀. 연 4,135억 손실(2024), AI 없이는 24시간 감시 불가능.

---

## 팀 구성

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

## 서비스 구조

### 관리자 웹 (React.js)
- 역무원/관제 담당자용 PC 대시보드
- 실시간 CCTV 영상 스트림 + 무임승차 감지 알림
- 이벤트 영상 클립 저장 및 조회
- 역별 통계 현황

### 백엔드 (FastAPI)
- CCTV 영상 수신 및 AI 추론 처리
- 실시간 알림 (WebSocket)
- 비동기 처리: Celery + Redis

### 역무원 알림 앱 (React Native) — 
- 무임승차 감지 시 모바일 푸시 알림

---

## 기술 스택

```
AI / ML
- PyTorch
- YOLOv11 (Ultralytics) — 최신 객체 탐지 모델 (YOLOv8 기반 업그레이드)
- ByteTrack (ECCV 2022) — 다중 객체 ID 추적
- Supervision (Roboflow) — 고수준 CV 라이브러리 (시각화, 존 카운팅, 라인 크로싱)
- OpenCV — 영상 전처리 및 비식별화(얼굴 블러)
- 학습 환경: Google Colab Pro

Backend
- Python 3.11 / FastAPI
- Celery + Redis (비동기 큐)
- PostgreSQL + TimescaleDB (시계열 데이터 최적화)
- AWS S3 (영상 클립 저장)
- JWT 인증 및 WebSocket (실시간 알림)

Frontend
- React.js + Tailwind CSS + Shadcn UI (현대적이고 프리미엄한 UI 구성)
- React Native (역무원용 모바일 푸시 알림 앱)
- Apache ECharts (데이터 시각화 및 통계 히트맵)

Infra
- Docker + Docker Compose
- AWS EC2 + Nginx + SSL (Let's Encrypt)
- GitHub Actions (CI/CD)
```

---

## AI 파이프라인

```
CCTV 영상 입력 (실시간 스트림)
    ↓
비식별화 (Edge/Server) — YOLO를 이용한 얼굴 감지 및 즉시 블러 처리
    ↓
YOLOv11 — 프레임별 사람 감지 및 바운딩 박스 생성
    ↓
Supervision + ByteTrack — 다중 사람 ID 추적 및 이동 경로 분석
    ↓
Line Crossing / Zone 감지 — 개찰구 경계 통과 + 게이트 상태 실시간 판단
    ↓
무임승차 판정 — 게이트 열림 없이 경계 통과 시 즉시 이벤트 발생
    ↓
관리자 대시보드 — Shadcn UI 기반 실시간 알림 + S3 영상 클립 저장
```

---

## 향후 고도화 계획 (개선 방안)

1.  **동작 분석 기능:** 단순 추적을 넘어 '점프', '숙이기' 등 무임승차 특유의 동작을 인식하는 Action Recognition 모델 연동.
2.  **엣지 컴퓨팅 도입:** 추후 실서비스 시 대역폭 절감을 위해 NVIDIA Jetson 등 엣지 디바이스에서 1차 분석을 수행하는 아키텍처 도입 검토.
3.  **통계 대시보드 강화:** Apache ECharts를 활용해 시간대별/개찰구별 무임승차 취약 지점 히트맵 제공.

---

## 학습 데이터 계획

- **AI Hub 교통 CCTV 데이터셋** (보행자 포함, 570,000장+, Tracking 포함)
  - https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=165
- **MOT17 / MOT20** 다중 객체 추적 벤치마크
  - https://motchallenge.net/
- **시뮬레이션 영상 직접 촬영** — 학교 출입구 등 유사 환경 재현

---

## DB 테이블 (초안)

- `events` — id, camera_id, timestamp, clip_url, track_id, confidence, status
- `cameras` — id, location, station_name, is_active
- `admins` — id, email, password, created_at
- `notifications` — id, event_id, sent_at, read_at

---

## 참고 자료

| 항목 | URL |
|------|-----|
| Supervision 라이브러리 | https://github.com/roboflow/supervision |
| Shadcn UI Components | https://ui.shadcn.com/ |
| ByteTrack 논문 (ECCV 2022) | https://arxiv.org/abs/2110.06864 |
| AI Hub 교통 CCTV 데이터셋 | https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=165 |
| MOTChallenge 벤치마크 | https://motchallenge.net/ |
| 서울 지하철 무임승차 손실 (2024) | https://www.sedaily.com/NewsView/2GNWOJFF0H |

---

## Gemini에게 전달 사항

- 코드 작업(구현, 디버깅, git)은 **Antigravity와 agent**에서 진행
- 문서, PDF, 회의 자료 작업은 **Gemini와 notebookLM**에서 진행
- 기술 스택은 담당자 재량으로 변경 가능
- GitHub 레포명: GateGuard (https://github.com/CHOSOOGEUN/GateGuard)
- 브랜치 전략: `feature/담당자-기능명` (GitHub Flow)
- README.md 생성 완료 (2026-03-27)
