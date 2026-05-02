"""
auto_bbox_labeler.py
bbox 후보를 생성한다.

우선순위:
  1. JSON 어노테이션이 있으면 JSON에서 추출 (좌표: 원본 해상도)
  2. JSON이 없으면 YOLO 모델로 검출 (좌표: 원본 해상도로 스케일 변환 후 저장)

출력: List[dict] — review_candidates.csv의 행 단위 후보 리스트
학습 실행은 하지 않는다.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Optional

import cv2

from auto_labeling.auto_label_config import AutoLabelConfig


# ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

def _make_candidate(
    *,
    video_name: str,
    frame: int,
    timestamp: float,
    bbox: list[int],        # [x1, y1, x2, y2] 원본 좌표
    label_candidate: str,
    confidence: float,
    global_id: Optional[str],
    track_id: Optional[int],
    coordinate_type: str,
    source: str,
) -> dict:
    return {
        "candidate_id": str(uuid.uuid4())[:12],
        "video_name": video_name,
        "frame": frame,
        "timestamp": round(timestamp, 3),
        "start_frame": None,
        "end_frame": None,
        "bbox": bbox,
        "label_candidate": label_candidate,
        "event_candidate": None,
        "confidence": round(confidence, 4),
        "global_id": global_id,
        "track_id": track_id,
        "coordinate_type": coordinate_type,
        "source": source,
        "score": round(confidence, 4),
        "image_path": None,
        "clip_path": None,
        "review": "",
        "memo": "",
    }


def _get_global_id(annotation: dict) -> Optional[str]:
    for attr in annotation.get("category", {}).get("attributes", []):
        if attr.get("code") == "global_id":
            return str(attr["value"])
    return None


# ── 공개 API ──────────────────────────────────────────────────────────────────

def bbox_from_json(
    json_path: Path,
    video_path: Path,
    config: AutoLabelConfig,
) -> list[dict]:
    """
    JSON 어노테이션에서 bbox 후보를 생성한다.

    JSON 구조:
      metadata.width/height  → 원본 해상도
      frames[].number        → 프레임 번호
      annotations[].label    → {x, y, width, height} (절대 픽셀)
      annotations[].category.code → person | child
      annotations[].category.attributes[{code:global_id, value:...}]
    """
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    meta = data.get("metadata", {})
    fps = float(meta.get("fps", 30) or 30)
    src_w = int(meta.get("width", config.original_width))
    src_h = int(meta.get("height", config.original_height))
    coord_type = f"original_{src_w}x{src_h}"

    candidates: list[dict] = []

    for frame_info in data.get("frames", []):
        frame_no = int(frame_info["number"])
        timestamp = frame_no / fps

        for ann in frame_info.get("annotations", []):
            lbl = ann.get("label", {})
            x = int(lbl.get("x", 0))
            y = int(lbl.get("y", 0))
            w = int(lbl.get("width", 0))
            h = int(lbl.get("height", 0))
            if w <= 0 or h <= 0:
                continue

            x1, y1, x2, y2 = x, y, x + w, y + h
            # 경계 클램핑
            x1 = max(0, min(x1, src_w))
            y1 = max(0, min(y1, src_h))
            x2 = max(0, min(x2, src_w))
            y2 = max(0, min(y2, src_h))

            label_candidate = ann.get("category", {}).get("code", "person")
            global_id = _get_global_id(ann)

            candidates.append(_make_candidate(
                video_name=video_path.name,
                frame=frame_no,
                timestamp=timestamp,
                bbox=[x1, y1, x2, y2],
                label_candidate=label_candidate,
                confidence=1.0,
                global_id=global_id,
                track_id=None,
                coordinate_type=coord_type,
                source="json",
            ))

    return candidates


def bbox_from_yolo(
    video_path: Path,
    config: AutoLabelConfig,
    frame_step: Optional[int] = None,
) -> list[dict]:
    """
    YOLO 모델로 bbox 후보를 생성한다.
    JSON 어노테이션이 없는 영상에 사용한다.
    검출 좌표는 원본 해상도 기준으로 변환해서 저장한다.
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        raise ImportError("pip install ultralytics  # YOLO 검출기 필요")

    step = frame_step if frame_step is not None else config.yolo_frame_step

    model = YOLO(config.yolo_model_path)
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"영상을 열 수 없습니다: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    coord_type = f"original_{orig_w}x{orig_h}"

    candidates: list[dict] = []
    frame_no = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_no % step == 0:
            results = model.track(
                frame,
                persist=True,
                verbose=False,
                conf=config.yolo_confidence,
                imgsz=config.yolo_input_size,
                classes=[0],  # person only
            )

            if results and results[0].boxes is not None:
                boxes = results[0].boxes
                # YOLO 입력 → 원본 해상도 스케일 비율
                infer_h, infer_w = results[0].orig_shape[:2]
                scale_x = orig_w / infer_w
                scale_y = orig_h / infer_h

                for box in boxes:
                    conf = float(box.conf[0])
                    tid = int(box.id[0]) if box.id is not None else None
                    x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]

                    # 원본 해상도로 변환
                    x1o = max(0, int(x1 * scale_x))
                    y1o = max(0, int(y1 * scale_y))
                    x2o = min(orig_w, int(x2 * scale_x))
                    y2o = min(orig_h, int(y2 * scale_y))

                    candidates.append(_make_candidate(
                        video_name=video_path.name,
                        frame=frame_no,
                        timestamp=round(frame_no / fps, 3),
                        bbox=[x1o, y1o, x2o, y2o],
                        label_candidate="person",
                        confidence=conf,
                        global_id=None,
                        track_id=tid,
                        coordinate_type=coord_type,
                        source="yolo",
                    ))

        frame_no += 1

    cap.release()
    return candidates


def generate_bbox_candidates(
    video_path: Path,
    config: AutoLabelConfig,
    json_path: Optional[Path] = None,
) -> list[dict]:
    """
    주 진입점. JSON이 있으면 JSON 우선, 없으면 YOLO로 후보를 생성한다.
    """
    if json_path is not None and json_path.exists():
        print(f"[bbox] JSON에서 후보 생성: {json_path.name}")
        return bbox_from_json(json_path, video_path, config)

    print(f"[bbox] YOLO로 후보 생성: {video_path.name}")
    return bbox_from_yolo(video_path, config)
