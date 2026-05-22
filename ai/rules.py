from __future__ import annotations
from collections import deque, defaultdict
from typing import Dict, List, Optional, Set

import numpy as np

from ai.types import EventCandidate, GateZoneConfig, TrackedPerson, near_gate_x, bbox_overlap_ratio


class JumpDetector:
    """
    y2(발 끝) 변위 기반 점프 감지.
    - dynamic_multiplier : threshold = 정상 y2 변위 평균 × multiplier
    - min_score          : score(y2 변위/키) 최소값
    - _gate_min          : threshold 하한. gate 탐지 시 gate_height × 0.08로 자동 갱신
    """

    def __init__(self, window_frames: int = 30, jump_ratio: float = 0.30,
                 calibration_frames: int = 90, dynamic_multiplier: float = 5.0,
                 min_score: float = 0.25):
        self.window_frames = window_frames
        self.jump_ratio = jump_ratio
        self.calibration_frames = calibration_frames
        self.dynamic_multiplier = dynamic_multiplier
        self.min_score = min_score
        self._history: dict = {}
        self._frame_count: int = 0
        self._calib_disps: list = []
        self._dynamic_threshold: Optional[float] = None
        self._gate_min: float = 30.0

    def set_gate_height(self, gate_h: float):
        self._gate_min = max(gate_h * 0.08, 15.0)
        if self._dynamic_threshold is not None:
            self._dynamic_threshold = max(self._dynamic_threshold, self._gate_min)

    def _upward_disp(self, tid):
        h = self._history.get(tid)
        if not h or len(h) < 5:
            return 0.0, 0.0
        y2_vals = [y2 for y2, _ in h]
        avg_h = float(np.mean([ht for _, ht in h]))
        n = len(y2_vals)
        base = float(np.mean(y2_vals[:max(1, n // 4)]))
        return base - min(y2_vals), avg_h

    def _try_calibrate(self):
        if not self._calib_disps:
            return
        mean_disp = float(np.mean(self._calib_disps))
        self._dynamic_threshold = max(mean_disp * self.dynamic_multiplier, self._gate_min)
        print(f'[JumpDetector] 보정 완료: 정상 y2 변위={mean_disp:.1f}px '
              f'→ threshold={self._dynamic_threshold:.1f}px '
              f'(×{self.dynamic_multiplier}, min={self._gate_min:.1f}px)')

    def update(self, tid: int, xyxy):
        x1, y1, x2, y2 = xyxy
        h = y2 - y1
        if tid not in self._history:
            self._history[tid] = deque(maxlen=self.window_frames)
        self._history[tid].append((y2, h))
        if self._frame_count < self.calibration_frames:
            disp, _ = self._upward_disp(tid)
            if disp > 0:
                self._calib_disps.append(disp)
        elif self._dynamic_threshold is None:
            self._try_calibrate()
        self._frame_count += 1

    def is_jump(self, tid: int) -> bool:
        upward, avg_h = self._upward_disp(tid)
        if avg_h == 0:
            return False
        score = upward / avg_h
        if score < self.min_score:
            return False
        if self._dynamic_threshold is not None:
            return upward > self._dynamic_threshold
        return score > self.jump_ratio

    def get_score(self, tid: int) -> float:
        upward, avg_h = self._upward_disp(tid)
        return upward / avg_h if avg_h > 0 else 0.0

    def transfer_history(self, old_tid: int, new_tid: int):
        """ID switch 보정: old_tid 히스토리를 new_tid로 이어받기."""
        if old_tid in self._history:
            self._history[new_tid] = self._history.pop(old_tid)

    def cleanup(self, active_tids: Set[int]):
        for tid in list(self._history.keys()):
            if tid not in active_tids:
                del self._history[tid]


class IDRemapper:
    def __init__(self, dist_thresh: int = 80, frame_thresh: int = 15):
        self.dist_thresh = dist_thresh
        self.frame_thresh = frame_thresh
        self._lost: dict = {}
        self._remap: dict = {}

    def canonical(self, tid: int) -> int:
        return self._remap.get(tid, tid)

    def update(self, fi: int, persons: List[TrackedPerson], prev_tids: Set[int]) -> dict:
        current_tids = {p.track_id for p in persons}
        for tid in prev_tids - current_tids:
            canonical = self._remap.get(tid, tid)
            if canonical not in self._lost:
                self._lost[canonical] = (None, None, fi)
        expired = [tid for tid, (_, _, f) in self._lost.items() if fi - f > self.frame_thresh]
        for tid in expired:
            del self._lost[tid]
        new_mappings = {}
        known_canonicals = set(self._remap.values())
        for p in persons:
            if p.track_id in self._remap or p.track_id in known_canonicals:
                continue
            best_match, best_dist = None, self.dist_thresh
            for old_tid, (cx, cy, _) in self._lost.items():
                if cx is None:
                    continue
                dist = ((p.cx - cx) ** 2 + (p.cy - cy) ** 2) ** 0.5
                if dist < best_dist:
                    best_dist = dist
                    best_match = old_tid
            if best_match is not None:
                self._remap[p.track_id] = best_match
                new_mappings[p.track_id] = best_match
                del self._lost[best_match]
        return new_mappings

    def record_positions(self, persons: List[TrackedPerson]):
        for p in persons:
            canonical = self._remap.get(p.track_id, p.track_id)
            if canonical in self._lost:
                cx, cy, f = self._lost[canonical]
                self._lost[canonical] = (p.cx, p.cy, f)


class CrawlingRule:
    """AR=1.6, min_frames=10 (v6)"""

    def __init__(self, cfg: GateZoneConfig):
        self.cfg = cfg
        self._ar_buf: dict = defaultdict(lambda: deque(maxlen=60))
        self._low_frames: dict = defaultdict(int)
        self._triggered: set = set()
        self.debug: bool = False
        self._max_low: dict = defaultdict(int)

    def update(self, fi: int, persons: List[TrackedPerson],
               cached_gate=None) -> List[EventCandidate]:
        mf = self.cfg.crawl_min_frames
        th = self.cfg.crawl_aspect_ratio_thresh
        out = []
        active = {p.track_id for p in persons}

        for p in persons:
            if not near_gate_x(p, cached_gate, margin_ratio=0.3):
                if self.debug and fi % 30 == 0:
                    print(f'[CRAWL] f={fi} ID={p.track_id} SKIP near_gate_x=False')
                self._low_frames[p.track_id] = 0
                continue
            self._ar_buf[p.track_id].append(p.aspect_ratio)
            median_ar = float(np.median(list(self._ar_buf[p.track_id])))
            if median_ar < th:
                self._low_frames[p.track_id] += 1
                self._max_low[p.track_id] = max(self._max_low[p.track_id],
                                                 self._low_frames[p.track_id])
                if self.debug and self._low_frames[p.track_id] % 5 == 0:
                    print(f'[CRAWL] f={fi} ID={p.track_id} '
                          f'AR={median_ar:.2f}<{th} cnt={self._low_frames[p.track_id]}/{mf}')
            else:
                cnt = self._low_frames[p.track_id]
                if cnt >= mf and p.track_id not in self._triggered:
                    self._triggered.add(p.track_id)
                    if self.debug:
                        print(f'[CRAWL ✓] f={fi} ID={p.track_id} '
                              f'TRIGGERED AR={median_ar:.2f} cnt={cnt}')
                    out.append(EventCandidate(
                        'crawling', fi - cnt, fi, [p.track_id],
                        min(1.0, cnt / (mf * 3)),
                        f'AR={median_ar:.2f}<{th} {cnt}프레임'))
                self._low_frames[p.track_id] = 0

        for tid in list(self._low_frames):
            if tid not in active:
                cnt = self._low_frames[tid]
                if cnt >= mf and tid not in self._triggered:
                    self._triggered.add(tid)
                    out.append(EventCandidate(
                        'crawling', fi - cnt, fi, [tid],
                        min(1.0, cnt / (mf * 3)),
                        f'AR<{th} {cnt}프레임 후 시야이탈'))
                del self._low_frames[tid]
                if tid in self._ar_buf:
                    del self._ar_buf[tid]
        return out


class TailgatingRule:
    """min=5, overlap>=0.25, max_dist=200px (v6)"""

    def __init__(self, cfg: GateZoneConfig):
        self.cfg = cfg
        self.min_cooccupy_frames = cfg.tailgating_min_frames
        self.gate_overlap_thresh = cfg.gate_overlap_thresh
        self.max_dist = cfg.tailgate_max_dist
        self._pair_streak: dict = {}
        self._triggered: set = set()
        self._cy_history: dict = defaultdict(lambda: deque(maxlen=30))
        self.debug: bool = False

    def _movement_dir(self, tid: int) -> float:
        h = list(self._cy_history[tid])
        if len(h) < 3:
            return 0.0
        return h[-1] - h[0]

    def _in_gate(self, p: TrackedPerson, gx1, gy1, gx2, gy2):
        ratio = bbox_overlap_ratio(p.x1, p.y1, p.x2, p.y2, gx1, gy1, gx2, gy2)
        return ratio >= self.gate_overlap_thresh, ratio

    def update(self, fi: int, persons: List[TrackedPerson], fps: float,
               cached_gate=None) -> List[EventCandidate]:
        out = []
        if cached_gate:
            gx1, gy1 = cached_gate['x1'], cached_gate['y1']
            gx2, gy2 = cached_gate['x2'], cached_gate['y2']
        else:
            gz = self.cfg.gate_zone
            gx1, gy1, gx2, gy2 = gz.x1, gz.y1, gz.x2, gz.y2

        in_gate_persons = []
        overlap_map = {}
        for p in persons:
            inside, ratio = self._in_gate(p, gx1, gy1, gx2, gy2)
            overlap_map[p.track_id] = ratio
            if inside:
                in_gate_persons.append(p)
                self._cy_history[p.track_id].append(p.cy)

        if self.debug and fi % 15 == 0:
            print(f'[TAIL DEBUG] frame={fi:5d}, persons={len(persons)}, '
                  f'in_gate={len(in_gate_persons)}, '
                  f'max_streak={max(self._pair_streak.values(), default=0)}')

        current_pairs = set()
        if len(in_gate_persons) >= 2:
            for i in range(len(in_gate_persons)):
                for j in range(i + 1, len(in_gate_persons)):
                    pa = in_gate_persons[i]
                    pb = in_gate_persons[j]
                    dist_ij = ((pa.cx - pb.cx) ** 2 + (pa.cy - pb.cy) ** 2) ** 0.5
                    if dist_ij > self.max_dist:
                        if self.debug:
                            print(f'[TAIL DEBUG] dist 필터: '
                                  f'ID{pa.track_id}-ID{pb.track_id} '
                                  f'{dist_ij:.0f}px>{self.max_dist}px → skip')
                        continue
                    current_pairs.add(frozenset({pa.track_id, pb.track_id}))

        for key in list(self._pair_streak.keys()):
            if key not in current_pairs:
                del self._pair_streak[key]

        for key in current_pairs:
            self._pair_streak[key] = self._pair_streak.get(key, 0) + 1
            streak = self._pair_streak[key]
            if streak >= self.min_cooccupy_frames and key not in self._triggered:
                ta, tb = list(key)
                pa = next((p for p in in_gate_persons if p.track_id == ta), in_gate_persons[0])
                pb = next((p for p in in_gate_persons if p.track_id == tb), in_gate_persons[1])
                dir_a = self._movement_dir(ta)
                dir_b = self._movement_dir(tb)
                if dir_a != 0.0 and dir_b != 0.0 and dir_a * dir_b < 0:
                    continue  # 교행 방향 → skip
                self._triggered.add(key)
                dist = ((pa.cx - pb.cx) ** 2 + (pa.cy - pb.cy) ** 2) ** 0.5
                dir_label = '↓' if dir_a >= 0 else '↑'
                ovlp_a = overlap_map.get(ta, 0.0)
                ovlp_b = overlap_map.get(tb, 0.0)
                out.append(EventCandidate(
                    'tailgating', fi - streak + 1, fi, [ta, tb], 0.75,
                    f'gate 동시 점유 {streak}f(min={self.min_cooccupy_frames}), '
                    f'방향({dir_label}), dist={dist:.0f}px, '
                    f'overlap=({ovlp_a:.2f}/{ovlp_b:.2f})'))
        return out
