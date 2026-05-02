"""
run_pipeline.py
bbox/이벤트 후보 자동 생성 + 검수용 asset 저장 파이프라인 진입점.

사용법:
  # JSON 어노테이션이 있는 경우
  python -m auto_labeling.run_pipeline \\
      --video path/to/video.mp4 \\
      --json  path/to/annotation.json \\
      --output auto_labeling/

  # JSON이 없는 경우 (YOLO로 bbox 자동 검출)
  python -m auto_labeling.run_pipeline \\
      --video path/to/video.mp4 \\
      --output auto_labeling/

  # confirmed_labels.csv 생성 (검수 완료 후)
  python -m auto_labeling.run_pipeline --confirm-only

  # 검수 현황 확인
  python -m auto_labeling.run_pipeline --stats

이 파이프라인은 학습을 실행하지 않는다.
confirmed_labels.csv를 나중에 YOLO/이벤트 학습 데이터로 변환해 사용한다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="GateGuard 자동 라벨링 후보 생성 파이프라인"
    )
    p.add_argument("--video", type=Path, default=None, help="처리할 영상 파일 경로")
    p.add_argument("--json", type=Path, default=None, help="JSON 어노테이션 파일 경로 (없으면 YOLO 검출)")
    p.add_argument("--output", type=Path, default=Path("auto_labeling"), help="출력 디렉터리 (기본: auto_labeling/)")
    p.add_argument("--yolo-model", type=str, default="yolo11n.pt", help="YOLO 모델 가중치 경로")
    p.add_argument("--yolo-conf", type=float, default=0.5, help="YOLO confidence threshold")
    p.add_argument("--frame-step", type=int, default=1, help="YOLO 검출 간격 (매 N 프레임, 기본 1)")
    p.add_argument("--gate-line-y", type=int, default=None, help="게이트 통과선 Y 좌표 (원본 해상도)")
    p.add_argument("--confirm-only", action="store_true", help="후보 생성 없이 confirmed_labels.csv만 생성")
    p.add_argument("--stats", action="store_true", help="검수 현황만 출력")
    p.add_argument("--no-clips", action="store_true", help="클립 저장 생략 (이미지만 저장)")
    return p.parse_args()


def main() -> None:
    args = _parse_args()

    # auto_labeling 패키지 경로 설정
    pkg_root = Path(__file__).parent.parent
    if str(pkg_root) not in sys.path:
        sys.path.insert(0, str(pkg_root))

    from auto_labeling.auto_label_config import AutoLabelConfig
    from auto_labeling.make_confirmed_labels import make_confirmed_labels, print_review_stats

    cfg = AutoLabelConfig(output_dir=args.output)
    if args.yolo_model:
        cfg.yolo_model_path = args.yolo_model
    if args.yolo_conf:
        cfg.yolo_confidence = args.yolo_conf
    if args.frame_step:
        cfg.yolo_frame_step = args.frame_step
    if args.gate_line_y:
        cfg.gate_line_y_original = args.gate_line_y
    if args.no_clips:
        cfg.clip_before_frames = 0
        cfg.clip_after_frames = 0

    # ── 검수 현황만 출력 ──────────────────────────────────────────────────────
    if args.stats:
        print_review_stats(cfg)
        return

    # ── confirmed_labels.csv만 생성 ───────────────────────────────────────────
    if args.confirm_only:
        make_confirmed_labels(cfg)
        return

    # ── 후보 생성 파이프라인 ──────────────────────────────────────────────────
    if args.video is None:
        print("[오류] --video 옵션이 필요합니다.")
        print("       confirmed_labels만 만들려면 --confirm-only 옵션을 사용하세요.")
        sys.exit(1)

    if not args.video.exists():
        print(f"[오류] 영상 파일을 찾을 수 없습니다: {args.video}")
        sys.exit(1)

    from auto_labeling.auto_bbox_labeler import generate_bbox_candidates
    from auto_labeling.auto_event_labeler import generate_event_candidates, event_candidates_to_rows
    from auto_labeling.export_review_assets import export_all

    print(f"\n{'='*60}")
    print(f"  GateGuard 자동 라벨링 파이프라인")
    print(f"{'='*60}")
    print(f"  영상: {args.video.name}")
    print(f"  JSON: {args.json.name if args.json else '없음 (YOLO 검출)'}")
    print(f"  출력: {cfg.output_dir}")
    print(f"{'='*60}\n")

    # Step 1: bbox 후보 생성
    print("[Step 1] bbox 후보 생성...")
    bbox_candidates = generate_bbox_candidates(args.video, cfg, args.json)
    print(f"  → bbox 후보 {len(bbox_candidates)}개 생성 완료")

    if not bbox_candidates:
        print("[경고] bbox 후보가 없습니다. 파이프라인을 종료합니다.")
        return

    # Step 2: 이벤트 후보 생성
    print("\n[Step 2] 이벤트 후보 생성 (jump / crawling / tailgating / normal)...")

    # 영상 메타 정보 추출
    import cv2
    cap = cv2.VideoCapture(str(args.video))
    img_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    cap.release()

    event_candidates = generate_event_candidates(
        bbox_candidates, cfg,
        video_name=args.video.name,
        image_height=img_h,
        fps=fps,
    )

    from collections import Counter
    ev_counts = Counter(ev.event_type for ev in event_candidates)
    for ev_type, cnt in sorted(ev_counts.items()):
        print(f"  → {ev_type:12s}: {cnt}개")
    print(f"  → 총 이벤트 후보: {len(event_candidates)}개")

    # Step 3: 행 변환
    rows = event_candidates_to_rows(bbox_candidates, event_candidates)

    # Step 4: 이미지/클립 저장 + review_candidates.csv 생성
    print(f"\n[Step 3] 검수용 이미지/클립 저장 및 review_candidates.csv 생성...")
    csv_path = export_all(rows, args.video, cfg)

    print(f"\n{'='*60}")
    print(f"  파이프라인 완료!")
    print(f"  review_candidates.csv: {csv_path}")
    print(f"\n  다음 단계:")
    print(f"    1. {csv_path} 의 review 컬럼에 yes/no/fix/unsure 입력")
    print(f"    2. python -m auto_labeling.run_pipeline --confirm-only 실행")
    print(f"    3. {cfg.confirmed_csv} 를 학습 데이터로 변환")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
