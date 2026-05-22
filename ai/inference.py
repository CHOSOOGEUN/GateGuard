"""
GateGuard AI 추론 엔트리포인트.
백엔드가 먼저 떠 있어야 동작합니다 (JWT 검증 대상).

실행:
    python -m ai.inference                       # 기본 카메라(0)
    python -m ai.inference --source /path/to.mp4 # 영상 파일
    python -m ai.inference --source 0 --show     # 화면 출력
"""
import argparse
import asyncio
import datetime
import os

import httpx
from dotenv import load_dotenv
from jose import jwt
from ultralytics import YOLO

from ai.detectors import EfficientNetVerifier, GateDetector, YOLODetector, make_blur_faces
from ai.pipeline import run_pipeline
from ai.types import EventCandidate, GateZoneConfig

# ── 환경변수 ─────────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

SECRET_KEY   = os.getenv("SECRET_KEY", "gateguard-secret-key-dev")
ALGORITHM    = os.getenv("ALGORITHM", "HS256")
BACKEND_URL  = os.getenv("BACKEND_URL", "http://localhost:8000")
CAMERA_ID    = int(os.getenv("CAMERA_ID", "1"))

# ── 로컬 모델/출력 경로 ────────────────────────────────────────────────────
_DIR          = os.path.dirname(__file__)
PERSON_MODEL  = os.path.join(_DIR, '../yolo11n.pt')
GATE_MODEL    = os.path.join(_DIR, 'gate_best.pt')
FACE_MODEL    = os.path.join(_DIR, 'yolov11n-face.pt')
EFF_CKPT      = os.getenv("EFF_CHECKPOINT", "")   # 없으면 2차 검증 비활성화
OUTPUT_DIR    = os.getenv("OUTPUT_DIR", "pipeline_output")

# ── 기본 설정 (카메라/해상도에 맞게 조정) ────────────────────────────────────
CONFIG_DICT = {
    'camera_id': f'cam{CAMERA_ID}',
    'frame_width': 640,
    'frame_height': 480,
    'gate_zone':  {'x1': 180, 'y1':  80, 'x2': 460, 'y2': 420},
    'pass_line':  {'x1': 180, 'y1': 280, 'x2': 460, 'y2': 280},
    'jump_zone':  {'x1': 160, 'y1':  40, 'x2': 480, 'y2': 180},
    'crawl_zone': {'x1': 160, 'y1': 340, 'x2': 480, 'y2': 430},
    'jump_min_frames':            3,
    'crawl_min_frames':          10,
    'crawl_aspect_ratio_thresh':  1.6,
    'tailgate_time_window_s':    3.0,
    'tailgate_distance_thresh':  150.0,
    'tailgating_min_frames':       5,
    'gate_overlap_thresh':         0.25,
    'tailgate_max_dist':           200,
}


def generate_master_token() -> str:
    """AI 엔진이 백엔드에 인증하기 위한 JWT 발급"""
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=1)
    to_encode = {"sub": "1", "email": "admin@gateguard.com", "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def report_event(candidate: EventCandidate):
    """감지된 이벤트를 백엔드에 POST"""
    token = generate_master_token()
    payload = {
        "camera_id": CAMERA_ID,
        "track_id": candidate.track_ids[0] if candidate.track_ids else -1,
        "confidence": round(float(candidate.confidence), 3),
        "clip_url": candidate.clip_path or "",
        "event_type": candidate.event_type,
    }
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        try:
            await client.post(f"{BACKEND_URL}/api/events/", json=payload,
                              headers=headers, timeout=10)
            print(f"  🚀 [REPORTED] {candidate.event_type} track={candidate.track_ids}")
        except Exception as e:
            print(f"  ⚠️ [REPORT FAILED] {e}")


def load_models():
    """YOLO + Face + Gate + EfficientNet 모델 로드"""
    print("[GateGuard] 모델 로딩 중...")
    person_model = YOLO(PERSON_MODEL)
    print(f"  Person YOLO: {PERSON_MODEL}")

    gate_model = None
    if os.path.exists(GATE_MODEL):
        gate_model = YOLO(GATE_MODEL)
        print(f"  Gate YOLO: {GATE_MODEL}")
    else:
        print(f"  [WARN] gate_best.pt 없음 → gate 위치 필터 비활성화")

    face_model = None
    if os.path.exists(FACE_MODEL):
        face_model = YOLO(FACE_MODEL)
        print(f"  Face YOLO: {FACE_MODEL}")
    else:
        try:
            from huggingface_hub import hf_hub_download
            face_pt = hf_hub_download(
                'arnabdhar/YOLOv8-Face-Detection', 'model.pt',
                local_dir=_DIR)
            face_model = YOLO(face_pt)
            print("  Face YOLO: HuggingFace에서 로드")
        except Exception as e:
            print(f"  [WARN] 얼굴 모델 로드 실패 → 블러 생략: {e}")

    verifier = EfficientNetVerifier(checkpoint_path=EFF_CKPT or None)

    return (
        YOLODetector(person_model, conf_threshold=0.4),
        GateDetector(gate_model, conf_thres=0.25),
        make_blur_faces(face_model),
        verifier,
    )


def main():
    parser = argparse.ArgumentParser(description='GateGuard AI Inference')
    parser.add_argument('--source', default='0',
                        help='카메라 인덱스(0) 또는 영상 파일 경로')
    parser.add_argument('--show', action='store_true',
                        help='화면 출력 (cv2.imshow)')
    parser.add_argument('--output-dir', default=OUTPUT_DIR)
    parser.add_argument('--no-report', action='store_true',
                        help='백엔드 보고 생략 (테스트용)')
    args = parser.parse_args()

    source = int(args.source) if args.source.isdigit() else args.source

    person_det, gate_det, blur_fn, verifier = load_models()
    cfg = GateZoneConfig.from_dict(CONFIG_DICT)

    # 이벤트 발생 시 백엔드 보고 (asyncio 루프 활용)
    loop = asyncio.new_event_loop()

    def on_event(c: EventCandidate):
        if not args.no_report:
            loop.run_until_complete(report_event(c))

    print(f"\n💎 [GATE GUARD] AI INFERENCE LIVE — source={source}")

    try:
        run_pipeline(
            video_path=source,
            cfg_base=cfg,
            output_dir=args.output_dir,
            person_detector=person_det,
            gate_detector=gate_det,
            blur_faces=blur_fn,
            verifier=verifier,
            on_event=on_event,
            show=args.show,
        )
    finally:
        loop.close()


if __name__ == '__main__':
    main()
