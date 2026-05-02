"""
export_review_assets.py
이벤트 후보마다 검수용 이미지와 클립을 저장하고 review_candidates.csv를 생성한다.

저장 구조:
  auto_labeling/
    candidates/
      images/jump/     ← bbox + 정보가 오버레이된 PNG
      images/crawling/
      images/tailgating/
      images/normal/
      clips/jump/      ← 이벤트 전후 N프레임 MP4
      clips/crawling/
      clips/tailgating/
    review_candidates.csv

학습 실행은 하지 않는다.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from auto_labeling.auto_label_config import AutoLabelConfig


# ── 이미지 오버레이 ───────────────────────────────────────────────────────────

_EVENT_COLORS = {
    "jump": (0, 255, 0),
    "crawling": (0, 165, 255),
    "tailgating": (0, 0, 255),
    "normal": (200, 200, 200),
}


def _draw_overlay(
    frame: np.ndarray,
    row: dict,
    config: AutoLabelConfig,
) -> np.ndarray:
    """
    검수용 이미지에 bbox와 메타 정보를 오버레이한다.
    """
    img = frame.copy()
    orig_h, orig_w = img.shape[:2]

    # 표시 해상도로 리사이즈 (원본이 display 크기보다 크면 축소)
    scale = min(
        config.image_max_width / orig_w,
        config.image_max_height / orig_h,
        1.0,
    )
    if scale < 1.0:
        disp_w = int(orig_w * scale)
        disp_h = int(orig_h * scale)
        img = cv2.resize(img, (disp_w, disp_h), interpolation=cv2.INTER_AREA)
    else:
        disp_w, disp_h = orig_w, orig_h
        scale = 1.0

    # bbox 그리기
    bbox = row.get("bbox")
    event_type = row.get("event_candidate", "normal") or "normal"
    color = _EVENT_COLORS.get(event_type, (255, 255, 255))

    if bbox and len(bbox) == 4:
        x1, y1, x2, y2 = [int(v * scale) for v in bbox]
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

    # 텍스트 정보 오버레이
    lines = [
        f"frame: {row.get('frame')}",
        f"event: {event_type}",
        f"label: {row.get('label_candidate')}",
        f"score: {row.get('score')}",
        f"gid: {row.get('global_id')}  tid: {row.get('track_id')}",
        f"video: {row.get('video_name')}",
        f"coord: {row.get('coordinate_type')}",
    ]
    if row.get("time_gap") is not None:
        lines.append(f"time_gap: {row.get('time_gap')}s  dist: {row.get('spatial_distance')}px")

    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.55
    thickness = 1
    line_h = 22
    pad = 8

    # 반투명 배경
    bg_h = line_h * len(lines) + pad * 2
    bg_w = 420
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (bg_w, bg_h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.55, img, 0.45, 0, img)

    for i, line in enumerate(lines):
        y_pos = pad + (i + 1) * line_h
        cv2.putText(img, line, (pad, y_pos), font, font_scale, (255, 255, 255), thickness)

    # 이벤트 타입 레이블 (우상단)
    label_text = event_type.upper()
    (tw, th), _ = cv2.getTextSize(label_text, font, 1.0, 2)
    lx = disp_w - tw - 12
    ly = th + 12
    cv2.rectangle(img, (lx - 6, 6), (lx + tw + 6, ly + 6), color, -1)
    cv2.putText(img, label_text, (lx, ly), font, 1.0, (0, 0, 0), 2)

    return img


# ── 프레임 추출 헬퍼 ──────────────────────────────────────────────────────────

def _read_frame(cap: cv2.VideoCapture, frame_no: int) -> Optional[np.ndarray]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
    ret, frame = cap.read()
    return frame if ret else None


def _get_video_fps(cap: cv2.VideoCapture) -> float:
    return cap.get(cv2.CAP_PROP_FPS) or 30.0


def _get_total_frames(cap: cv2.VideoCapture) -> int:
    return int(cap.get(cv2.CAP_PROP_FRAME_COUNT))


# ── 이미지 저장 ───────────────────────────────────────────────────────────────

def save_review_image(
    row: dict,
    cap: cv2.VideoCapture,
    config: AutoLabelConfig,
) -> Optional[Path]:
    """
    peak_frame에서 이미지를 읽어 오버레이 후 저장한다.
    저장 경로를 반환한다.
    """
    frame_no = row.get("frame")
    if frame_no is None:
        return None

    img_frame = _read_frame(cap, int(frame_no))
    if img_frame is None:
        return None

    event_type = row.get("event_candidate", "normal") or "normal"
    out_dir = config.images_dir / event_type
    out_dir.mkdir(parents=True, exist_ok=True)

    video_stem = Path(row["video_name"]).stem
    cid = row["candidate_id"]
    out_path = out_dir / f"{video_stem}_f{frame_no}_{cid}.jpg"

    annotated = _draw_overlay(img_frame, row, config)
    cv2.imwrite(str(out_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])

    return out_path


# ── 클립 저장 ─────────────────────────────────────────────────────────────────

def save_review_clip(
    row: dict,
    cap: cv2.VideoCapture,
    config: AutoLabelConfig,
) -> Optional[Path]:
    """
    start_frame 앞뒤 N 프레임을 읽어 MP4 클립으로 저장한다.
    normal 후보는 클립을 생성하지 않는다.
    """
    event_type = row.get("event_candidate", "normal") or "normal"
    if event_type == "normal":
        return None

    start = row.get("start_frame")
    end = row.get("end_frame")
    if start is None or end is None:
        return None

    clip_start = max(0, int(start) - config.clip_before_frames)
    clip_end = int(end) + config.clip_after_frames

    fps = _get_video_fps(cap)
    total = _get_total_frames(cap)
    clip_end = min(clip_end, total - 1)

    out_dir = config.clips_dir / event_type
    out_dir.mkdir(parents=True, exist_ok=True)

    video_stem = Path(row["video_name"]).stem
    cid = row["candidate_id"]
    out_path = out_dir / f"{video_stem}_f{start}-{end}_{cid}.mp4"

    # 첫 프레임으로 해상도 확인
    first_frame = _read_frame(cap, clip_start)
    if first_frame is None:
        return None

    h, w = first_frame.shape[:2]
    # 표시용 리사이즈
    scale = min(config.image_max_width / w, config.image_max_height / h, 1.0)
    out_w = int(w * scale)
    out_h = int(h * scale)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(out_path), fourcc, config.clip_fps, (out_w, out_h))

    for fn in range(clip_start, clip_end + 1):
        frame = _read_frame(cap, fn)
        if frame is None:
            break
        # 이벤트 프레임 범위일 때만 오버레이 (나머지는 원본)
        if int(start) <= fn <= int(end):
            frame = _draw_overlay(frame, row, config)

        if scale < 1.0:
            frame = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
        elif frame.shape[1] != out_w or frame.shape[0] != out_h:
            frame = cv2.resize(frame, (out_w, out_h))

        writer.write(frame)

    writer.release()
    return out_path


# ── review_candidates.csv 저장 ────────────────────────────────────────────────

REVIEW_CSV_COLUMNS = [
    "candidate_id",
    "video_name",
    "frame",
    "timestamp",
    "start_frame",
    "end_frame",
    "bbox",
    "global_id",
    "track_id",
    "label_candidate",
    "event_candidate",
    "score",
    "second_global_id",
    "second_track_id",
    "time_gap",
    "spatial_distance",
    "image_path",
    "clip_path",
    "coordinate_type",
    "source",
    "review",
    "memo",
]


def save_review_csv(rows: list[dict], config: AutoLabelConfig) -> Path:
    """
    후보 행 리스트를 review_candidates.csv로 저장한다.
    review 컬럼은 비워두어 사람이 yes/no/fix/unsure 를 입력할 수 있게 한다.
    """
    out_path = config.review_csv
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=REVIEW_CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            r = dict(row)
            # bbox 리스트를 문자열로 직렬화
            if isinstance(r.get("bbox"), list):
                r["bbox"] = json.dumps(r["bbox"])
            # image/clip 경로를 상대 경로 문자열로 변환
            for key in ("image_path", "clip_path"):
                if isinstance(r.get(key), Path):
                    r[key] = str(r[key])
            r.setdefault("review", "")
            r.setdefault("memo", "")
            writer.writerow(r)

    return out_path


# ── 전체 파이프라인 실행 ──────────────────────────────────────────────────────

def export_all(
    rows: list[dict],
    video_path: Path,
    config: AutoLabelConfig,
) -> Path:
    """
    후보 행 전체에 대해 이미지/클립을 저장하고 review_candidates.csv를 생성한다.

    rows: event_candidates_to_rows() 출력
    video_path: 원본 영상 파일 경로
    config: AutoLabelConfig

    반환: review_candidates.csv 경로
    """
    config.make_dirs()

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"영상을 열 수 없습니다: {video_path}")

    total = len(rows)
    for idx, row in enumerate(rows, 1):
        event_type = row.get("event_candidate", "normal") or "normal"
        print(f"  [{idx}/{total}] {event_type} | frame={row.get('frame')} | id={row.get('candidate_id')}")

        # 이미지 저장
        img_path = save_review_image(row, cap, config)
        if img_path:
            row["image_path"] = str(img_path)

        # 클립 저장 (normal 제외)
        clip_path = save_review_clip(row, cap, config)
        if clip_path:
            row["clip_path"] = str(clip_path)

    cap.release()

    csv_path = save_review_csv(rows, config)
    print(f"\n[완료] review_candidates.csv 저장: {csv_path}")
    print(f"       총 후보 수: {total}")
    return csv_path
