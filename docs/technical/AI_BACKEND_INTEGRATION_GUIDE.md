# 🛰️ GateGuard — AI-Backend API Integration Guide (v1.0)

> **전술적 목적**: AI 추론 모델(`inference.py`)에서 감지된 무임승차 이벤트를 백엔드 서버로 전송하기 위한 '공식 통신 규격'입니다. M2 "Blitz Integration"의 핵심 가이드라인으로 활용합니다.

---

## 🚀 1. 핵심 엔드포인트: 이벤트 생성 (Create Event)

AI 모델은 사람 감지 및 무임승차 판단 시 즉시 아래 API를 호출하여 이벤트를 기록합니다.

- **URL**: `http://<BACKEND_HOST>:8000/api/events/`
- **Method**: `POST`
- **Authentication**: Bearer Token (수근 팀장에게 발급 문의)

### 💠 Request Payload (JSON)

AI 파이프라인에서 다음의 규격에 맞춰 JSON 데이터를 전송합니다.

```json
{
  "camera_id": 1,
  "clip_url": "https://gateguard-s3.bucket/events/clip_20260331_1020.mp4",
  "track_id": 42,
  "confidence": 0.985
}
```

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :---: | :--- |
| **camera_id** | `int` | **필수** | 감지된 지하철역 개찰구 카메라의 고유 ID |
| **clip_url** | `str` | 선택 | S3에 업로드된 증빙 영상 클립의 URL |
| **track_id** | `int` | 선택 | ByteTrack에 의해 부여된 객체의 고유 추적 ID |
| **confidence** | `float` | 선택 | AI 추론 모델의 감지 신뢰도 (0.0 ~ 1.0) |

---

## 🛡️ 2. 실시간 알림 메커니즘 (WebSocket Flow)

AI가 위 API를 호출하는 즉시, 백엔드 서버는 다음 프로세스를 자동으로 수행합니다.

1. **DB 기록**: `events` 테이블에 데이터 즉시 영속화 (TimescaleDB 최적화)
2. **WebSocket Broadcast**: `/ws/notifications` 채널에 접속 중인 모든 관리자(대시보드)에게 실시간 알림 패킷 전송
3. **Push Notification**: (M2 후반부) 역무원 모바일 앱으로 푸시 알림 트리거

### 📡 대시보드 수신 알림 포맷 (Ref)
```json
{
  "type": "NEW_EVENT_DETECTED",
  "data": {
    "id": 105,
    "camera_id": 1,
    "timestamp": "2026-03-31T10:20:45Z",
    "status": "pending"
  }
}
```

---

## 🛠️ 3. 연동 시 주의 사항 (Best Practices)

1. **S3 선-업로드**: 영상 클립을 먼저 S3에 업로드한 뒤, 발급된 URL을 포함하여 API를 호출하는 것이 권장됩니다.
2. **비식별화 처리**: 전송되는 영상 클립은 반드시 `OpenCV` 등을 통해 얼굴 블러링 처리가 완료된 상태여야 합니다.
3. **에러 핸들링**: 네트워크 순간 단절 시 재시도(Retry) 로직을 `inference.py`에 포함하여 데이터 유실을 방지합니다.

---

## 🏁 최종 업데이트 일시: 2026-03-31 10:25 (v1.0)
