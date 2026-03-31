import asyncio
import os
import datetime
import httpx
import numpy as np
import cv2
import supervision as sv
from ultralytics import YOLO
from jose import jwt
from dotenv import load_dotenv
from dataclasses import dataclass, field
from collections import deque
import threading

# 🛡️ 수근 팀장님의 보안 지침 준수 (.env 로드)
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

SECRET_KEY = os.getenv("SECRET_KEY", "gateguard-secret-key-dev")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

from ai.anonymizer import FaceAnonymizer
from ai.tracker import PersonTracker

def generate_master_token():
    """AI 엔진이 백엔드에 입성하기 위한 실시간 인장(JWT) 주조"""
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=1)
    to_encode = {"sub": "1", "email": "admin@gateguard.com", "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@dataclass
class GateConfig:
    line_start: tuple[int, int] = (0, 360)
    line_end: tuple[int, int] = (640, 360)
    camera_id: int = 1
    confidence_threshold: float = 0.5
    fps: int = 30
    buffer_seconds: int = 10  # 트리거 시점 전후 저장 시간

class FarewellEvasionDetector:
    def __init__(self, config: GateConfig):
        self.config = config
        self.model = YOLO("yolo11n.pt")
        self.anonymizer = FaceAnonymizer()
        self.tracker = PersonTracker()
        self._triggered_ids = set()
        
        # 🎞️ [M2] 영상 절삭용 프레임 버퍼 (전후 10초 대응)
        self.frame_buffer = deque(maxlen=config.fps * config.buffer_seconds)
        self.line_zone = sv.LineZone(
            start=sv.Point(*self.config.line_start),
            end=sv.Point(*self.config.line_end),
        )
        self.line_annotator = sv.LineZoneAnnotator()
        self.line_annotator = sv.LineZoneAnnotator()

    def _save_clip(self, event_frames, event_id_str):
        """별도 스레드에서 무임승차 증거 영상을 절삭하여 저장합니다."""
        os.makedirs("temp_clips", exist_ok=True)
        filename = f"temp_clips/event_{event_id_str}.mp4"
        
        height, width, _ = event_frames[0].shape
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(filename, fourcc, self.config.fps, (width, height))
        
        for frame in event_frames:
            out.write(frame)
        out.release()
        return os.path.abspath(filename)

    async def _report_event(self, track_id: int, confidence: float, clip_frames: list):
        """[M2] 감지 결과 보고 및 로컬 클립 생성 하달"""
        token = generate_master_token()
        
        # 1. 일단 사건 발생 동시 보고
        local_clip_path = self._save_clip(clip_frames, f"{track_id}_{int(datetime.datetime.now().timestamp())}")
        
        payload = {
            "camera_id": self.config.camera_id,
            "track_id": track_id,
            "confidence": round(float(confidence), 3),
            "clip_url": local_clip_path
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient() as client:
            try:
                url = f"{BACKEND_URL}/api/events/"
                await client.post(url, json=payload, headers=headers, timeout=10)
                print(f"🚀 [M2 SUCCESS] Event Reported: Track #{track_id}")
            except Exception as e:
                print(f"⚠️ [M2 ERROR] Report Failed: {str(e)}")

    def process_frame(self, frame: np.ndarray):
        # 1초 만에 현재 프레임을 비식별화 후 버퍼에 저장
        clean_frame = self.anonymizer.blur(frame.copy())
        self.frame_buffer.append(clean_frame)
        
        results = self.model(clean_frame, verbose=False)
        detections = sv.Detections.from_ultralytics(results[0])
        # 사람만 필터링
        detections = detections[(detections.class_id == 0) & (detections.confidence >= self.config.threshold if hasattr(self.config, 'threshold') else 0.5)]
        detections = self.tracker.update(detections)

        # 트리거 확인
        crossed_in, crossed_out = self.line_zone.trigger(detections)
        
        for i, (in_, out_) in enumerate(zip(crossed_in, crossed_out)):
            if (in_ or out_):
                tid = detections.tracker_id[i] if detections.tracker_id is not None else -1
                if tid not in self._triggered_ids:
                    self._triggered_ids.add(tid)
                    conf = float(detections.confidence[i]) if detections.confidence is not None else 0.0
                    
                    event_clip_snapshot = list(self.frame_buffer)
                    # ✅ [M2 Perfect] 비동기 태스크 생성
                    asyncio.create_task(self._report_event(tid, conf, event_clip_snapshot))

        annotated = self.tracker.annotate(clean_frame, detections)
        annotated = self.line_annotator.annotate(annotated, self.line_zone)
        return annotated

    async def run(self, source: int | str = 0):
        cap = cv2.VideoCapture(source)
        print(f"\n💎 [GATE GUARD] M2 AI INFERENCE LIVE ARMED")
        
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret: break
                annotated = self.process_frame(frame)
                cv2.imshow("GateGuard M2 — Real-time AI Observer", annotated)
                if cv2.waitKey(1) & 0xFF == ord("q"): break
                await asyncio.sleep(0.01) # 🛡️ 비동기 태스크에 양보 (Perfecting M2)
        finally:
            cap.release()
            cv2.destroyAllWindows()

if __name__ == "__main__":
    detector = FarewellEvasionDetector(config=GateConfig())
    asyncio.run(detector.run(source=0))
