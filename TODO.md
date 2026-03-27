# GateGuard — 화요일(4/1)까지 목표

---

## 조수근 (백엔드) 🏆 [Milestone v1.0 완료]
- [x] `backend/.env` 작성 후 `docker-compose up -d` → 서버 정상 실행 확인 (완료: 2026-03-27)
- [x] `http://localhost:8000/docs` 에서 전 엔드포인트 동작 확인 (정상 응답 확인)
- [x] Alembic 세팅 → `alembic upgrade head` 로 테이블 생성 (**완료: 2026-03-27**)
- [x] `get_current_admin` 의존성 함수 작성 → 주요 라우트에 JWT 인증 적용 (**완료: 2026-03-27**)
- [x] 이벤트 생성 시 `manager.broadcast()` 호출 → WebSocket 실시간 전송 연결 (**완료: 2026-03-27**)
- [x] **백엔드 코어 인프라 통합 PR(v1.0) 상신** 🚀

---

## 김민지 (DB)
- [ ] DB 컨테이너 접속 후 TimescaleDB 확장 활성화 + `events` 하이퍼테이블 변환
- [x] Alembic `env.py` async 엔진 연결 (조수근과 함께 완료: 2026-03-27)
- [ ] `seed.py` 작성 → 관리자 계정 + 테스트 카메라 데이터 삽입
- [ ] Swagger에서 로그인 → 이벤트 생성까지 흐름 확인

---

## 이동근 · 최태양 (인프라)
- [ ] AWS EC2 생성 (Ubuntu 22.04) + 보안 그룹 포트 설정 (22, 80, 443, 8000)
- [ ] EC2에 Docker + Docker Compose 설치
- [ ] 레포 clone 후 `docker-compose up -d` 실행 → EC2에서 서버 뜨는지 확인
- [ ] `http://EC2주소:8000/docs` 접속 확인 후 팀 공유

> Nginx, HTTPS, CI/CD는 다음 주에

---

## 이지현 · 김유진 · 양은혜 (프론트엔드)
- [ ] Vite + React + TypeScript + Tailwind + Shadcn UI 초기 세팅
- [ ] axios 인스턴스 + React Router 기본 설정
- [ ] 로그인 페이지 → `POST /api/auth/login` 연결 + 토큰 저장
- [ ] 로그인 후 대시보드 레이아웃 (사이드바 + 헤더) 구성

> 이벤트/카메라 페이지는 다음 주에

---

## 윤효정 (AI)
- [ ] `pip install ultralytics supervision opencv-python httpx` 설치
- [ ] `python ai/inference.py` 실행 → 웹캠에서 사람 감지 + 바운딩 박스 확인
- [ ] 같은 사람 이동 시 tracker ID 유지되는지 확인
- [ ] 얼굴 블러 동작 확인
- [ ] 테스트 영상 기준으로 Line Crossing 좌표 맞게 조정

> 데이터셋 다운로드 신청은 병행으로 걸어두기 (승인 오래 걸림)

---

## 브랜치 인프라
```
develop
├── feature/조수근-backend-complete-v1  <-- 🏁 통합 완료
├── feature/김민지-db-migration
├── feature/이동근-infra-cicd
├── feature/이지현-dashboard-ui
└── feature/윤효정-yolo-pipeline
```
