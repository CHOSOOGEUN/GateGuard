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
- Route guard: `src/router/index.tsx` — `PrivateRoute` 컴포넌트, 토큰 없으면 `/`로 리다이렉트

### Routing (`src/router/index.tsx`)

- `/` → `LoginPage` (public)
- `/dashboard` → `DashboardPage` ✅ 구현완료
- `/stats` → `StatsPage` ✅ 구현완료
- `/events` → `EventsPage` ✅ 구현완료
- `/settings` → `SettingsPage` ✅ 구현완료 (내 프로필 + 카메라 관리)

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

- 4개 API 병렬 fetch: `GET /api/events/?limit=1000`, `GET /api/events/stats`, `GET /api/events/stats/by-camera`, `GET /api/cameras/`
- 이벤트 목록을 `useMemo`로 가공: 날짜별/시간대별/유형별/오탐사유별 집계
- 상단 카드: 총 발생(events.length), 일평균(전체 기간 ÷ 일수), 오탐율(false_alarm/전체), 평균 처리 시간(confirmed의 handled_at-timestamp 평균) — 모두 최근 1000건 기준
- `CameraRankingTable` — `GET /api/cameras/` 결과로 camera_id → station_name/location 조인
- ⚠️ 모든 통계는 최대 1000건 제한. 백엔드 집계 API(`stats/daily`, `stats/hourly`) 추가되면 교체 예정

### Data Flow (EventsPage)

- `src/hooks/useEventsPage.ts` 단일 훅이 데이터·필터·페이지네이션 모두 담당
- **서버사이드 필터**: `status`, `type`, `camera_id`, `station`, `date_from`/`date_to`, `search` → 백엔드 전송
- **서버사이드 페이지네이션**: `offset=(page-1)*pageSize`, `limit=pageSize`. 응답 헤더 `X-Total-Count` 로 총 건수 받아 `totalPages` 계산 (`getEventsPaged` 사용)
- `search` 입력 400ms 디바운스 적용 (`EventsFilter` 로컬 state → 지연 후 onChange 호출)
- WebSocket `NEW_EVENT` → AppContext `subscribeWsEvent` 구독 (전용 WS 연결 없음)
- WebSocket 수신 시 현재 필터+페이지 그대로 서버 re-fetch
- CSV 내보내기 → 클릭 시 `limit=10000`으로 전체 재조회 후 export

### Component Organization

- `src/components/layout/` — `Sidebar`, `Header`
- `src/components/dashboard/` — `StatCards`, `StatCard`, `AlertList`, `AlertItem`, `CameraStats`, `FalseAlarmList`, `EventDetailModal`, `FalseAlarmModal`
  - `EventDetailModal` — 단일 이벤트 상세. FalseAlarmModal을 내부에서 직접 렌더링. 처리완료/오탐신고 완료 시 버튼 → 완료 문구로 전환 (서버 `handled_at` 재조회). 오탐신고 완료 시 reason도 completedInfo에 저장 후 표시
  - `FalseAlarmModal` — `onSubmitted(reason: string)` 콜백으로 reason 전달. EventDetailModal 경유 시 reason 활용, DashboardPage(AlertItem) 경유 시 `() => refresh()`로 reason은 버림
  - `EventInfoPanel` — 이벤트 상세 패널. `event_type`은 `labelEventType()`으로 한글 변환 후 표시
- `src/components/events/` — `EventsFilter`, `EventsTable`, `EventsPagination`
  - `EventsTable` — `onExport: () => Promise<EventResponse[]>` 콜백으로 전체 export 지원
  - `EventsPagination` — `hasNextPage` 기반 이전/다음 방식 (서버가 total 미반환)
- `src/components/stats/` — `StatSummaryCards`, `DailyTrendChart`, `EventTypeChart`, `HourlyDistributionChart`, `FalseAlarmTable`, `CameraRankingTable`
- `src/components/ui/` — shadcn/ui primitives (generated via `npx shadcn add <component>`)
- `src/constants/eventTypes.ts` — `EVENT_TYPE_LABEL` (영문→한글 맵), `EVENT_TYPE_OPTIONS` (필터 드롭다운용), `labelEventType(raw)` 함수
- `src/contexts/AppContext.tsx` — 전역 상태 (`wsConnected`, `unconfirmedCount`, `loggedIn`). 마운트 시 `GET /api/events/stats`로 `pending` 건수 초기화. WS는 여기서 단일 연결 관리. `subscribeWsEvent`로 구독자(DashboardPage, EventsPage)에 NEW_EVENT 전달
- `src/hooks/` — `useWebSocket` (auto-reconnect, 3s delay, `enabled` 파라미터로 로그인 상태 연동), `useEventsPage` (EventsPage 전용 통합 훅)
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

### 구현된 API 전체 목록

**auth**

- `POST /api/auth/login` — JWT 로그인 ✅ 프론트 연동
- `POST /api/auth/register` — 회원가입 ✅ 프론트 연동 (LoginPage register step)
- `POST /api/auth/find-pw` — 비밀번호 찾기 ✅ 프론트 연동 (query params: `employee_id`, `email`)

**cameras**

- `GET /api/cameras/` — 카메라 목록 ✅ 프론트 연동
- `POST /api/cameras/` — 카메라 등록 ✅ 프론트 연동 (SettingsPage)
- `PATCH /api/cameras/{camera_id}/toggle` — 카메라 활성화/비활성화 ✅ 프론트 연동 (SettingsPage)

**events**

- `GET /api/events/` — 이벤트 목록 ✅ 프론트 연동 (params: `status`, `type`, `camera_id`, `date_from`, `date_to`, `search`, `limit`, `offset`)
- `GET /api/events/stats` — 통계 카드 ✅ 프론트 연동
- `GET /api/events/stats/by-camera` — 구간별 알림현황 ✅ 프론트 연동
- `GET /api/events/{event_id}` — 이벤트 단건 조회 ✅ 프론트 연동
- `PATCH /api/events/{event_id}/status` — 이벤트 상태 변경 ✅ 프론트 연동
- `POST /api/events/{event_id}/false-alarm` — 오탐신고 ✅ 프론트 연동 (body: `{ reason: string }`)

**notifications**

- `GET /api/notifications/` — 알림 목록 ✅ 프론트 연동
- `PATCH /api/notifications/{notification_id}/read` — 읽음 처리 ✅ 프론트 연동

### GET /api/events/ 응답 필드

```ts
{
  (id,
    camera_id,
    timestamp,
    clip_url,
    track_id,
    confidence,
    status,
    event_type,
    reason,
    handled_by,
    handled_at);
}
```

### GET /api/events/stats 응답 필드

```ts
{
  (today_total, pending, confirmed, false_alarm);
}
```

### EventStatus 값

백엔드 확정 상태값 3종: `pending` (미처리) | `confirmed` (처리완료) | `false_alarm` (오탐)

- `pending` → 상세보기·오탐신고 버튼 활성화, 빨간 dot 표시
- `confirmed` / `false_alarm` → 버튼 없음, 완료 문구만 표시

### AI 이벤트 타입 값 (inference.py 출력 → event_type 필드)

AI 분류기 실제 CLASSES: `tailgating | jump | crawling | unpaid` (4종만 사용)

- `emergencydoor`, `normal`은 AI가 출력하지 않음
- `unknown`은 DB 기본값 — AI가 event_type 없이 전송 시 저장됨
- `EVENT_TYPE_OPTIONS` 필터 드롭다운은 실제 AI 출력 4종만 포함
- `EVENT_TYPE_LABEL`은 레거시 데이터 대비용으로 전체 매핑 유지

## 구현 현황

### ✅ 완료

- 로그인 페이지 (JWT 인증, remember me)
- 회원가입 / 비밀번호 찾기 (LoginPage — `step: "login" | "register" | "findpw"` 멀티스텝 폼, API 연동)
- axios 공통 인스턴스 (토큰 자동 주입, 401 리다이렉트)
- WebSocket 훅 (`useWebSocket`) — 자동 재연결
- 공통 TypeScript 타입 (`src/types/index.ts`)
- API 모듈 (`events.ts`, `cameras.ts`, `notifications.ts`)
- Sidebar + Header 레이아웃
- DashboardPage 전체 (API 연동, WebSocket, 4개 위젯, 2개 모달)
  - CameraStats — 역별 알림현황 (건수 내림차순, 최대 5개, WebSocket 실시간 낙관적 업데이트)
  - EventDetailModal — 영상 + 상세정보 패널. 역무원파견(confirm→비활성화)/처리완료(confirm→PATCH)/오탐신고(FalseAlarmModal 내장). 처리 후 서버 `handled_at` 재조회 후 완료 문구 표시
  - FalseAlarmModal — `onSubmitted(reason)` 으로 reason 반환
  - WebSocket NEW_EVENT 시 stats + cameraStats 낙관적 업데이트
- EventsPage (전체 발생내역)
  - 서버사이드 필터: status, type, camera_id, station, 기간(date_from/date_to), search
  - 서버사이드 페이지네이션: offset+limit, X-Total-Count 헤더 기반 totalPages 표시
  - search 입력 400ms 디바운스
  - WebSocket NEW_EVENT → AppContext subscribeWsEvent 경유 re-fetch (전용 WS 없음)
  - CSV 내보내기 → limit=10000 전체 재조회 후 export
  - EventDetailModal 재사용
  - 테이블 table-fixed 레이아웃 — 페이지 이동 시 컬럼 너비 고정
  - 담당자 컬럼: handled_by (숫자 ID) 표시
- StatsPage (ECharts 통계 시각화) — 차트는 서버 집계(`/stats/by-type|hourly|daily`), 오탐 사유·평균 처리시간은 events 1000건 기준
  - StatSummaryCards — 누적발생(events.length)/일평균/오탐율/평균처리시간 4개 카드 (모두 events 배열 기준)
  - DailyTrendChart — 최근 12일 라인 차트
  - EventTypeChart — 감지 유형 비율 도넛 차트 (event_type 데이터 없으면 "데이터 없음")
  - HourlyDistributionChart — 전체 기간 시간대별 발생 분포 가로 바 차트
  - FalseAlarmTable — 오탐 사유별 건수
  - CameraRankingTable — 역별/게이트별 발생 순위 (cameras API 조인으로 역이름 표시)
- SettingsPage (내 프로필 탭: JWT 디코딩으로 사원번호 표시 + 로그아웃 / 카메라 관리 탭: 목록 조회 + 등록 폼 + 활성화 토글)
- Auth route guard (`src/router/index.tsx` — `PrivateRoute` 컴포넌트)
- Header 아바타 JWT 연동 (localStorage/sessionStorage 토큰에서 `employee_id` 디코딩, 첫 글자 표시)
- AppContext (`wsConnected`, `unconfirmedCount` 전역 공유)
- `src/constants/eventTypes.ts` (감지 유형 한글 레이블, 필터 옵션)
- API 문서 (`API.md`)

### ⚠️ 미구현

1. **역무원 파견** — confirm 후 버튼 비활성화(`dispatched` 로컬 state)까지만 구현. 백엔드 API 없어서 실제 파견 처리 불가. 모달 닫고 재열면 파견 상태 리셋됨

### 백엔드 연동 완료 (PR #30, #31)

- ✅ `GET /api/cameras/` ORDER BY id (PR #30)
- ✅ `GET /api/events/?station=<역이름>` 서버사이드 필터 (PR #30 / useEventsPage 가 직접 전달)
- ✅ `GET /api/events/` 응답 `X-Total-Count` 헤더 (PR #31 / `getEventsPaged`)
- ✅ `GET /api/events/stats/by-type` `stats/hourly` `stats/daily?days=N` (PR #31 / StatsPage 차트는 서버 집계 사용)
- ✅ 비활성 카메라 이벤트 거부 — 미존재 404 / `is_active=false` 400 (PR #30)
