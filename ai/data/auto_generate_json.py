"""
영상에서 YOLO11n + ByteTrack으로 사람 bbox를 자동 생성하고
GateGuard 프로젝트 JSON 어노테이션 포맷으로 저장합니다.

JSON이 없는 영상에만 사용. 기존 JSON이 있으면 건드리지 않습니다.

사용법:
  # 단일 영상
  python ai/data/auto_generate_json.py --video path/to/video.mp4

  # 디렉토리 일괄 처리 (JSON 없는 영상만 처리)
  python ai/data/auto_generate_json.py --video-dir path/to/videos/

  # 프레임 샘플링 간격 조정 (기본 30 = 1초마다, 30fps 기준)
  python ai/data/auto_generate_json.py --video video.mp4 --frame-interval 15

  # child 분류 임계값 조정 (bbox 높이 / 영상 높이 비율)
  python ai/data/auto_generate_json.py --video video.mp4 --child-ratio 0.35

출력:
  video.mp4 → video.json (같은 디렉토리)
"""

import argparse
import json
import os
import sys
from pathlib import Path

import cv2
import supervision as sv
from ultralytics import YOLO

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from ai.tracker import PersonTracker

# YOLO 모델 경로 (프로젝트 루트 기준)
_MODEL_PATH = os.path.join(_project_root, "yolo11n.pt")

# 최소 confidence
_CONFIDENCE = 0.45

# bbox 높이가 프레임 높이의 이 비율 미만이면 child로 분류
_DEFAULT_CHILD_RATIO = 0.40


def _classify_category(bbox_h: int, frame_h: int, child_ratio: float) -> str:
    """bbox 높이 비율로 person / child 구분."""
    return "child" if (bbox_h / frame_h) < child_ratio else "person"


def generate_json(
    video_path: str,
    output_json: str | None = None,
    frame_interval: int = 30,
    child_ratio: float = _DEFAULT_CHILD_RATIO,
    confidence: float = _CONFIDENCE,
    overwrite: bool = False,
    verbose: bool = True,
) -> str:
    """
    video_path    : MP4 또는 AVI 영상 경로
    output_json   : 출력 JSON 경로 (None이면 영상과 같은 위치에 .json으로 저장)
    frame_interval: N 프레임마다 1개 샘플링 (기본 30 ≈ 1초/30fps)
    child_ratio   : bbox 높이 / 프레임 높이 < 이 값이면 child 분류
    confidence    : YOLO 최소 신뢰도
    overwrite     : True면 기존 JSON 덮어씀
    verbose       : 진행 로그 출력

    반환: 저장된 JSON 파일 경로
    """
    video_path = Path(video_path).resolve()
    if not video_path.is_file():
        raise FileNotFoundError(f"영상 파일 없음: {video_path}")

    if output_json is None:
        output_json = video_path.with_suffix(".json")
    else:
        output_json = Path(output_json)

    if output_json.exists() and not overwrite:
        if verbose:
            print(f"[SKIP] JSON 이미 존재: {output_json}")
        return str(output_json)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"영상을 열 수 없음: {video_path}")

    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0.0

    if verbose:
        print(f"[INFO] 영상: {video_path.name}")
        print(f"[INFO] 해상도: {frame_w}x{frame_h}  fps={fps:.1f}  총프레임={total_frames}")
        print(f"[INFO] 모델: {_MODEL_PATH}")
        print(f"[INFO] 샘플링: 매 {frame_interval}프레임  child_ratio={child_ratio}")

    model = YOLO(_MODEL_PATH)
    tracker = PersonTracker()

    # video_id: 숫자면 정수, 아니면 줄기 이름 그대로
    stem = video_path.stem
    video_id: int | str = int(stem) if stem.isdigit() else stem

    frames_data = []
    frame_no = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_no % frame_interval == 0:
            results = model(frame, verbose=False)
            detections = sv.Detections.from_ultralytics(results[0])

            # person 클래스(0)만, confidence 필터
            detections = detections[
                (detections.class_id == 0) & (detections.confidence >= confidence)
            ]
            detections = tracker.update(detections)

            annotations = []
            if detections.tracker_id is not None:
                for i, tid in enumerate(detections.tracker_id):
                    xyxy = detections.xyxy[i]
                    x1, y1, x2, y2 = int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])
                    bx = max(0, x1)
                    by = max(0, y1)
                    bw = min(x2 - x1, frame_w - bx)
                    bh = min(y2 - y1, frame_h - by)

                    if bw <= 0 or bh <= 0:
                        continue

                    category = _classify_category(bh, frame_h, child_ratio)
                    annotations.append({
                        "label": {"x": bx, "y": by, "width": bw, "height": bh},
                        "category": {
                            "code": category,
                            "attributes": [
                                {"code": "global_id", "value": str(tid)}
                            ],
                        },
                    })

            if annotations:  # 탐지된 사람이 없는 프레임은 포함하지 않음
                frames_data.append({
                    "number": frame_no,
                    "image": f"frame_{frame_no}.jpg",
                    "annotations": annotations,
                })

        frame_no += 1

    cap.release()

    output = {
        "id": video_id,
        "file": video_path.name,
        "metadata": {
            "width": frame_w,
            "height": frame_h,
            "duration": round(duration, 2),
            "fps": round(fps, 2),
            "frames": total_frames,
            "created": "auto-generated",
        },
        "frames": frames_data,
    }

    output_json.parent.mkdir(parents=True, exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    if verbose:
        person_count = sum(
            1 for fr in frames_data for a in fr["annotations"]
            if a["category"]["code"] == "person"
        )
        child_count = sum(
            1 for fr in frames_data for a in fr["annotations"]
            if a["category"]["code"] == "child"
        )
        print(
            f"[DONE] {len(frames_data)}개 프레임 저장 "
            f"(person={person_count}, child={child_count}) → {output_json}"
        )

    return str(output_json)


def process_directory(
    video_dir: str,
    frame_interval: int = 30,
    child_ratio: float = _DEFAULT_CHILD_RATIO,
    confidence: float = _CONFIDENCE,
    overwrite: bool = False,
) -> list[str]:
    """
    디렉토리 내 모든 영상 파일을 일괄 처리.
    기존 JSON이 있는 영상은 건너뜁니다.
    """
    video_dir = Path(video_dir)
    extensions = {".mp4", ".avi", ".mov", ".mkv"}
    video_files = sorted(
        p for p in video_dir.rglob("*") if p.suffix.lower() in extensions
    )

    if not video_files:
        print(f"[WARN] 영상 파일 없음: {video_dir}")
        return []

    print(f"[INFO] 영상 {len(video_files)}개 발견")
    generated = []

    for video_path in video_files:
        expected_json = video_path.with_suffix(".json")
        if expected_json.exists() and not overwrite:
            print(f"[SKIP] JSON 있음: {expected_json.name}")
            continue

        try:
            out = generate_json(
                str(video_path),
                frame_interval=frame_interval,
                child_ratio=child_ratio,
                confidence=confidence,
                overwrite=overwrite,
            )
            generated.append(out)
        except Exception as e:
            print(f"[ERROR] {video_path.name}: {e}")

    print(f"\n[DONE] 총 {len(generated)}개 JSON 생성 완료")
    return generated


def main():
    p = argparse.ArgumentParser(
        description="영상 → GateGuard JSON 어노테이션 자동 생성"
    )
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--video", help="단일 영상 파일 경로")
    group.add_argument("--video-dir", dest="video_dir", help="영상 디렉토리 (일괄 처리)")

    p.add_argument("--output", help="출력 JSON 경로 (--video 모드 전용)")
    p.add_argument(
        "--frame-interval", type=int, default=30, dest="frame_interval",
        help="N 프레임마다 1개 샘플링 (기본 30 = 30fps 기준 1초)",
    )
    p.add_argument(
        "--child-ratio", type=float, default=_DEFAULT_CHILD_RATIO, dest="child_ratio",
        help="bbox높이/프레임높이 < 이 값이면 child 분류 (기본 0.40)",
    )
    p.add_argument(
        "--confidence", type=float, default=_CONFIDENCE,
        help=f"YOLO 최소 신뢰도 (기본 {_CONFIDENCE})",
    )
    p.add_argument(
        "--overwrite", action="store_true",
        help="기존 JSON이 있어도 덮어씀",
    )
    args = p.parse_args()

    if args.video:
        generate_json(
            video_path=args.video,
            output_json=args.output,
            frame_interval=args.frame_interval,
            child_ratio=args.child_ratio,
            confidence=args.confidence,
            overwrite=args.overwrite,
        )
    else:
        process_directory(
            video_dir=args.video_dir,
            frame_interval=args.frame_interval,
            child_ratio=args.child_ratio,
            confidence=args.confidence,
            overwrite=args.overwrite,
        )


if __name__ == "__main__":
    main()
