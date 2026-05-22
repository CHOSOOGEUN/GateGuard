# GateGuard API 연동 현황

백엔드 Swagger 기준 구현된 API와 프론트엔드 연동 상태 정리.

---

## 목차

- [공통 설정](#공통-설정)
- [auth](#auth)
- [cameras](#cameras)
- [events](#events)
- [notifications](#notifications)

---

## 공통 설정

**Base URL**: `VITE_API_BASE_URL` 환경변수 (기본값 `http://localhost:8000`)

**인증**: 모든 요청에 `Authorization: Bearer <token>` 자동 주입 (`src/api/axios.ts`)

- 토큰은 `localStorage.token` 또는 `sessionStorage.token` 에서 탐색
- 401 응답 시 토큰 삭제 후 `/` 로 리다이렉트

**API 모듈 위치**: `src/api/` — 모든 호출은 raw axios 대신 이 모듈 사용

---

## auth

| Method | Endpoint             | 프론트 연동 | 파일                      |
| ------ | -------------------- | ----------- | ------------------------- |
| POST   | `/api/auth/register` | ✅          | `src/pages/LoginPage.tsx` |
| POST   | `/api/auth/login`    | ✅          | `src/pages/LoginPage.tsx` |
| POST   | `/api/auth/find-pw`  | ✅          | `src/pages/LoginPage.tsx` |

### POST /api/auth/login

```ts
// Request
{
  employee_id: string;
  password: string;
}

// Response
{
  access_token: string;
}
```

로그인 성공 시 토큰을 localStorage(remember me) 또는 sessionStorage(세션)에 저장 후 `/dashboard` 로 이동.

### POST /api/auth/find-pw

```ts
// Query Params
{
  employee_id: string;
  email: string;
}
```

---

## cameras

| Method | Endpoint                          | 프론트 연동         | 파일                 |
| ------ | --------------------------------- | ------------------- | -------------------- |
| GET    | `/api/cameras/`                   | ✅ `getCameras()`   | `src/api/cameras.ts` |
| POST   | `/api/cameras/`                   | ✅ `createCamera()` | `src/api/cameras.ts` |
| PATCH  | `/api/cameras/{camera_id}/toggle` | ✅ `toggleCamera()` | `src/api/cameras.ts` |

### GET /api/cameras/

```ts
// Response
interface CameraResponse {
  id: number;
  location: string; // 게이트 번호 (예: "1번 게이트")
  station_name: string; // 역 이름 (예: "강남역")
  is_active: boolean;
}
[];
```

> ⚠️ 백엔드 ORDER BY 없음 — 새로고침마다 순서 변동 가능. 백엔드 정렬 추가 요청 중.

이벤트 API 응답에는 `camera_id` 만 있으므로, 이 API로 카메라 맵을 만든 뒤 이벤트와 조인하여 역이름/게이트 표시.

---

## events

| Method | Endpoint                             | 프론트 연동                  | 파일                | 비고 |
| ------ | ------------------------------------ | ---------------------------- | ------------------- | ---- |
| GET    | `/api/events/`                       | ✅ `getEvents()`             | `src/api/events.ts` |      |
| POST   | `/api/events/`                       | ❌ 미사용                    | —                   | AI용 |
| GET    | `/api/events/stats`                  | ✅ `getEventStats()`         | `src/api/events.ts` |      |
| GET    | `/api/events/stats/by-camera`        | ✅ `getEventStatsByCamera()` | `src/api/events.ts` |      |
| GET    | `/api/events/{event_id}`             | ✅ `getEventById(id)`        | `src/api/events.ts` |      |
| POST   | `/api/events/{event_id}/false-alarm` | ✅ `reportFalseAlarm()`      | `src/api/events.ts` |      |
| PATCH  | `/api/events/{event_id}/status`      | ✅ `updateEventStatus()`     | `src/api/events.ts` |      |

### GET /api/events/

```ts
// Query Params
{
  limit?: number;
  offset?: number;
  status?: "pending" | "confirmed" | "false_alarm";
  type?: string;           // event_type 필터
  camera_id?: number;
  date_from?: string;      // ISO 8601
  date_to?: string;        // ISO 8601
  search?: string;         // EV-번호 / CAM-번호 / 역이름 / 게이트 통합검색
}

// Response
interface EventResponse {
  id: number;
  camera_id: number;
  timestamp: string;            // ISO 8601
  clip_url: string | null;
  track_id: number | null;
  confidence: number | null;    // 0.0 ~ 1.0
  status: "pending" | "confirmed" | "false_alarm";
  event_type: string;           // tailgating | jump | crawling | unpaid | unknown
  reason: string | null;        // 오탐 사유 (false_alarm 시)
  handled_by: number | null;    // 처리한 관리자 내부 ID
  handled_at: string | null;    // ISO 8601
}[]
```

> AI 분류기 실제 출력: `tailgating | jump | crawling | unpaid` (4종)  
> `unknown`은 DB 기본값 — AI가 event_type 없이 전송 시 저장됨

### GET /api/events/stats

```ts
// Response
interface EventStats {
  today_total: number; // 오늘 발생 건수
  pending: number; // 전체 미처리
  confirmed: number; // 전체 처리완료
  false_alarm: number; // 전체 오탐
}
```

### GET /api/events/stats/by-camera

```ts
// Response
{
  camera_id: number;
  count: number;
}
[];
```

> ⚠️ `station_name`, `location` 미포함 — 프론트에서 `GET /api/cameras/` 결과로 조인하여 표시.

### POST /api/events/{event_id}/false-alarm

```ts
// Request
{
  reason: string;
}

// 사전 정의 reason 값 (FalseAlarmModal 기준)
// "기기 오작동" | "노인 무임혜택 미인식" | "장애인 혜택 미인식" | "기타"
```

### PATCH /api/events/{event_id}/status

```ts
// Request
{
  status: "confirmed" | "false_alarm";
}
```

---

## notifications

| Method | Endpoint                       | 프론트 연동                   | 파일                       | 비고               |
| ------ | ------------------------------ | ----------------------------- | -------------------------- | ------------------ |
| GET    | `/api/notifications/`          | ✅ `getNotifications()`       | `src/api/notifications.ts` |                    |
| PATCH  | `/api/notifications/{id}/read` | ✅ `markNotificationRead(id)` | `src/api/notifications.ts` |                    |
| POST   | `/api/notifications/read-all`  | ❌ 미사용                     | —                          | 프론트 불필요 판단 |

### GET /api/notifications/

```ts
// Query Params
{ unread_only?: boolean }

// Response
interface NotificationResponse {
  id: number;
  event_id: number;
  sent_at: string;        // ISO 8601
  read_at: string | null; // null = 미읽음
}[]
```

---

## 백엔드 추가 요청 대기 중

| Endpoint                                   | 용도                         | 프론트 반영 예정                           |
| ------------------------------------------ | ---------------------------- | ------------------------------------------ |
| `GET /api/events/` `station` 파라미터 추가 | 역 드롭다운 서버사이드 필터  | `useEventsPage.ts` 클라이언트 필터 제거    |
| `GET /api/events/` `total` 필드 응답 추가  | 전체 페이지 수 표시          | `EventsPagination` 페이지 번호 목록        |
| `GET /api/events/stats/daily`              | 날짜별 발생 건수 (`days=12`) | `DailyTrendChart` 1000건 제한 해소         |
| `GET /api/events/stats/hourly`             | 시간대별 발생 건수           | `HourlyDistributionChart` 1000건 제한 해소 |
| `GET /api/cameras/` ORDER BY id            | 카메라 목록 정렬 고정        | `CamerasTab` 순서 안정화                   |
| 비활성 카메라 이벤트 수신 시 400 반환      | 비활성 카메라 이벤트 차단    | —                                          |
