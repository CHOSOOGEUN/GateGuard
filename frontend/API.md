# GateGuard API 연동 현황

백엔드 Swagger 기준 구현된 API와 프론트엔드 연동 상태 정리.

---

## 목차

- [공통 설정](#공통-설정)
- [auth](#auth)
- [cameras](#cameras)
- [events](#events)
- [notifications](#notifications)
- [통계 화면 구현 가능성](#통계-화면-구현-가능성)
- [미사용 API 활용 방안](#미사용-api-활용-방안)

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
| POST   | `/api/auth/register` | ❌ 미사용   | —                         |
| POST   | `/api/auth/login`    | ✅          | `src/pages/LoginPage.tsx` |
| POST   | `/api/auth/find-pw`  | ❌ 미사용   | —                         |

### POST /api/auth/login

```ts
// Request
{
  email: string;
  password: string;
}

// Response
{
  access_token: string;
}
```

로그인 성공 시 토큰을 localStorage(remember me) 또는 sessionStorage(세션)에 저장 후 `/dashboard` 로 이동.

---

## cameras

| Method | Endpoint                          | 프론트 연동       | 파일                 |
| ------ | --------------------------------- | ----------------- | -------------------- |
| GET    | `/api/cameras/`                   | ✅ `getCameras()` | `src/api/cameras.ts` |
| POST   | `/api/cameras/`                   | ❌ 미사용         | —                    |
| PATCH  | `/api/cameras/{camera_id}/toggle` | ❌ 미사용         | —                    |

### GET /api/cameras/

```ts
// Response
interface CameraResponse {
  id: number;
  location: string; // 게이트 번호 (예: "1번 게이트")
  station_name: string; // 역 이름 (예: "수원역")
  is_active: boolean;
}
```

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
  status?: "pending" | "confirmed" | "false_alarm";
  camera_id?: number;
}

// Response
interface EventResponse {
  id: number;
  camera_id: number;
  timestamp: string;            // ISO 8601
  clip_url: string | null;      // S3 영상 URL
  track_id: number | null;
  confidence: number | null;    // 0.0 ~ 1.0
  status: "pending" | "confirmed" | "false_alarm";
  description?: string;         // AI 감지 설명 — 백엔드 포함 여부 미확정
  appearance_tags?: string[];   // 인상착의 태그 — 백엔드 포함 여부 미확정
  event_type?: string;          // 감지 유형 — 백엔드 포함 여부 미확정
  assigned_to?: string;         // 담당자 — 백엔드 포함 여부 미확정
}
```

> **미확정 필드**: `description`, `appearance_tags`, `event_type`, `assigned_to` 는 실제 응답 포함 여부 백엔드 확인 필요. 현재 프론트는 optional로 선언 후 없으면 fallback 처리.

### GET /api/events/stats

```ts
// Response
interface EventStats {
  today_total: number;
  pending: number;
  confirmed: number;
  false_alarm: number;
}
```

### GET /api/events/stats/by-camera

```ts
// Response
interface CameraEventStats {
  camera_id: number;
  station_name: string;
  location: string;
  count: number;
}
[];
```

### POST /api/events/{event_id}/false-alarm

```ts
// Request
{ reason: string; memo?: string }

// 사전 정의 reason 값 (FalseAlarmModal 기준)
// "기기 오작동" | "노인 무임혜택 미인식" | "장애인 혜택 미인식" | "기타"
```

> **미확정**: `reason`, `memo` 필드명 백엔드 확정 필요.

### PATCH /api/events/{event_id}/status

```ts
// Request
{
  status: "confirmed" | "false_alarm";
}
```

---

## notifications

| Method | Endpoint                       | 프론트 연동                   | 파일                       | 비고           |
| ------ | ------------------------------ | ----------------------------- | -------------------------- | -------------- |
| GET    | `/api/notifications/`          | ✅ `getNotifications()`       | `src/api/notifications.ts` | 인증 불필요    |
| PATCH  | `/api/notifications/{id}/read` | ✅ `markNotificationRead(id)` | `src/api/notifications.ts` |                |
| POST   | `/api/notifications/read-all`  | ❌ 미사용                     | —                          | 전체 읽음 처리 |

### GET /api/notifications/

```ts
// Query Params
{ unread_only?: boolean }

// Response
interface NotificationResponse {
  id: number;
  event_id: number;
  sent_at: string;          // ISO 8601
  read_at: string | null;   // null = 미읽음
  event?: EventResponse;    // 백엔드 embed 여부 미확정
}[]
```

---

## 통계 화면 구현 가능성

| 섹션                                    | 가능 여부 | 방법                                            | 비고                                                    |
| --------------------------------------- | --------- | ----------------------------------------------- | ------------------------------------------------------- |
| 총 발생 / 미확인 / 처리완료 / 오탐 카드 | ✅        | `GET /api/events/stats`                         |                                                         |
| 오탐율 계산                             | ✅        | `false_alarm / today_total` 프론트 계산         |                                                         |
| 역별 / 게이트별 발생 순위               | ✅        | `GET /api/events/stats/by-camera`               |                                                         |
| 시간대별 발생 분포                      | ✅ 조건부 | `GET /api/events/` 대량 fetch 후 timestamp 집계 | 데이터 증가 시 성능 고려 필요                           |
| 일별 발생 추이                          | ✅ 조건부 | `GET /api/events/` 날짜별 집계                  | 동일                                                    |
| 감지 유형 비율 (파이 차트)              | ⚠️ 미확정 | `event_type` 필드 집계                          | 백엔드 `event_type` 응답 포함 여부 확인 필요            |
| 오탐신고 사유별 현황                    | ⚠️ 미확정 | false_alarm 이벤트의 `reason` 집계              | `EventResponse`에 `reason` 필드 없음 — 백엔드 추가 필요 |
| 전일 / 전월 비교 수치                   | ❌        | —                                               | 기간 비교 파라미터 또는 별도 API 필요                   |
| 평균 처리 시간                          | ❌        | —                                               | `resolved_at` 필드 없음 — 백엔드 추가 필요              |

---

## 미사용 API 활용 방안

| Endpoint                           | 활용 가능 위치                           |
| ---------------------------------- | ---------------------------------------- |
| `POST /api/auth/register`          | 관리자 계정 생성 기능 (SettingsPage)     |
| `POST /api/auth/find-pw`           | 로그인 페이지 "비밀번호 찾기" 링크       |
| `POST /api/cameras/`               | SettingsPage 카메라 등록 폼              |
| `PATCH /api/cameras/{id}/toggle`   | SettingsPage 카메라 활성화/비활성화 토글 |
| `POST /api/notifications/read-all` | Header 알림 패널 "전체 읽음" 버튼        |
