"""
GateGuard 메인 추론 파이프라인

흐름:
  영상 입력 → 비식별화 → YOLOv11 감지 → ByteTrack 추적
  → Line Crossing 판정 → 무임승차 이벤트 발생 → 백엔드 API 전송
"""
import asyncio
from dataclasses import dataclass, field

import cv2
import httpx
import numpy as np
import supervision as sv
from ultralytics import YOLO

from ai.anonymizer import FaceAnonymizer
from ai.tracker import PersonTracker


@dataclass
class GateConfig:
    """개찰구 라인 설정"""
    # 감지 경계선 (픽셀 좌표): 게이트를 가로지르는 선
    line_start: tuple[int, int] = (0, 360)
    line_end: tuple[int, int] = (640, 360)
    backend_url: str = "http://localhost:8000"
    camera_id: int = 1
    confidence_threshold: float = 0.5


@dataclass
class FareEvasionDetector:
    config: GateConfig
    _triggered_ids: set[int] = field(default_factory=set)

    def __post_init__(self):
        self.model = YOLO("yolo11n.pt")
        self.anonymizer = FaceAnonymizer()
        self.tracker = PersonTracker()
        self.line_zone = sv.LineZone(
            start=sv.Point(*self.config.line_start),
            end=sv.Point(*self.config.line_end),
        )
        self.line_annotator = sv.LineZoneAnnotator()

    def _to_detections(self, results) -> sv.Detections:
        detections = sv.Detections.from_ultralytics(results[0])
        # 사람(class 0)만 필터링
        mask = (detections.class_id == 0) & (detections.confidence >= self.config.confidence_threshold)
        return detections[mask]

    async def _report_event(self, track_id: int, confidence: float):
        payload = {
            "camera_id": self.config.camera_id,
            "track_id": track_id,
            "confidence": round(float(confidence), 4),
        }
        async with httpx.AsyncClient() as client:
            try:
                await client.post(f"{self.config.backend_url}/api/events", json=payload, timeout=5)
            except httpx.RequestError as e:
                print(f"[WARNING] 이벤트 전송 실패: {e}")

    def process_frame(self, frame: np.ndarray) -> tuple[np.ndarray, list[int]]:
        """
        단일 프레임 처리.
        반환: (annotated_frame, 이번 프레임에서 새로 감지된 무임승차 track_id 목록)
        """
        frame = self.anonymizer.blur(frame)
        results = self.model(frame, verbose=False)
        detections = self._to_detections(results)
        detections = self.tracker.update(detections)

        crossed_in, crossed_out = self.line_zone.trigger(detections)
        new_events: list[int] = []

        for i, (in_, out_) in enumerate(zip(crossed_in, crossed_out)):
            if not (in_ or out_):
                continue
            tid = detections.tracker_id[i] if detections.tracker_id is not None else -1
            if tid in self._triggered_ids:
                continue
            self._triggered_ids.add(tid)
            new_events.append(tid)
            conf = float(detections.confidence[i]) if detections.confidence is not None else 0.0
            asyncio.create_task(self._report_event(tid, conf))

        annotated = self.tracker.annotate(frame, detections)
        annotated = self.line_annotator.annotate(annotated, self.line_zone)
        return annotated, new_events

    def run(self, source: int | str = 0):
        """실시간 스트림 실행 (source: 카메라 인덱스 또는 RTSP URL)"""
        cap = cv2.VideoCapture(source)  # Mac/Linux 기본. Windows에서 카메라 안 뜨면 아래 줄로 교체
        # cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)  # Windows 전용
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        print(f"[GateGuard] 추론 시작 — 카메라 ID: {self.config.camera_id}")
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                annotated, events = self.process_frame(frame)
                if events:
                    print(f"[ALERT] 무임승차 감지 — track_ids: {events}")
                cv2.imshow("GateGuard", annotated)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
        finally:
            cap.release()
            cv2.destroyAllWindows()
            loop.close()


if __name__ == "__main__":
    detector = FareEvasionDetector(config=GateConfig())
    detector.run(source=0)
