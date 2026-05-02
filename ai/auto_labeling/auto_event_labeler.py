"""
auto_event_labeler.py
bbox 후보로부터 이벤트 후보(jump / crawling / tailgating / normal)를 생성한다.

입력:  bbox 후보 리스트 (auto_bbox_labeler.py 출력)
출력:  이벤트 후보가 추가된 후보 리스트 (review_candidates.csv용)

학습 실행은 하지 않는다.
AI가 생성한 라벨은 모두 candidate — 사람의 검수가 필요하다.
"""

from __future__ import annotations

import math
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Optional

from auto_labeling.auto_label_config import AutoLabelConfig


# ── 데이터 구조 ───────────────────────────────────────────────────────────────

@dataclass
class TrackHistory:
    """단일 global_id / track_id의 프레임별 이력."""
    tid: str                              # global_id 또는 track_id (str로 통일)
    frames: list[int] = field(default_factory=list)
    center_y: list[float] = field(default_factory=list)
    center_x: list[float] = field(default_factory=list)
    heights: list[float] = field(default_factory=list)
    widths: list[float] = field(default_factory=list)
    timestamps: list[float] = field(default_factory=list)
    bboxes: list[list[int]] = field(default_factory=list)
    confidences: list[float] = field(default_factory=list)

    @property
    def avg_height(self) -> float:
        return float(sum(self.heights) / len(self.heights)) if self.heights else 0.0


@dataclass
class EventCandidate:
    candidate_id: str
    video_name: str
    event_type: str         # jump | crawling | tailgating | normal
    start_frame: int
    end_frame: int
    peak_frame: int         # 이벤트가 가장 두드러진 프레임
    timestamp: float
    bbox: list[int]         # peak_frame의 bbox
    global_id: Optional[str]
    track_id: Optional[int]
    label_candidate: str
    score: float            # 이벤트 강도 점수 [0, 1]
    coordinate_type: str
    source: str
    # tailgating 전용
    second_global_id: Optional[str] = None
    second_track_id: Optional[int] = None
    time_gap: Optional[float] = None
    spatial_distance: Optional[float] = None


# ── 트랙 이력 구축 ────────────────────────────────────────────────────────────

def _build_track_histories(
    bbox_candidates: list[dict],
) -> dict[str, TrackHistory]:
    """
    bbox 후보 리스트를 global_id 또는 track_id 기준으로 묶어 TrackHistory를 구성한다.
    global_id가 있으면 우선 사용, 없으면 track_id, 둘 다 없으면 건너뜀.
    """
    histories: dict[str, TrackHistory] = {}

    for c in sorted(bbox_candidates, key=lambda x: x["frame"]):
        gid = c.get("global_id")
        tid = c.get("track_id")
        key = f"gid_{gid}" if gid is not None else (f"tid_{tid}" if tid is not None else None)
        if key is None:
            continue

        if key not in histories:
            histories[key] = TrackHistory(tid=key)

        h = histories[key]
        bbox = c["bbox"]
        x1, y1, x2, y2 = bbox
        h.frames.append(c["frame"])
        h.center_x.append((x1 + x2) / 2)
        h.center_y.append((y1 + y2) / 2)
        h.heights.append(y2 - y1)
        h.widths.append(x2 - x1)
        h.timestamps.append(c["timestamp"])
        h.bboxes.append(bbox)
        h.confidences.append(c.get("confidence", 1.0))

    return histories


def _key_to_ids(key: str) -> tuple[Optional[str], Optional[int]]:
    """'gid_7057' → ('7057', None),  'tid_3' → (None, 3)"""
    if key.startswith("gid_"):
        return key[4:], None
    if key.startswith("tid_"):
        return None, int(key[4:])
    return None, None


def _first_candidate(bbox_candidates: list[dict], key: str) -> Optional[dict]:
    gid, tid_val = _key_to_ids(key)
    for c in bbox_candidates:
        if gid is not None and str(c.get("global_id")) == gid:
            return c
        if tid_val is not None and c.get("track_id") == tid_val:
            return c
    return None


# ── Jump 후보 생성 ─────────────────────────────────────────────────────────────

def _detect_jumps(
    history: TrackHistory,
    config: AutoLabelConfig,
    video_name: str,
    coord_type: str,
    label: str,
    source: str,
) -> list[EventCandidate]:
    """
    슬라이딩 윈도우로 center_y 위쪽 변위를 분석해 jump 후보를 찾는다.

    알고리즘:
      - 윈도우(W 프레임) 안에서 앞 1/4의 평균 y를 baseline으로 설정
      - baseline - min(y_in_window) = upward_disp
      - upward_disp / avg_height > jump_ratio 이면 점프 후보
      - 조건 만족 구간을 연결해 start_frame/end_frame 결정
    """
    W = config.jump_window_frames
    ratio = config.jump_ratio
    min_frames = config.jump_min_frames
    n = len(history.frames)
    if n < W:
        return []

    jump_flags = [False] * n

    for i in range(W, n):
        window_y = history.center_y[i - W: i]
        window_h = history.heights[i - W: i]
        avg_h = sum(window_h) / len(window_h)
        if avg_h == 0:
            continue
        quarter = max(1, len(window_y) // 4)
        baseline = sum(window_y[:quarter]) / quarter
        upward = baseline - min(window_y)
        if upward > ratio * avg_h:
            jump_flags[i] = True

    candidates: list[EventCandidate] = []
    i = 0
    while i < n:
        if not jump_flags[i]:
            i += 1
            continue

        j = i
        while j < n and jump_flags[j]:
            j += 1
        segment_len = j - i

        if segment_len >= min_frames:
            # 가장 위로 올라간 프레임을 peak로 선택
            seg_y = history.center_y[i:j]
            peak_offset = seg_y.index(min(seg_y))
            peak_idx = i + peak_offset

            avg_h_seg = sum(history.heights[i:j]) / segment_len
            quarter = max(1, len(seg_y) // 4)
            baseline = sum(seg_y[:quarter]) / quarter
            upward = baseline - min(seg_y)
            score = min(1.0, (upward / avg_h_seg) / (ratio * config.jump_dynamic_multiplier))

            gid, tid_val = _key_to_ids(history.tid)
            candidates.append(EventCandidate(
                candidate_id=str(uuid.uuid4())[:12],
                video_name=video_name,
                event_type="jump",
                start_frame=history.frames[i],
                end_frame=history.frames[j - 1],
                peak_frame=history.frames[peak_idx],
                timestamp=history.timestamps[peak_idx],
                bbox=history.bboxes[peak_idx],
                global_id=gid,
                track_id=tid_val,
                label_candidate=label,
                score=round(score, 4),
                coordinate_type=coord_type,
                source=source,
            ))

        i = j

    return candidates


# ── Crawling 후보 생성 ─────────────────────────────────────────────────────────

def _detect_crawling(
    history: TrackHistory,
    config: AutoLabelConfig,
    video_name: str,
    coord_type: str,
    label: str,
    source: str,
    image_height: int,
) -> list[EventCandidate]:
    """
    bbox 가로/세로 비율, 높이 감소, ROI 위치를 복합 판단해 crawling 후보를 찾는다.

    알고리즘:
      - width / height > aspect_ratio_threshold  (납작한 bbox)
      - height < track_avg_height * height_ratio  (기어서 작아 보임)
      - center_y가 gate 하단 ROI 안에 있음
      - 위 조건이 N 프레임 연속 유지될 때 crawling 후보
    """
    min_consec = config.crawl_consecutive_frames
    aspect_thr = config.crawl_aspect_ratio_threshold
    height_ratio = config.crawl_height_ratio
    roi_y_min = config.crawl_roi_y_min_ratio * image_height
    roi_y_max = config.crawl_roi_y_max_ratio * image_height

    avg_h = history.avg_height
    n = len(history.frames)
    crawl_flags = [False] * n

    for i in range(n):
        w = history.widths[i]
        h = history.heights[i]
        cy = history.center_y[i]
        if h == 0:
            continue

        aspect_ok = (w / h) >= aspect_thr
        height_ok = (avg_h > 0) and (h < avg_h * height_ratio)
        roi_ok = roi_y_min <= cy <= roi_y_max

        crawl_flags[i] = aspect_ok and (height_ok or roi_ok)

    candidates: list[EventCandidate] = []
    i = 0
    while i < n:
        if not crawl_flags[i]:
            i += 1
            continue

        j = i
        while j < n and crawl_flags[j]:
            j += 1
        segment_len = j - i

        if segment_len >= min_consec:
            # aspect ratio가 가장 높은 프레임을 peak로
            seg_aspects = [
                history.widths[k] / max(1, history.heights[k]) for k in range(i, j)
            ]
            peak_offset = seg_aspects.index(max(seg_aspects))
            peak_idx = i + peak_offset
            score = min(1.0, max(seg_aspects) / (aspect_thr * 2))

            gid, tid_val = _key_to_ids(history.tid)
            candidates.append(EventCandidate(
                candidate_id=str(uuid.uuid4())[:12],
                video_name=video_name,
                event_type="crawling",
                start_frame=history.frames[i],
                end_frame=history.frames[j - 1],
                peak_frame=history.frames[peak_idx],
                timestamp=history.timestamps[peak_idx],
                bbox=history.bboxes[peak_idx],
                global_id=gid,
                track_id=tid_val,
                label_candidate=label,
                score=round(score, 4),
                coordinate_type=coord_type,
                source=source,
            ))

        i = j

    return candidates


# ── Tailgating 후보 생성 ──────────────────────────────────────────────────────

@dataclass
class _Crossing:
    key: str
    frame: int
    timestamp: float
    cx: float
    cy: float
    direction: str   # "down" | "up"
    confidence: float
    bbox: list[int]
    global_id: Optional[str]
    track_id: Optional[int]
    label: str


def _detect_tailgating(
    histories: dict[str, TrackHistory],
    config: AutoLabelConfig,
    video_name: str,
    coord_type: str,
    source: str,
    image_height: int,
    fps: float,
) -> list[EventCandidate]:
    """
    각 트랙의 center_y가 게이트 라인을 통과한 시점을 감지하고,
    서로 다른 두 트랙이 짧은 시간 / 가까운 거리 내에 같은 방향으로 통과하면
    tailgating 후보로 생성한다.
    """
    gate_y = config.gate_line_y_for(image_height)
    time_win = config.tailgating_time_window_sec
    dist_thr = config.tailgating_distance_threshold
    min_age = config.tailgating_min_track_age_frames
    min_conf = config.tailgating_min_confidence

    all_crossings: list[_Crossing] = []

    for key, h in histories.items():
        if len(h.frames) < min_age:
            continue

        prev_cy: Optional[float] = None
        gid, tid_val = _key_to_ids(key)
        label = "person"

        for i in range(len(h.frames)):
            cy = h.center_y[i]
            conf = h.confidences[i]
            if prev_cy is None:
                prev_cy = cy
                continue

            crossed_down = prev_cy < gate_y <= cy
            crossed_up = prev_cy >= gate_y > cy

            if (crossed_down or crossed_up) and conf >= min_conf:
                direction = "down" if crossed_down else "up"
                all_crossings.append(_Crossing(
                    key=key,
                    frame=h.frames[i],
                    timestamp=h.timestamps[i],
                    cx=h.center_x[i],
                    cy=cy,
                    direction=direction,
                    confidence=conf,
                    bbox=h.bboxes[i],
                    global_id=gid,
                    track_id=tid_val,
                    label=label,
                ))

            prev_cy = cy

    all_crossings.sort(key=lambda c: c.timestamp)

    candidates: list[EventCandidate] = []
    used: set[int] = set()

    for i, c1 in enumerate(all_crossings):
        if i in used:
            continue
        for j in range(i + 1, len(all_crossings)):
            if j in used:
                continue
            c2 = all_crossings[j]
            if c1.key == c2.key:
                continue
            if c1.direction != c2.direction:
                continue
            time_gap = c2.timestamp - c1.timestamp
            if time_gap > time_win:
                break
            dist = math.hypot(c2.cx - c1.cx, c2.cy - c1.cy)
            if dist > dist_thr:
                continue

            score = min(1.0, (1 - time_gap / time_win) * 0.6 + (1 - dist / dist_thr) * 0.4)

            candidates.append(EventCandidate(
                candidate_id=str(uuid.uuid4())[:12],
                video_name=video_name,
                event_type="tailgating",
                start_frame=c1.frame,
                end_frame=c2.frame,
                peak_frame=c2.frame,
                timestamp=c2.timestamp,
                bbox=c2.bbox,
                global_id=c1.global_id,
                track_id=c1.track_id,
                label_candidate=c1.label,
                score=round(score, 4),
                coordinate_type=coord_type,
                source=source,
                second_global_id=c2.global_id,
                second_track_id=c2.track_id,
                time_gap=round(time_gap, 3),
                spatial_distance=round(dist, 1),
            ))
            used.add(i)
            used.add(j)
            break

    return candidates


# ── Normal 후보 샘플링 ─────────────────────────────────────────────────────────

def _sample_normal_candidates(
    bbox_candidates: list[dict],
    event_frame_set: set[int],
    config: AutoLabelConfig,
    video_name: str,
    coord_type: str,
    source: str,
) -> list[EventCandidate]:
    """
    이벤트가 없는 구간의 bbox를 일정 간격으로 샘플링해 normal 후보를 생성한다.
    오탐 검증용으로 활용하기 위해 review_candidates.csv에 포함한다.
    """
    if not config.include_normal_candidates:
        return []

    interval = config.normal_sample_interval_frames
    sampled_frames: set[int] = set()
    candidates: list[EventCandidate] = []

    for c in sorted(bbox_candidates, key=lambda x: x["frame"]):
        frame = c["frame"]
        if frame in event_frame_set:
            continue
        # 이미 샘플링한 프레임 근처면 건너뜀
        if any(abs(frame - sf) < interval for sf in sampled_frames):
            continue

        gid = c.get("global_id")
        tid_val = c.get("track_id")
        sampled_frames.add(frame)

        candidates.append(EventCandidate(
            candidate_id=str(uuid.uuid4())[:12],
            video_name=video_name,
            event_type="normal",
            start_frame=frame,
            end_frame=frame,
            peak_frame=frame,
            timestamp=c["timestamp"],
            bbox=c["bbox"],
            global_id=str(gid) if gid is not None else None,
            track_id=tid_val,
            label_candidate=c.get("label_candidate", "person"),
            score=0.0,
            coordinate_type=coord_type,
            source=source,
        ))

    return candidates


# ── 공개 API ──────────────────────────────────────────────────────────────────

def generate_event_candidates(
    bbox_candidates: list[dict],
    config: AutoLabelConfig,
    video_name: str,
    image_height: Optional[int] = None,
    fps: float = 30.0,
) -> list[EventCandidate]:
    """
    bbox 후보로부터 jump/crawling/tailgating/normal 이벤트 후보를 생성한다.

    image_height: 원본 영상 높이. None이면 config.original_height 사용.
    fps: 영상 FPS. tailgating 시간 계산에 사용.
    """
    if not bbox_candidates:
        return []

    h_px = image_height if image_height is not None else config.original_height
    coord_type = bbox_candidates[0].get("coordinate_type", config.coord_type_original)
    source = bbox_candidates[0].get("source", "unknown")

    histories = _build_track_histories(bbox_candidates)

    all_events: list[EventCandidate] = []

    for key, history in histories.items():
        if not history.frames:
            continue

        ref = _first_candidate(bbox_candidates, key)
        label = ref.get("label_candidate", "person") if ref else "person"

        # Jump
        all_events.extend(_detect_jumps(history, config, video_name, coord_type, label, source))

        # Crawling
        all_events.extend(_detect_crawling(
            history, config, video_name, coord_type, label, source, h_px
        ))

    # Tailgating (트랙 간 상호 분석)
    all_events.extend(_detect_tailgating(
        histories, config, video_name, coord_type, source, h_px, fps
    ))

    # Normal (이벤트 없는 구간 샘플링)
    event_frame_set = set()
    for ev in all_events:
        for f in range(ev.start_frame, ev.end_frame + 1):
            event_frame_set.add(f)

    all_events.extend(_sample_normal_candidates(
        bbox_candidates, event_frame_set, config, video_name, coord_type, source
    ))

    return all_events


def event_candidates_to_rows(
    bbox_candidates: list[dict],
    event_candidates: list[EventCandidate],
) -> list[dict]:
    """
    EventCandidate 리스트를 review_candidates.csv 행 형식으로 변환한다.
    bbox_candidates에서 이벤트 미포함 후보(bbox-only)도 추가한다.
    """
    rows: list[dict] = []

    # 이벤트 후보 → 행 변환
    for ev in event_candidates:
        rows.append({
            "candidate_id": ev.candidate_id,
            "video_name": ev.video_name,
            "frame": ev.peak_frame,
            "timestamp": ev.timestamp,
            "start_frame": ev.start_frame,
            "end_frame": ev.end_frame,
            "bbox": ev.bbox,
            "global_id": ev.global_id,
            "track_id": ev.track_id,
            "label_candidate": ev.label_candidate,
            "event_candidate": ev.event_type,
            "score": ev.score,
            "coordinate_type": ev.coordinate_type,
            "source": ev.source,
            "second_global_id": ev.second_global_id,
            "second_track_id": ev.second_track_id,
            "time_gap": ev.time_gap,
            "spatial_distance": ev.spatial_distance,
            "image_path": None,
            "clip_path": None,
            "review": "",
            "memo": "",
        })

    return rows
