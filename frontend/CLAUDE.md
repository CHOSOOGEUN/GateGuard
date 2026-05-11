# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GateGuard is a subway fare evasion real-time detection system. This is the **frontend** (React + TypeScript + Vite) for an admin dashboard that receives WebSocket alerts from a FastAPI backend at `https://gateguardsystems.com`.

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
- **Route guard is NOT yet implemented** — 백엔드 켜진 상태에서는 401 인터셉터가 사실상 guard 역할. 백엔드 꺼진 상태에서는 토큰 없이 모든 라우트 접근 가능

### Routing (`src/router/index.tsx`)
- `/` → `LoginPage` (public)
- `/dashboard` → `DashboardPage` ✅ 구현완료
- `/stats` → `StatsPage` ✅ 구현완료
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

### Data Flow (StatsPage)
- 3개 API 병렬 fetch: `GET /api/events/?limit=1000`, `GET /api/events/stats`, `GET /api/events/stats/by-camera`
- 이벤트 목록을 `useMemo`로 가공: 날짜별/시간대별/유형별/오탐사유별 집계
- 평균 처리 시간: `confirmed` 이벤트의 `handled_at - timestamp` 평균 (분 단위)

### Data Flow (EventsPage)
- `GET /api/events/?limit=500` 한 번에 fetch → 클라이언트 필터링/페이지네이션
- **한계**: 최신 500건만 조회 가능. 데모 단계이므로 유지. 실데이터 붙는 시점에 서버사이드 페이지네이션으로 전환 예정 (백엔드에 `skip`/`limit` + `total` 응답 추가 필요)

### Component Organization
- `src/components/layout/` — `Sidebar`, `Header`
- `src/components/dashboard/` — `StatCards`, `StatCard`, `AlertList`, `AlertItem`, `CameraStats`, `FalseAlarmList`, `EventDetailModal`, `FalseAlarmModal`
  - `EventDetailModal` — 단일 이벤트 상세. FalseAlarmModal을 내부에서 직접 렌더링. 처리완료/오탐신고 완료 시 버튼 → 완료 문구로 전환 (서버 `handled_at` 재조회)
  - `FalseAlarmModal` — `onSubmitted(reason: string)` 콜백으로 reason 전달. AlertItem 경유 시 DashboardPage가 렌더링, EventDetailModal 경유 시 EventDetailModal이 내부 렌더링
- `src/components/events/` — `EventsFilter`, `EventsTable`, `EventsPagination`
- `src/components/stats/` — `StatSummaryCards`, `DailyTrendChart`, `EventTypeChart`, `HourlyDistributionChart`, `FalseAlarmTable`, `CameraRankingTable`
- `src/components/ui/` — shadcn/ui primitives (generated via `npx shadcn add <component>`)
- `src/contexts/AppContext.tsx` — 전역 상태 (`wsConnected`, `unconfirmedCount`) — Header·Sidebar에서 읽고 DashboardPage·EventsPage에서 설정
- `src/hooks/` — `useWebSocket` (auto-reconnect, 3s delay, `connected` 반환, per-effect `let active` 패턴)
- `src/api/` — `axios.ts` (singleton), `events.ts`, `cameras.ts`, `notifications.ts`
- `src/types/index.ts` — 앱 전체 공유 타입 (`EventResponse`, `EventStats`, `CameraEventStats`, `NotificationResponse`)

### Styling
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin, no `tailwind.config.js`)
- Brand primary: `#4B73F7`
- shadcn/ui with `radix-nova` style, CSS variables enabled, `lucide-react` icons
- 차트: `echarts` + `echarts-for-react` (StatsPage 전용)

### Path Alias
`@/` → `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)

## Backend Integration

- REST API base: `VITE_API_BASE_URL` 환경변수 (`src/api/axios.ts`) — always import from `@/api/axios`, never use raw `axios`
- WebSocket: `VITE_WS_URL` 환경변수 (`src/hooks/useWebSocket.ts`)
- 기본값은 `.env` 파일에 정의 (`http://localhost:8000`, `ws://localhost:8000/ws/events`)
- 실서버: `https://gateguardsystems.com`
- Run the full stack with `docker-compose up -d` from the repo root (`/Users/ijihyeon/Desktop/GateGuard/`)
- 상세 API 문서: `API.md` 참고

### 구현된 API 전체 목록 (Swagger 확인 완료)

**auth**
- `POST /api/auth/login` — JWT 로그인 ✅ 프론트 연동
- `POST /api/auth/register` — 회원가입 (프론트 미사용)
- `POST /api/auth/find-pw` — 비밀번호 찾기 (프론트 미사용)

**cameras**
- `GET /api/cameras/` — 카메라 목록 ✅ 프론트 연동
- `POST /api/cameras/` — 카메라 등록 (프론트 미사용)
- `PATCH /api/cameras/{camera_id}/toggle` — 카메라 활성화/비활성화 (프론트 미사용)

**events**
- `GET /api/events/` — 이벤트 목록 ✅ 프론트 연동
- `GET /api/events/stats` — 통계 카드 ✅ 프론트 연동
- `GET /api/events/stats/by-camera` — 구간별 알림현황 ✅ 프론트 연동
- `GET /api/events/{event_id}` — 이벤트 단건 조회 ✅ 프론트 연동
- `PATCH /api/events/{event_id}/status` — 이벤트 상태 변경 ✅ 프론트 연동
- `POST /api/events/{event_id}/false-alarm` — 오탐신고 ✅ 프론트 연동

**notifications**
- `GET /api/notifications/` — 알림 목록 ✅ 프론트 연동 (인증 불필요)
- `PATCH /api/notifications/{notification_id}/read` — 읽음 처리 ✅ 프론트 연동
- `POST /api/notifications/read-all` — 전체 읽음 처리 (프론트 미사용)

### GET /api/events/ 실제 응답 필드 (Swagger + curl 확인)
```ts
{
  id, camera_id, timestamp, clip_url, track_id,
  confidence, status, handled_by, handled_at
}
```
- `event_type`: DB에 저장되나 API 응답에 미포함 → 백엔드 추가 요청 필요
- `reason`: DB/API 모두 없음 → 백엔드 추가 요청 필요 (false_alarm 이벤트에만 포함)

### GET /api/events/stats 실제 응답 필드 (curl 확인)
```ts
{ today_total, pending, confirmed, false_alarm }
```

### EventStatus 값
백엔드 확정 상태값 3종: `pending` (미처리) | `confirmed` (처리완료) | `false_alarm` (오탐)
- `pending` → 상세보기·오탐신고 버튼 활성화, 빨간 dot 표시
- `confirmed` / `false_alarm` → 버튼 없음, 완료 문구만 표시

## 구현 현황

### ✅ 완료
- 로그인 페이지 (JWT 인증, remember me)
- axios 공통 인스턴스 (토큰 자동 주입, 401 리다이렉트)
- WebSocket 훅 (`useWebSocket`) — 자동 재연결
- 공통 TypeScript 타입 (`src/types/index.ts`)
- API 모듈 (`events.ts`, `cameras.ts`, `notifications.ts`)
- Sidebar + Header 레이아웃
- DashboardPage 전체 (API 연동, WebSocket, 4개 위젯, 2개 모달)
  - CameraStats — 역별 알림현황 (건수 내림차순, 최대 5개, WebSocket 실시간 순위 변동)
  - EventDetailModal — 영상 + 상세정보 패널. 역무원파견(confirm→비활성화)/처리완료(confirm→PATCH)/오탐신고(FalseAlarmModal 내장). 처리 후 서버 `handled_at` 재조회 후 완료 문구 표시
  - FalseAlarmModal — `onSubmitted(reason)` 으로 reason 반환. EventDetailModal 내부 렌더링 (AlertItem 직접 접근 시 DashboardPage 렌더링)
  - WebSocket NEW_EVENT 시 stats + cameraStats 낙관적 업데이트
- EventsPage (전체 발생내역 — 필터/클라이언트 페이지네이션, WebSocket 실시간 삽입)
- StatsPage (ECharts 통계 시각화)
  - StatSummaryCards — 총발생/일평균/오탐율/평균처리시간 4개 카드
  - DailyTrendChart — 최근 12일 라인 차트
  - EventTypeChart — 감지 유형 비율 도넛 차트 (event_type 필드 백엔드 추가 시 실데이터)
  - HourlyDistributionChart — 시간대별 발생 분포 가로 바 차트
  - FalseAlarmTable — 오탐 사유별 건수 (reason 필드 백엔드 추가 시 실데이터)
  - CameraRankingTable — 역별/게이트별 발생 순위
- AppContext (`wsConnected`, `unconfirmedCount` 전역 공유)
- API 문서 (`API.md`)

### ⚠️ 미구현
1. **Auth route guard** — 토큰 없으면 `/`로 리다이렉트 (백엔드 켜진 상태에서는 401로 사실상 동작)
2. **SettingsPage** — 설정 기능 (현재 placeholder)
3. **역무원 파견** — confirm 후 버튼 비활성화까지만 구현. 백엔드 API 없어서 실제 파견 처리 불가. 모달 닫고 재열면 파견 상태 리셋됨 (로컬 state)
4. **FalseAlarmList 항목 클릭** — 클릭 시 상세 모달 미연결 (`NotificationResponse`에 `event` embed 백엔드 확인 필요)
5. **회원가입 / 비밀번호 찾기** — `LoginPage` 버튼 UI만 존재
6. **지도보기** — `CameraStats` 버튼 핸들러 없음
7. **Header 아바타** — "관" 하드코딩, 로그인 유저 정보 연동 필요

### 백엔드에 추가 요청 필요한 항목
- `GET /api/events/` 응답에 `event_type: string` 추가 → 감지 유형 파이 차트 실데이터
- `GET /api/events/` 응답에 `reason: string | null` 추가 → 오탐신고 현황 실데이터 (`false_alarm`일 때만 값, 나머지 `null`)
- 서버사이드 페이지네이션: `skip` 파라미터 + 응답에 `total` 포함 → EventsPage 500건 제한 해소 (데모 이후)
