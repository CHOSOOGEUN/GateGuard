from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Detection:
    x1: float; y1: float; x2: float; y2: float; confidence: float

    @property
    def cx(self): return (self.x1 + self.x2) / 2
    @property
    def cy(self): return (self.y1 + self.y2) / 2
    @property
    def width(self): return self.x2 - self.x1
    @property
    def height(self): return self.y2 - self.y1
    @property
    def aspect_ratio(self): return self.height / (self.width + 1e-6)


@dataclass
class Zone:
    x1: int; y1: int; x2: int; y2: int

    def contains_point(self, x, y):
        return self.x1 <= x <= self.x2 and self.y1 <= y <= self.y2


@dataclass
class PassLine:
    x1: int; y1: int; x2: int; y2: int


@dataclass
class GateZoneConfig:
    camera_id: str
    frame_width: int
    frame_height: int
    gate_zone: Zone
    pass_line: PassLine
    jump_zone: Zone
    crawl_zone: Zone
    tailgate_time_window_s: float = 3.0
    tailgate_distance_thresh: float = 200.0
    unpaid_hold_s: float = 5.0
    jump_min_frames: int = 3
    crawl_min_frames: int = 10
    crawl_aspect_ratio_thresh: float = 1.6
    tailgating_min_frames: int = 5
    gate_overlap_thresh: float = 0.25
    tailgate_max_dist: float = 200.0

    @classmethod
    def from_dict(cls, d):
        return cls(
            camera_id=d['camera_id'],
            frame_width=d['frame_width'],
            frame_height=d['frame_height'],
            gate_zone=Zone(**d['gate_zone']),
            pass_line=PassLine(**d['pass_line']),
            jump_zone=Zone(**d['jump_zone']),
            crawl_zone=Zone(**d['crawl_zone']),
            tailgate_time_window_s   =d.get('tailgate_time_window_s',    3.0),
            tailgate_distance_thresh =d.get('tailgate_distance_thresh',  200.0),
            unpaid_hold_s            =d.get('unpaid_hold_s',             5.0),
            jump_min_frames          =d.get('jump_min_frames',           3),
            crawl_min_frames         =d.get('crawl_min_frames',          10),
            crawl_aspect_ratio_thresh=d.get('crawl_aspect_ratio_thresh', 1.6),
            tailgating_min_frames    =d.get('tailgating_min_frames',     5),
            gate_overlap_thresh      =d.get('gate_overlap_thresh',       0.25),
            tailgate_max_dist        =d.get('tailgate_max_dist',         200.0),
        )


@dataclass
class TrackedPerson:
    track_id: int
    x1: float; y1: float; x2: float; y2: float

    @property
    def cx(self): return (self.x1 + self.x2) / 2
    @property
    def cy(self): return (self.y1 + self.y2) / 2
    @property
    def aspect_ratio(self): return (self.y2 - self.y1) / ((self.x2 - self.x1) + 1e-6)


@dataclass
class EventCandidate:
    event_type: str
    start_frame: int
    end_frame: int
    track_ids: List[int]
    confidence: float
    reason: str
    status: str = 'candidate'
    efficientnet_result: Optional[dict] = None
    clip_path: Optional[str] = None


@dataclass
class GateRelation:
    in_gate: bool
    rel_x: float
    rel_y: float
    vertical_zone: str  # 'top' | 'middle' | 'bottom'
    overlap_iou: float


def compute_gate_relation(person: TrackedPerson, gate: dict) -> Optional[GateRelation]:
    if gate is None:
        return None
    gx1, gy1, gx2, gy2 = gate['x1'], gate['y1'], gate['x2'], gate['y2']
    gw = gx2 - gx1; gh = gy2 - gy1
    if gw <= 0 or gh <= 0:
        return None
    in_gate = (gx1 <= person.cx <= gx2) and (gy1 <= person.cy <= gy2)
    rel_x = (person.cx - gx1) / gw
    rel_y = (person.cy - gy1) / gh
    zone = 'top' if rel_y < 0.33 else ('middle' if rel_y < 0.66 else 'bottom')
    ix1 = max(person.x1, gx1); iy1 = max(person.y1, gy1)
    ix2 = min(person.x2, gx2); iy2 = min(person.y2, gy2)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    union = (person.x2 - person.x1) * (person.y2 - person.y1) + gw * gh - inter
    iou = inter / union if union > 0 else 0.0
    return GateRelation(in_gate=in_gate, rel_x=rel_x, rel_y=rel_y,
                        vertical_zone=zone, overlap_iou=iou)


def near_gate_x(person: TrackedPerson, gate: Optional[dict], margin_ratio: float = 0.2) -> bool:
    """person cx가 gate x-range ± margin 안에 있는지. gate 없으면 True."""
    if gate is None:
        return True
    gx1, gx2 = gate['x1'], gate['x2']
    margin = (gx2 - gx1) * margin_ratio
    return (gx1 - margin) <= person.cx <= (gx2 + margin)


def bbox_overlap_ratio(px1, py1, px2, py2, gx1, gy1, gx2, gy2) -> float:
    ix1 = max(px1, gx1); iy1 = max(py1, gy1)
    ix2 = min(px2, gx2); iy2 = min(py2, gy2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    p_area = max((px2 - px1) * (py2 - py1), 1.0)
    return inter / p_area
