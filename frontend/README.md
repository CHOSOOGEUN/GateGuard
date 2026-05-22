# GateGuard Frontend

지하철 무임승차 실시간 감지 시스템의 관리자 대시보드 프론트엔드.

## 기술 스택

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- shadcn/ui (radix-nova) + lucide-react
- ECharts (echarts-for-react) — 통계 차트
- sonner — 토스트 알림

## 실행

```bash
npm install
npm run dev       # 개발 서버 (HMR)
npm run build     # 프로덕션 빌드
npm run lint      # ESLint
```

## 환경 변수 (`.env`)

```
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/events
```

실서버: `https://gateguardsystems.com`

## 전체 스택 실행

```bash
# 레포 루트에서
docker-compose up -d
```

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 로그인 (회원가입 / 비밀번호 찾기 포함) |
| `/dashboard` | 실시간 대시보드 (WebSocket, 이벤트 카드, 오탐 신고) |
| `/events` | 전체 발생내역 (필터, 페이지네이션, CSV 내보내기) |
| `/stats` | 통계 시각화 (일별 추이, 시간대별, 유형별, 역별 순위) |
| `/settings` | 내 프로필 + 카메라 관리 |

## 문서

- `CLAUDE.md` — Claude Code 작업 가이드 (아키텍처, 데이터 흐름, 구현 현황)
- `API.md` — 백엔드 API 연동 현황
