# 🛰️ GateGuard — AI-Backend API Integration Guide (v2.1)

> **전술적 목적**: AI 추론 모델(`inference.py`)에서 감지된 무임승차 이벤트를 백엔드 서버로 전송하기 위한 '공식 통신 규격'입니다. 효정님의 최신 AI 파이프라인(v0.27.0)과 수근 팀장의 보안 지침이 통합된 v2.1 버전입니다.

---

## 🚀 1. 핵심 엔드포인트: 이벤트 생성 (Create Event)

AI 모델은 사람 감지 및 무임승차 판단 시 즉시 아래 API를 호출하여 이벤트를 기록합니다.

- **API 도메인**: `https://gateguardsystems.com`
- **Method**: `POST`
- **Authentication**: Bearer Token (수근 팀장에게 발급 문의)
- **감지 데이터 전송**: `POST /api/events/`

### 💠 Request Payload (JSON)

AI 파이프라인에서 다음의 규격에 맞춰 JSON 데이터를 전송합니다.

```json
{
  "camera_id": 1,
  "clip_url": "https://gateguard-clips.s3.ap-northeast-2.amazonaws.com/events/clip_20260331_1020.mp4",
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

## 📸 2. S3 영상 업로드 가이드 (Core S3 Client)

백엔드 코어에 공통 S3 클라이언트가 구현되어 있습니다. AI 연동 팀(효정)은 이를 활용하여 업로드를 수행할 수 있습니다.

- **파일 위치**: `backend/app/core/s3.py`
- **사용 방법**: `s3_client.upload_file(local_path, s3_name)` 호출 시 URL 즉시 반환

> [!TIP]
> **시뮬레이션 모드 지원**: `.env`에 AWS 키가 설정되지 않은 개발 환경에서는 자동으로 **Simulation Mode**가 활성화됩니다. 이 경우 가상의 S3 URL을 반환하므로 로직 테스트를 끊김 없이 진행할 수 있습니다.

---

## 🛡️ 3. 실시간 알림 메커니즘 (WebSocket Flow)

AI가 위 API를 호출하는 즉시, 백엔드 서버는 다음 프로세스를 자동으로 수행합니다.

1. **DB 기록**: `events` 테이블에 데이터 즉시 영속화 (TimescaleDB 최적화)
2. **WebSocket Broadcast**: 대시보드 관리자에게 `/ws/notifications` 채널로 실시간 알림 패킷 전송
3. **Push Notification**: 역무원 모바일 앱으로 푸시 알림 트리거 (준비 중)

---

## 🛠️ 4. AI 파이프라인 구동 사양 (AI Specs)

효율적인 협업을 위해 다음 기술 사양을 반드시 준수합니다.

1. **의존성 설치**: 반드시 `pip install -r ai/requirements.txt` 명령어로 전용 패키지를 설치합니다.
2. **추적 엔진**: `supervision` v0.27.0 이상을 사용하며, 메서드 명은 `sv.ByteTrack()`을 사용합니다.
3. **비식별화 모델**: 얼굴 탐지를 위해 `ai/yolov11n-face.pt` 경로의 모델을 로드합니다 (미존재 시 `inference.py`가 경고를 띄웁니다).
4. **보안 인증**: 백엔드 API 호출 시 `inference.py` 내의 `generate_master_token()`을 통해 실시간 JWT를 주조하여 헤더에 포함합니다.

---

## 🏁 최종 업데이트 일시: 2026-04-01 15:45 (KST, v2.1)
