"""
auto_label_config.py
bbox/이벤트 후보 생성 및 검수 파이프라인의 모든 설정값을 관리한다.
학습 실행과 완전히 분리된 독립 파이프라인용 설정 파일.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class AutoLabelConfig:
    # ── 출력 경로 ─────────────────────────────────────────────────────────────
    output_dir: Path = Path("auto_labeling")

    # ── 원본 해상도 (4K 기준) ─────────────────────────────────────────────────
    original_width: int = 3840
    original_height: int = 2160

    # ── YOLO 입력 해상도 ──────────────────────────────────────────────────────
    yolo_input_size: int = 640

    # ── 게이트 통과선 (원본 좌표 기준) ─────────────────────────────────────────
    # JSON 어노테이션 기준 영상 높이(2160)의 절반 근처로 초기 설정
    gate_line_y_original: int = 1160
    gate_line_x_start: int = 0
    gate_line_x_end: int = 3840

    # ── YOLO 검출기 (JSON bbox가 없는 영상에 사용) ───────────────────────────
    yolo_model_path: str = "yolo11n.pt"
    yolo_confidence: float = 0.5
    # JSON 없는 영상을 YOLO로 처리할 때 매 N번째 프레임만 검출 (속도 조절)
    yolo_frame_step: int = 1

    # ── Jump 후보 생성 임계값 ─────────────────────────────────────────────────
    # 슬라이딩 윈도우 크기 (프레임 수)
    jump_window_frames: int = 30
    # upward_disp / avg_height 비율 임계값 (calibration 전 fallback)
    jump_ratio: float = 0.30
    # 자동 보정 구간 (초반 N 프레임)
    jump_calibration_frames: int = 90
    # 보정 후 dynamic threshold = 정상 upward 평균 × 배수
    jump_dynamic_multiplier: float = 3.0
    # 점프 후보로 인정하기 위한 최소 연속 프레임 수
    jump_min_frames: int = 3

    # ── Crawling 후보 생성 임계값 ─────────────────────────────────────────────
    # bbox width/height 비율이 이 값 이상이면 crawling 후보 (납작하게 보임)
    crawl_aspect_ratio_threshold: float = 1.5
    # bbox height가 해당 트랙 평균 height의 이 비율 미만이면 crawling 후보
    crawl_height_ratio: float = 0.80
    # crawling 상태가 N 프레임 이상 연속으로 유지돼야 후보 확정
    crawl_consecutive_frames: int = 5
    # gate 하단 ROI: 이미지 높이 대비 비율 (원본 좌표 기준)
    # (y_min_ratio, y_max_ratio) — 이 범위 내에 center_y가 있어야 crawling 후보
    crawl_roi_y_min_ratio: float = 0.50
    crawl_roi_y_max_ratio: float = 1.00

    # ── Tailgating 후보 생성 임계값 ──────────────────────────────────────────
    # 두 통과 이벤트 사이 최대 시간 간격 (초)
    tailgating_time_window_sec: float = 1.5
    # 두 통과 지점 사이 최대 픽셀 거리 (원본 좌표 기준)
    tailgating_distance_threshold: float = 300.0
    # 통과 이벤트를 기록하기 위한 최소 confidence
    tailgating_min_confidence: float = 0.4
    # 통과로 인정하기 위한 최소 트랙 수명 (프레임 수)
    tailgating_min_track_age_frames: int = 5

    # ── 검수용 asset 저장 설정 ────────────────────────────────────────────────
    # 이벤트 구간 앞뒤로 저장할 여유 프레임 수
    clip_before_frames: int = 45
    clip_after_frames: int = 45
    # 저장 이미지의 최대 표시 해상도 (원본이 더 작으면 그대로 유지)
    image_max_width: int = 1280
    image_max_height: int = 720
    # 클립 저장 fps (원본보다 낮추면 파일 크기 절약)
    clip_fps: int = 15

    # ── Normal 후보 샘플링 ────────────────────────────────────────────────────
    include_normal_candidates: bool = True
    # N 프레임마다 1개의 normal 후보 생성
    normal_sample_interval_frames: int = 90

    # ── bbox 시각화 색상 (BGR) ────────────────────────────────────────────────
    color_jump: tuple = (0, 255, 0)        # 초록
    color_crawling: tuple = (0, 165, 255)  # 주황
    color_tailgating: tuple = (0, 0, 255)  # 빨강
    color_normal: tuple = (200, 200, 200)  # 회색
    color_person: tuple = (255, 255, 0)    # 노랑 (이벤트 없는 bbox)

    # ── 좌표 타입 문자열 ──────────────────────────────────────────────────────
    @property
    def coord_type_original(self) -> str:
        return f"original_{self.original_width}x{self.original_height}"

    @property
    def coord_type_resized(self) -> str:
        return f"resized_{self.yolo_input_size}"

    # ── 출력 디렉터리 경로 헬퍼 ──────────────────────────────────────────────
    @property
    def candidates_dir(self) -> Path:
        return self.output_dir / "candidates"

    @property
    def images_dir(self) -> Path:
        return self.candidates_dir / "images"

    @property
    def clips_dir(self) -> Path:
        return self.candidates_dir / "clips"

    @property
    def review_csv(self) -> Path:
        return self.output_dir / "review_candidates.csv"

    @property
    def confirmed_csv(self) -> Path:
        return self.output_dir / "confirmed_labels.csv"

    def make_dirs(self) -> None:
        for event_type in ("jump", "crawling", "tailgating", "normal"):
            (self.images_dir / event_type).mkdir(parents=True, exist_ok=True)
            if event_type != "normal":
                (self.clips_dir / event_type).mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def scale_to_original(
        self, x: float, y: float, src_w: int, src_h: int
    ) -> tuple[float, float]:
        """리사이즈 좌표 → 원본 좌표 변환."""
        return x * self.original_width / src_w, y * self.original_height / src_h

    def gate_line_y_for(self, height: int) -> int:
        """주어진 이미지 높이에 맞춰 게이트 라인 Y 좌표를 반환."""
        return int(self.gate_line_y_original * height / self.original_height)
