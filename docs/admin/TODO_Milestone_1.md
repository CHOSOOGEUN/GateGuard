# GateGuard — Milestone 1.0 (Foundation) - 화요일(4/1)까지 목표

---

## 조수근 (백엔드) 🏆 [Milestone v1.0 완료]
- [x] `backend/.env` 작성 후 `docker-compose up -d` → 서버 정상 실행 확인 (완료: 2026-03-27)
- [x] `http://localhost:8000/docs` 에서 전 엔드포인트 동작 확인 (정상 응답 확인)
- [x] Alembic 세팅 → `alembic upgrade head` 로 테이블 생성 (**완료: 2026-03-27**)
- [x] `get_current_admin` 의존성 함수 작성 → 주요 라우트에 JWT 인증 적용 (**완료: 2026-03-27**)
- [x] 이벤트 생성 시 `manager.broadcast()` 호출 → WebSocket 실시간 전송 연결 (**완료: 2026-03-27**)
- [x] **백엔드 코어 인프라 통합 완료 및 master 병합** 🚀 (완료: 2026-03-27)

---

## 김민지 (DB) 🏆 [Milestone v1.0 완료]
- [x] DB 컨테이너 접속 후 TimescaleDB 확장 활성화 + `events` 하이퍼테이블 변환 (**완료: 2026-03-31**) ✨🏆
- [x] Alembic `env.py` async 엔진 연결 (조수근과 함께 완료: 2026-03-27)
- [x] `seed.py` 작성 → 관리자 계정 + 테스트 카메라 데이터 삽입 (**완료: 2026-03-31**) 🏎️💨
- [x] Swagger에서 로그인 → 이벤트 생성까지 흐름 확인 (**완료: 2026-03-31**) 🎯

---

## 이동근 · 최태양 (인프라) 🚀 [완료]
- [x] AWS EC2 생성 (Ubuntu 24.04 LTS) + 보안 그룹 포트 설정 (22, 80, 8000) (완료: 2026-03-28)
- [x] EC2 서버 환경에 Docker + Docker Compose 설치 완료
- [x] `docker-compose up -d --build` 실행 → EC2 위에서 백엔드 앱 가동 확인
- [x] `http://15.135.92.86:8000/docs` 접속 확인 및 팀 공유 성공
- [x] **GitHub Actions CI/CD 파이프라인 구축 및 자동 배포 연동** (완료: 2026-03-28)
- [x] **[최태양] AWS S3 버킷 생성 및 백엔드 연동용 IAM Key 발급** (완료: 2026-03-30)
- [x] **[최태양] Nginx 리버스 프록시 + Let's Encrypt HTTPS(SSL) 적용** (M2 이관 완료)
- [x] **[최태양] Docker Log Rotation 설정 (서버 디스크 고갈 방지)** (M2 이관 완료)

---

## 이지현 · 김유진 · 양은혜 (프론트엔드) 🏆 [완료]
- [x] Vite + React + TypeScript + Tailwind + Shadcn UI 초기 세팅 (**완료: 2026-03-30**)
- [x] axios 인스턴스 + React Router 기본 설정 (**완료: 2026-03-30**)
- [x] 로그인 페이지 → `POST /api/auth/login` 연결 + 토큰 저장 (**완료: 2026-03-30**)
- [x] 로그인 후 대시보드 레이아웃 (사이드바 + 헤더) 구성 (**완료: 2026-03-30**)

---

## 윤효정 (AI) 🚧 [M2 전격 이관]
- [ ] **[M2 이관]** `pip install ultralytics supervision opencv-python httpx` 설치
- [ ] **[M2 이관]** `python ai/inference.py` 실행 → 웹캠에서 사람 감지 + 바운딩 박스 확인
- [ ] **[M2 이관]** 같은 사람 이동 시 tracker ID 유지되는지 확인
- [ ] **[M2 이관]** 얼굴 블러 동작 확인
- [ ] **[M2 이관]** 테스트 영상 기준으로 Line Crossing 좌표 맞게 조정

> **사유**: 테스트 영상 부재 및 M2 "Blitz Integration" 집중을 위한 전략적 선후관계 조정 (2026-03-31)

---

## 브랜치 인프라 (v1.0 통합 완료)
```
master (통합 거점) 🛡️
├── feature/조수근-backend-complete-v1  <-- 🏁 완료
├── feature/김민지-db-setup (PR #10)     <-- 🏁 완료
├── feature/이동근-infra-cicd           <-- 🏁 완료
├── feature/이지현-dashboard-ui         <-- 🏁 완료
└── feature/윤효정-yolo-pipeline        <-- 🚧 M2 집중 타겟
```
