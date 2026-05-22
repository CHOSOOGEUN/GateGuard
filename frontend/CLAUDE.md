# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GateGuard is a subway fare evasion real-time detection system. This is the **frontend** (React + TypeScript + Vite) for an admin dashboard that receives WebSocket alerts from a FastAPI backend running at `http://localhost:8000`.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test runner is configured yet.

## Architecture

### Auth Flow
- Login via `POST /api/auth/login` → receives `access_token` (JWT)
- Token stored in `localStorage` (remember me) or `sessionStorage` (session only)
- All API calls use the singleton `src/api/axios.ts` instance, which auto-injects the Bearer token via request interceptor and redirects to `/` on 401
- **Route guard is NOT yet implemented** — all routes are accessible without a token

### Routing (`src/router/index.tsx`)
- `/` → `LoginPage` (public)
- `/dashboard` → `DashboardPage` ✅ 구현완료
- `/stats` → `StatsPage` ⚠️ placeholder ("준비 중" 텍스트만)
- `/events` → `EventsPage` ✅ 구현완료
- `/settings` → `SettingsPage` ⚠️ placeholder ("준비 중" 텍스트만)

### Layout Pattern
Dashboard pages share a consistent layout: `<Sidebar />` (left, fixed w-64) + `<Header />` (top) + `<main>` content. Assemble these manually in each page — no shared layout wrapper component.

### Data Flow (DashboardPage)
`DashboardPage` is the single source of truth for all dashboard data:
- Owns 5 parallel API fetches on mount via `Promise.allSettled` (cameras, events, stats, cameraStats, notifications)
- `cameraMapRef`로 카메라 맵 관리 — WebSocket 핸들러에서도 최신 맵 참조 가능
- Owns modal state (`selectedEvent`, `falseAlarmEvent`)
- Passes data down as props; children call `refresh()` after mutations
- WebSocket `NEW_EVENT` → 카메라 정보 조인 후 prepend to `events[]` (최대 10건) + optimistic stats increment

### Component Organization
- `src/components/layout/` — `Sidebar`, `Header`
- `src/components/dashboard/` — `StatCards`, `StatCard`, `AlertList`, `AlertItem`, `CameraStats`, `FalseAlarmList`, `EventDetailModal`, `FalseAlarmModal`
- `src/components/events/` — `EventsFilter`, `EventsTable`, `EventsPagination`
- `src/components/ui/` — shadcn/ui primitives (generated via `npx shadcn add <component>`)
- `src/contexts/AppContext.tsx` — 전역 상태 (`wsConnected`, `unconfirmedCount`) — Header·Sidebar에서 읽고 DashboardPage·EventsPage에서 설정
- `src/hooks/` — `useWebSocket` (auto-reconnect, 3s delay, `connected` 반환, per-effect `let active` 패턴)
- `src/api/` — `axios.ts` (singleton), `events.ts`, `cameras.ts`, `notifications.ts`
- `src/types/index.ts` — 앱 전체 공유 타입 (`EventResponse`, `EventStats`, `CameraEventStats`, `NotificationResponse`)

### Styling
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin, no `tailwind.config.js`)
- Brand primary: `#4B73F7`
- shadcn/ui with `radix-nova` style, CSS variables enabled, `lucide-react` icons

### Path Alias
`@/` → `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)

## Backend Integration

- REST API base: `VITE_API_BASE_URL` 환경변수 (`src/api/axios.ts`) — always import from `@/api/axios`, never use raw `axios`
- WebSocket: `VITE_WS_URL` 환경변수 (`src/hooks/useWebSocket.ts`)
- 기본값은 `.env` 파일에 정의 (`http://localhost:8000`, `ws://localhost:8000/ws/events`)
- Run the full stack with `docker-compose up -d` from the repo root (`/Users/ijihyeon/Desktop/GateGuard/`)

### 구현된 API (Swagger 확인 완료)
- `GET /api/cameras/` — 카메라 목록
- `GET /api/events/` — 이벤트 목록
- `PATCH /api/events/{event_id}/status` — 이벤트 상태 변경 (처리완료) ✅
- `GET /api/notifications/` — 알림 목록 (인증 불필요)
- `PATCH /api/notifications/{notification_id}/read` — 알림 읽음 처리

### Backend M2 미구현 API (프론트 코드는 작성 완료, 호출 시 404 실패)
이 API들은 실패해도 각 컴포넌트가 null/빈 배열로 graceful fallback 처리:
- `GET /api/events/stats` → StatCards 데이터 (실패 시 카드 0으로 표시)
- `GET /api/events/stats/by-camera` → CameraStats 테이블 (실패 시 빈 테이블)
- `POST /api/events/{id}/false-alarm` → 오탐신고 (실패 시 신고 반영 안 됨)

## 구현 현황

### ✅ 완료
- 로그인 페이지 (JWT 인증, remember me)
- axios 공통 인스턴스 (토큰 자동 주입, 401 리다이렉트)
- WebSocket 훅 (`useWebSocket`) — 자동 재연결
- 공통 TypeScript 타입 (`src/types/index.ts`)
- API 모듈 (`events.ts`, `notifications.ts`)
- Sidebar + Header 레이아웃
- DashboardPage 전체 (API 연동, WebSocket, 4개 위젯, 2개 모달)
  - StatCards — 오늘 감지, 미확인, 처리완료, 오탐 4개 카드
  - AlertList / AlertItem — 최신 알림 10건, 상세보기/오탐신고 버튼
  - CameraStats — 구간별 알림현황 테이블 (고위험/주의/정상 색상 분기)
  - FalseAlarmList — 최근 오탐 신고 5건
  - EventDetailModal — 좌측 실시간 알림 목록 + 우측 상세 정보 + 역무원파견/처리완료/오탐신고 버튼
  - FalseAlarmModal — 오탐 사유 선택 + 직접입력
- EventsPage (전체 발생내역 — 필터/페이지네이션, WebSocket 실시간 삽입, EventDetailModal·FalseAlarmModal 재사용)
- SettingsPage placeholder (`/settings` 라우트 등록)
- AppContext (`wsConnected`, `unconfirmedCount` 전역 공유)
- Sidebar 미확인 뱃지 (unconfirmedCount > 0 시 빨간 동그라미)
- Header WS 뱃지 (wsConnected 기반 on/off)
- 환경변수 분리 (`VITE_API_BASE_URL`, `VITE_WS_URL`)

### ⚠️ 미구현 (우선순위 순)
1. **Auth route guard** — 토큰 없으면 `/`로 리다이렉트 (현재 모든 라우트 인증 없이 접근 가능)
2. **StatsPage** — ECharts 통계 시각화 (현재 placeholder)
3. **SettingsPage** — 설정 기능 (현재 placeholder)

### 로그인 현황 및 블로커
현재 로그인이 불가능하며 두 가지 문제가 모두 해결되어야 함:
1. **CORS 미해결** — 브라우저가 `POST /api/auth/login` 전 OPTIONS 프리플라이트 요청을 보내는데 백엔드가 `http://localhost:5173`을 허용하지 않아 400 반환. 실서버 연결 시 백엔드 `main.py`에 FastAPI `CORSMiddleware` 추가 필요 (`allow_origins=["http://localhost:5173"]`)
2. **DB 미연결** — CORS 해결 후에도 DB가 연결되지 않으면 로그인 쿼리가 hang → `await api.post('/api/auth/login')` 무한 대기 → "로그인 중..." 무한 로딩
- 로그인 없이 `/dashboard` 직접 접근 시 토큰 없음 → 보호된 API 401 반환 (정상 동작, Auth route guard로 해결 예정)

### EventStatus 값
백엔드 확정 상태값 3종: `pending` (미처리) | `confirmed` (처리완료) | `false_alarm` (오탐)
- `pending` → 상세보기·오탐신고 버튼 활성화, 빨간 dot 표시
- `confirmed` / `false_alarm` → 기록보기 버튼만 표시

### EventStats API 응답 필드명
`GET /api/events/stats` 응답: `today_total`, `pending`, `confirmed`, `false_alarm`
(기존 `today_count`, `pending_count` 등과 다름 — 이미 `src/types/index.ts`에 반영 완료)

### 백엔드 확정 후 수정 필요
- `appearance_tags`, `description`, `event_type`, `assigned_to` 필드 실제 응답 포함 여부
- `POST /api/events/{id}/false-alarm` 요청 바디 필드명 (`reason`, `memo?`) 확정 필요
- `NotificationResponse`에 `event` 필드 embed 여부 확인 필요
- clip_url S3 CORS 설정 (백엔드 담당)
- CameraStats 색상 임계값(현재 5/2) 기획 확정 필요
