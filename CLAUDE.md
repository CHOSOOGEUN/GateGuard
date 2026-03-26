# AdCatch 프로젝트 컨텍스트

> Claude Code에서 이 파일을 읽고 프로젝트 맥락을 이해하세요.

---

## 프로젝트 개요

**프로젝트명**: AdCatch (애드캐치)
**팀명**: AdCatch
**소속**: 경기대학교 AI컴퓨터공학부 캡스톤디자인 2024

스마트폰으로 불법 광고물(전봇대, 버스정류장, 건물 외벽 스티커 등)을 찍으면
AI가 자동으로 탐지·분류하고, 관할 구청에 민원을 자동 접수하는 시스템.
신고 시 지역화폐 포인트 지급 (앱테크 방식).

---

## 팀 구성

| 이름 | 학과 | 역할 |
|------|------|------|
| 조수근 | 컴퓨터공학과 | 백엔드팀장 · 백엔드 · AI 보조 |
| 김민지 | 컴퓨터공학과 | DB |
| 이동근 | 컴퓨터공학과 |인프라|
| 최태양 | 컴퓨터공학과 | 서버 |
| 이지현 | 컴퓨터공학과 | 프론트엔드팀장 |
| 김유진 | 컴퓨터공학과 | 프론트엔드 |
| 양은혜 | 컴퓨터공학과 | 프론트엔드 |
| 윤효정 | 인공지능전공 | AI |

---

## 서비스 구조

### 사용자 앱 (React Native)
- 찍기 + 포인트 받기만
- iOS + Android 동시 배포
- 기능: 촬영 → AI 판별 결과 확인 → 포인트 수령 → 랭킹

### 관리자 웹 (React.js)
- 지자체 담당자용 PC 웹 대시보드
- 기능: 지도 시각화 · 분류 통계 · 검수 · 민원 접수

### 백엔드 (FastAPI)
- 사용자 앱 · 관리자 웹 공통 API 서버
- AI 모델 추론은 서버에서 처리 (엣지 아님)
- 비동기 처리: Celery + Redis

---

## 기술 스택 (확정)

```
AI / ML
- PyTorch
- YOLOv8 (Ultralytics) — 탐지
- EfficientNet-B0 — 분류 (파이프라인 방식, 멀티태스크 아님)
- EasyOCR — 텍스트 추출
- OpenCV — 전처리 + 얼굴 블러
- 학습 환경: Google Colab Pro (GPU 미확정)

Backend
- Python 3.11
- FastAPI
- Celery + Redis (비동기 큐)
- PostgreSQL + SQLAlchemy + Alembic
- AWS S3 (이미지 저장)
- 네이버 SENS (SMS 인증)
- JWT 인증

Frontend
- React Native (사용자 앱)
- React.js + Tailwind CSS (관리자 웹)
- 네이버맵 API (지도)
- Chart.js (통계)

Infra
- Docker + Docker Compose
- AWS EC2 + Nginx
- GitHub Actions (CI/CD)
```

---

## AI 파이프라인

```
사진 입력
    ↓
YOLOv8 — 불법 광고물 탐지 (바운딩박스)
    ↓
EfficientNet-B0 — 업종 분류
    (불법금융 / 불법도박 / 성인 / 기타불법 / 정상)
    ↓
EasyOCR — 전화번호 · 업체명 추출
    ↓
결과 반환
```

---

## 포인트 시스템

| 시점 | 지급 |
|------|------|
| 신고 접수 시 | 기본 30P |
| 불법 확정 시 | 추가 70P |
| 민원 처리 완료 시 | 보너스 20P |

- 관리자가 AI 결과 검수 후 최종 확정
- 초반엔 AI + 사람 검수 병행, 모델 고도화 후 자동화
-전체회의후 다시 수정

---

## 탐지 카테고리 (2단계 분류)

### 1단계: 매체 분류 (YOLOv8 탐지)
1. 현수막
2. 전단지
3. 스티커
4. 명함
5. 기타

### 2단계: 불법 여부 분류 (EfficientNet)
1. 불법금융
2. 불법도박
3. 성인광고
4. 기타불법
5. 정상광고

### 제외 사항
- 전화번호 추출 제외 (EasyOCR 선택사항)
- 업체명 추출 제외
---

## 민원 처리 흐름

```
사용자 — 찍기 + 포인트 수령 (끝)

서버 / 관리자
    AI 판별 → 검수 → 민원 접수 → 처리 현황 추적
```

- 민원 자동 접수는 관리자 측에서 처리
- 사용자는 민원 과정에 개입 안 함
-데이터셋만 넘겨줄 지 다시 확인

---

## DB 테이블 (초안)

- users (id, phone_number, nickname, point_balance, created_at)
- phone_verifications (id, phone_number, code, expires_at, is_verified)
- reports (id, user_id, image_url, gps_lat, gps_lng, ai_result, confidence, category, status, created_at)
- points (id, user_id, amount, type, description, created_at)
- admins (id, email, password, created_at)

---

## 개발 일정

| 마일스톤 | 기간 | 목표 |
|---------|------|------|
| M1 | ~3월 30일 | 환경 세팅 · 데이터 수집 |
| M2 | ~4월 6일 | 라벨링 완료 · 논문 초록 |
| M3 | ~4월 17일 | 모델 첫 학습 · API 기본 완성 |
| M4 | ~5월 1일 | 앱 · AI 연동 완성 |
| M5 | ~6월 4일 | 전체 완성 · 최종보고서 |
| M6 | ~6월 13일 | 데모 · 경진대회 |

---

## 법적 고려사항

- 얼굴 블러 처리 필수 (OpenCV)
- 위치정보 수집 시 사용자 동의 필수
- 민원 최종 제출은 관리자가 직접 수행-회의 후 변경
- 지역화폐 연동은 지자체 공식 협약 필요
- 크롤링 시 robots.txt 준수
- 포인트 현금화 금지 (바우처·할인권만)

---

## 현재 상태 (2024.03.25 기준)

- [x] 프로젝트 방향 확정
- [x] 기술 스택 확정
- [x] 깃헙 레포 생성
- [x] README 작성
- [x] 폴더 구조 세팅
- [ ] FastAPI 기본 구조 세팅-태양
- [ ] DB 스키마 확정-민지
- [ ] 데이터 수집 시작-모두 다
- [ ] Roboflow 세팅-효정 수근

---

## 이어서 할 것

2. FastAPI 프로젝트 세팅
3. DB 스키마 확정
4. API 엔드포인트 설계 문서 작성
