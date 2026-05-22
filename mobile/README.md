# GateGuard Mobile

역무원용 무임승차 알림 앱 — Expo (React Native) 기반.  
백엔드에서 감지된 이벤트를 WebSocket으로 실시간 수신하고, 포그라운드/백그라운드 상황에 맞게 알림을 전달합니다.

---

## 빠른 시작

### 1. 의존성 설치

```bash
cd mobile
npm install
```

### 2. `.env` 파일 생성

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://<서버 IP>:8000
```

서버 IP 확인 (서버 컴퓨터에서 실행):

```powershell
# Windows
ipconfig
# 무선 LAN 어댑터 Wi-Fi → IPv4 주소 확인 (예: 172.30.1.78)

# Mac / Linux
ifconfig | grep inet
```

> **주의:** `mobile/.env`는 깃에 올리지 마세요. IP는 환경마다 다릅니다.  
> Android 에뮬레이터는 `10.0.2.2`, iOS 시뮬레이터는 `localhost` 사용 가능합니다.

### 3. 백엔드 먼저 실행

```bash
# 프로젝트 루트에서
docker-compose up -d
```

### 4. Expo 실행

```bash
npx expo start --clear
```

Expo Go 앱으로 QR 코드를 스캔하세요.

### 로그인 계정

| 사원번호 | 비밀번호 | 역할 |
|---|---|---|
| 2026001 | admin1234 | 관리자 |
| 2026002 | station1234 | 역무원 |

---

## 화면 구성

| 경로 | 설명 |
|------|------|
| `/(auth)/login` | 사원번호 + 비밀번호 로그인 |
| `/(main)/` | 대시보드 — 통계 카드 / 최신 알림 목록 |
| `/(main)/settings` | 설정 — 로그아웃 / 개발자 테스트(개발 빌드 전용) |

---

## 주요 기능

### 실시간 이벤트 수신
WebSocket(`/ws/events`)으로 `NEW_EVENT` 메시지를 수신합니다.

- **앱 포그라운드** → 화면 중앙에 인앱 팝업(`EventAlertPopup`) 표시, 5초 후 자동 닫힘
- **앱 백그라운드** → 시스템 로컬 알림 발송, 탭하면 해당 이벤트 상세 화면으로 딥링크

### 딥링크
시스템 알림을 탭하면 앱이 켜지면서 해당 이벤트의 상세 모달이 자동으로 열립니다.  
구현 위치: `app/_layout.tsx` → `app/(main)/index.tsx`

### 이벤트 처리
- **처리완료** — `PATCH /api/events/{id}/status`
- **오탐신고** — `POST /api/events/{id}/false-alarm` (사유 선택 + 직접 입력)

### 인증
JWT를 `AsyncStorage`에 저장하고, 앱 시작 시 자동 복원합니다.  
401 응답 시 토큰을 삭제하고 로그인 화면으로 이동합니다.

---

## 디렉토리 구조

```
mobile/
├── app/
│   ├── _layout.tsx          # 루트 레이아웃 — 폰트, 알림 권한, 딥링크 리스너
│   ├── index.tsx            # 진입점 — 인증 여부에 따라 메인/로그인 분기
│   ├── (auth)/
│   │   └── login.tsx        # 로그인 화면
│   └── (main)/
│       ├── _layout.tsx      # 탭 네비게이터 (대시보드 / 설정)
│       ├── index.tsx        # 대시보드 메인 화면
│       └── settings.tsx     # 설정 화면
│
├── components/
│   ├── events/
│   │   ├── AlertRow.tsx         # 알림 목록 한 줄 컴포넌트
│   │   ├── EventDetailModal.tsx # 이벤트 상세 바텀 시트
│   │   └── FalseAlarmModal.tsx  # 오탐신고 바텀 시트
│   └── ui/
│       ├── AppLoadingScreen.tsx # 폰트 로드 전 스플래시 화면
│       ├── Badge.tsx            # 상태/위험도 배지
│       ├── EventAlertPopup.tsx  # 포그라운드 인앱 팝업
│       ├── SectionHeader.tsx    # 섹션 제목 + 배지
│       └── StatCard.tsx         # 통계 카드 (2열 그리드)
│
├── hooks/
│   ├── useDashboard.ts      # 3개 API 병렬 호출 + 카메라 조인 + 낙관적 업데이트
│   ├── useNotifications.ts  # 로컬 알림 권한 요청 / 발송
│   └── useWebSocket.ts      # WebSocket 연결 + 자동 재연결 (3초)
│
├── services/
│   ├── api.ts               # Axios 인스턴스 — JWT 인터셉터
│   ├── authService.ts       # 로그인 / 로그아웃 / 토큰 복원
│   ├── cameraService.ts     # 카메라 목록 조회
│   └── eventService.ts      # 이벤트 CRUD + 통계
│
├── store/
│   └── AuthContext.tsx      # 인증 전역 상태 (Context + Provider)
│
├── constants/
│   ├── colors.ts            # 색상 팔레트 + 그림자 프리셋
│   └── config.ts            # API URL / WS URL / 토큰 키
│
├── types/
│   └── index.ts             # 공유 타입 (웹 프론트와 동일)
│
└── utils/
    ├── eventHelpers.ts      # 상태 색상/라벨, 위험도 배지, 위치 텍스트
    └── format.ts            # 시각 포맷 함수
```

---

## API 연동 요약

| 서비스 | 엔드포인트 |
|--------|-----------|
| 로그인 | `POST /api/auth/login` |
| 카메라 목록 | `GET /api/cameras/` |
| 이벤트 목록 | `GET /api/events/` |
| 이벤트 단건 | `GET /api/events/{id}` |
| 이벤트 통계 | `GET /api/events/stats` |
| 처리완료 | `PATCH /api/events/{id}/status` |
| 오탐신고 | `POST /api/events/{id}/false-alarm` |
| WebSocket | `WS /ws/events` |

---

## 참고

- Expo Go SDK 53+에서는 원격 푸시(`getExpoPushTokenAsync`)가 제거됐습니다. 현재는 로컬 알림만 사용하며 Expo Go에서 정상 동작합니다. 원격 푸시가 필요하면 EAS 개발 빌드로 전환하세요.
- `__DEV__` 플래그로 감싼 개발자 테스트 UI는 `npx expo start`(개발 빌드)에서만 보이고, EAS 프로덕션 빌드에서는 자동으로 제거됩니다.
- 웹 프론트(`frontend/`)와 타입 정의(`types/index.ts`)를 공유합니다. 타입 변경 시 양쪽을 함께 수정하세요.
