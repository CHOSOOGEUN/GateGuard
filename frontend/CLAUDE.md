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
- `/settings` → Sidebar nav item 존재하나 **라우트 미등록**

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
- `src/components/ui/` — shadcn/ui primitives (generated via `npx shadcn add <component>`)
- `src/hooks/` — `useWebSocket` (auto-reconnect, 3s delay, per-effect `let active` 패턴으로 StrictMode 이중 연결 방지)
- `src/api/` — `axios.ts` (singleton), `events.ts`, `cameras.ts`, `notifications.ts`
- `src/types/index.ts` — 앱 전체 공유 타입 (`EventResponse`, `EventStats`, `CameraEventStats`, `NotificationResponse`)

### Styling
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin, no `tailwind.config.js`)
- Brand primary: `#4B73F7`
- shadcn/ui with `radix-nova` style, CSS variables enabled, `lucide-react` icons

### Path Alias
`@/` → `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)

## Backend Integration

- REST API base: `http://localhost:8000` (hardcoded in `src/api/axios.ts`) — always import from `@/api/axios`, never use raw `axios`
- WebSocket: `ws://localhost:8000/ws/events` (hardcoded in `src/hooks/useWebSocket.ts`)
- Run the full stack with `docker-compose up -d` from the repo root (`/Users/ijihyeon/Desktop/GateGuard/`)

### Backend M2 미구현 API (프론트 코드는 작성 완료, API 호출만 실패)
이 API들은 실패해도 각 컴포넌트가 null/빈 배열로 graceful fallback 처리:
- `GET /api/events/stats` → `EventStats`
- `GET /api/events/stats/by-camera` → `CameraEventStats[]`
- `POST /api/events/{id}/false-alarm` → 오탐신고
- `PATCH /api/events/{id}/status` → 이벤트 상태 변경 (처리완료)

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
- EventsPage (전체 발생내역 — 필터/페이지네이션, EventDetailModal·FalseAlarmModal 재사용)

### ⚠️ 미구현 (우선순위 순)
1. **Auth route guard** — 토큰 없으면 `/`로 리다이렉트 (현재 모든 라우트 인증 없이 접근 가능)
2. **StatsPage** — ECharts 통계 시각화 (현재 placeholder)
3. **Settings 라우트** — Sidebar에 항목은 있으나 `/settings` 라우트 미등록
4. **Sidebar 미확인 뱃지** — `unconfirmedCount`가 DashboardPage에서 계산되나 Sidebar에 미전달
5. **Header WebSocket 연결 상태 뱃지** — `useWebSocket`이 `connected` 상태를 반환하지 않아 뱃지가 항상 "실시간 모니터링 중"으로 표시됨
6. **EventsPage WebSocket** — `NEW_EVENT` 수신 시 allEvents 앞에 삽입 미구현 (현재 초기 로드만)
7. **환경변수 분리** — `axios.ts`의 baseURL과 `useWebSocket.ts`의 WS_URL이 하드코딩됨
8. **테스트용 임시 자격증명** — `LoginPage.tsx`에 admin@gmail.com / 1234 초기값이 하드코딩됨 (배포 전 제거 필요)

### 백엔드 확정 후 수정 필요
- `appearance_tags`, `description` 필드명 백엔드 확정 필요
- `POST /api/events/{id}/false-alarm` 요청 바디 필드명 (`reason`, `memo?`) 확정 필요
- `NotificationResponse`에 `event` 필드 embed 여부 확인 필요
- clip_url S3 CORS 설정 (백엔드 담당)
- CameraStats 색상 임계값(현재 5/2) 기획 확정 필요
