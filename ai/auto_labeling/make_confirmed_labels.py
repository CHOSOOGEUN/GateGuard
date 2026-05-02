"""
make_confirmed_labels.py
review_candidates.csv에서 review=yes인 항목만 모아
confirmed_labels.csv를 생성한다.

confirmed_labels.csv는 나중에 YOLO 학습 데이터나
이벤트 학습 데이터로 변환하기 위한 최종 검수 완료 데이터셋이다.

학습 실행은 하지 않는다.
사람이 yes로 검수한 항목만 포함한다.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Optional

from auto_labeling.auto_label_config import AutoLabelConfig


# ── confirmed_labels.csv 컬럼 정의 ───────────────────────────────────────────

CONFIRMED_COLUMNS = [
    "candidate_id",
    "video_name",
    "start_frame",
    "end_frame",
    "frame",
    "bbox",
    "global_id",
    "track_id",
    "final_label",
    "final_event",
    "coordinate_type",
    "source_candidate_score",
    "second_global_id",
    "second_track_id",
    "time_gap",
    "spatial_distance",
    "memo",
]

VALID_REVIEW_VALUES = {"yes", "no", "fix", "unsure"}


# ── 좌표 정규화 헬퍼 ──────────────────────────────────────────────────────────

def _normalize_bbox_to_original(
    bbox: list[int],
    coord_type: str,
    config: AutoLabelConfig,
) -> tuple[list[int], str]:
    """
    bbox 좌표를 원본 해상도로 변환한다.
    이미 원본 좌표이면 그대로 반환한다.
    """
    orig_type = config.coord_type_original

    # 이미 원본 좌표이면 변환 불필요
    if coord_type == orig_type or coord_type.startswith("original_"):
        return bbox, coord_type

    # resized_640 → 원본 변환
    if coord_type.startswith("resized_"):
        try:
            resized_size = int(coord_type.split("_")[1])
        except (IndexError, ValueError):
            return bbox, coord_type

        x1, y1, x2, y2 = bbox
        # 리사이즈 시 aspect ratio 유지 여부에 따라 다르지만
        # 가로/세로를 각각 독립적으로 스케일 (letterbox가 없다고 가정)
        scale_x = config.original_width / resized_size
        scale_y = config.original_height / resized_size
        return (
            [int(x1 * scale_x), int(y1 * scale_y), int(x2 * scale_x), int(y2 * scale_y)],
            orig_type,
        )

    # 알 수 없는 형식은 그대로 반환
    return bbox, coord_type


def _parse_bbox(bbox_str: str) -> Optional[list[int]]:
    """CSV에서 읽은 bbox 문자열을 리스트로 파싱한다."""
    if not bbox_str:
        return None
    try:
        parsed = json.loads(bbox_str)
        if isinstance(parsed, list) and len(parsed) == 4:
            return [int(v) for v in parsed]
    except (json.JSONDecodeError, ValueError):
        pass
    return None


# ── 핵심 변환 로직 ────────────────────────────────────────────────────────────

def make_confirmed_labels(
    config: AutoLabelConfig,
    review_csv: Optional[Path] = None,
    confirmed_csv: Optional[Path] = None,
    normalize_to_original: bool = True,
) -> Path:
    """
    review_candidates.csv를 읽고 review=yes인 행만 confirmed_labels.csv로 저장한다.

    normalize_to_original: True이면 모든 bbox를 원본 좌표로 변환해서 저장.
    반환: confirmed_labels.csv 경로
    """
    src = review_csv or config.review_csv
    dst = confirmed_csv or config.confirmed_csv

    if not src.exists():
        raise FileNotFoundError(
            f"review_candidates.csv를 찾을 수 없습니다: {src}\n"
            "먼저 export_review_assets.export_all()을 실행해 후보를 생성하세요."
        )

    confirmed_rows: list[dict] = []
    skipped_no = 0
    skipped_other = 0

    with open(src, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            review = row.get("review", "").strip().lower()

            if review not in VALID_REVIEW_VALUES:
                skipped_other += 1
                continue
            if review != "yes":
                skipped_no += 1
                continue

            # bbox 파싱 및 좌표 정규화
            bbox_raw = _parse_bbox(row.get("bbox", ""))
            coord_type = row.get("coordinate_type", config.coord_type_original)

            if bbox_raw is not None and normalize_to_original:
                bbox_final, coord_type_final = _normalize_bbox_to_original(
                    bbox_raw, coord_type, config
                )
            else:
                bbox_final = bbox_raw
                coord_type_final = coord_type

            # final_label/final_event: fix 시 memo에 수정값 입력 가능하도록
            # 여기서는 candidate 값을 그대로 사용 (fix 처리는 검수자가 memo에 기록)
            final_label = row.get("label_candidate", "person")
            final_event = row.get("event_candidate", "")

            confirmed_rows.append({
                "candidate_id": row.get("candidate_id", ""),
                "video_name": row.get("video_name", ""),
                "start_frame": row.get("start_frame", ""),
                "end_frame": row.get("end_frame", ""),
                "frame": row.get("frame", ""),
                "bbox": json.dumps(bbox_final) if bbox_final else "",
                "global_id": row.get("global_id", ""),
                "track_id": row.get("track_id", ""),
                "final_label": final_label,
                "final_event": final_event,
                "coordinate_type": coord_type_final,
                "source_candidate_score": row.get("score", ""),
                "second_global_id": row.get("second_global_id", ""),
                "second_track_id": row.get("second_track_id", ""),
                "time_gap": row.get("time_gap", ""),
                "spatial_distance": row.get("spatial_distance", ""),
                "memo": row.get("memo", ""),
            })

    dst.parent.mkdir(parents=True, exist_ok=True)
    with open(dst, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CONFIRMED_COLUMNS)
        writer.writeheader()
        writer.writerows(confirmed_rows)

    print(f"\n[confirmed_labels.csv 생성 완료]")
    print(f"  저장 경로: {dst}")
    print(f"  확정 항목(yes): {len(confirmed_rows)}")
    print(f"  제외 항목(no/fix/unsure): {skipped_no}")
    print(f"  미검수 항목(빈칸 등): {skipped_other}")

    return dst


def print_review_stats(config: AutoLabelConfig) -> None:
    """review_candidates.csv의 검수 현황을 출력한다."""
    src = config.review_csv
    if not src.exists():
        print(f"파일 없음: {src}")
        return

    from collections import Counter
    review_counts: Counter = Counter()
    event_counts: Counter = Counter()
    total = 0

    with open(src, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            total += 1
            review = row.get("review", "").strip() or "(미입력)"
            event = row.get("event_candidate", "") or "normal"
            review_counts[review] += 1
            event_counts[event] += 1

    print(f"\n[검수 현황] {src}")
    print(f"  전체 후보: {total}")
    print("  review 값별:")
    for val, cnt in sorted(review_counts.items(), key=lambda x: -x[1]):
        pct = cnt / total * 100 if total else 0
        print(f"    {val:12s}: {cnt:4d} ({pct:.1f}%)")
    print("  이벤트 타입별:")
    for ev, cnt in sorted(event_counts.items(), key=lambda x: -x[1]):
        print(f"    {ev:12s}: {cnt:4d}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="review_candidates.csv에서 review=yes 항목을 confirmed_labels.csv로 변환"
    )
    p.add_argument(
        "--review-csv",
        type=Path,
        default=None,
        help="review_candidates.csv 경로 (기본: auto_labeling/review_candidates.csv)",
    )
    p.add_argument(
        "--confirmed-csv",
        type=Path,
        default=None,
        help="confirmed_labels.csv 저장 경로 (기본: auto_labeling/confirmed_labels.csv)",
    )
    p.add_argument(
        "--output-dir",
        type=Path,
        default=Path("auto_labeling"),
        help="auto_labeling 출력 디렉터리 (기본: auto_labeling/)",
    )
    p.add_argument(
        "--stats-only",
        action="store_true",
        help="변환 없이 검수 현황만 출력",
    )
    p.add_argument(
        "--no-normalize",
        action="store_true",
        help="bbox 좌표를 원본 해상도로 변환하지 않음",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    cfg = AutoLabelConfig(output_dir=args.output_dir)

    if args.stats_only:
        print_review_stats(cfg)
    else:
        make_confirmed_labels(
            cfg,
            review_csv=args.review_csv,
            confirmed_csv=args.confirmed_csv,
            normalize_to_original=not args.no_normalize,
        )
