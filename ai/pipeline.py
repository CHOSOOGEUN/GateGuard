from __future__ import annotations
import copy
import json
import os
from collections import deque, defaultdict
from pathlib import Path
from typing import Callable, List, Optional, Tuple

import cv2
import numpy as np
import supervision as sv
from tqdm import tqdm

from ai.detectors import GateDetector, YOLODetector, EfficientNetVerifier, make_blur_faces
from ai.rules import CrawlingRule, IDRemapper, JumpDetector, TailgatingRule
from ai.types import (EventCandidate, GateZoneConfig, PassLine, TrackedPerson,
                      Zone, near_gate_x)

GATE_CACHE_FRAMES = 60


def _save_clip(c: EventCandidate, buf, out_dir: str, fps: float,
               margin_s: float = 2.0) -> Optional[str]:
    m = int(fps * margin_s)
    frames = [f for fi, f in buf if c.start_frame - m <= fi <= c.end_frame + m]
    if not frames:
        return None
    name = f"{c.event_type}_{c.start_frame}_{'_'.join(str(t) for t in c.track_ids)}.mp4"
    path = str(Path(out_dir) / name)
    h, w = frames[0].shape[:2]
    writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))
    for f in frames:
        writer.write(f)
    writer.release()
    return path


def _update_cfg_from_gate(cfg: GateZoneConfig, gate: dict):
    gx1, gy1, gx2, gy2 = gate['x1'], gate['y1'], gate['x2'], gate['y2']
    gh = gy2 - gy1
    cfg.pass_line = PassLine(gx1, (gy1 + gy2) // 2, gx2, (gy1 + gy2) // 2)
    cfg.crawl_zone = Zone(gx1, int(gy1 + gh * 0.6), gx2, gy2)
    cfg.gate_zone = Zone(gx1, gy1, gx2, gy2)


def _draw_overlay(frame: np.ndarray, cfg: GateZoneConfig,
                  persons: List[TrackedPerson], gate_bbox=None,
                  jump_scores=None, remapper=None):
    z = cfg.crawl_zone
    cv2.rectangle(frame, (z.x1, z.y1), (z.x2, z.y2), (180, 0, 0), 1)
    cv2.putText(frame, 'CRAWL', (z.x1 + 2, z.y1 + 12),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 0, 0), 1)
    if gate_bbox:
        gx1, gy1, gx2, gy2 = gate_bbox['x1'], gate_bbox['y1'], gate_bbox['x2'], gate_bbox['y2']
        cv2.rectangle(frame, (gx1, gy1), (gx2, gy2), (0, 220, 220), 2)
        cv2.putText(frame, f"gate {gate_bbox['conf']:.2f}", (gx1, gy1 - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 220), 1, cv2.LINE_AA)
    else:
        cv2.putText(frame, 'gate: not found', (8, 48),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 80, 200), 1)
    for p in persons:
        score = (jump_scores or {}).get(p.track_id, 0.0)
        is_jumping = score >= 0.25
        color = (0, 0, 255) if is_jumping else (0, 200, 0)
        cv2.rectangle(frame, (int(p.x1), int(p.y1)), (int(p.x2), int(p.y2)),
                      color, 2 if is_jumping else 1)
        canonical = remapper.canonical(p.track_id) if remapper else p.track_id
        id_label = f'{canonical}' if canonical != p.track_id else f'{p.track_id}'
        label = f'ID:{id_label} J:{score:.2f}' if score > 0.05 else f'ID:{id_label}'
        cv2.putText(frame, label, (int(p.x1), int(p.y1) - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, color, 1)


def run_pipeline(
    video_path: str | int,
    cfg_base: GateZoneConfig,
    output_dir: str = 'pipeline_output',
    person_detector: Optional[YOLODetector] = None,
    gate_detector: Optional[GateDetector] = None,
    blur_faces: Optional[Callable] = None,
    verifier: Optional[EfficientNetVerifier] = None,
    conf: float = 0.4,
    gate_conf: float = 0.25,
    near_gate_margin: float = 0.2,
    jump_multiplier: float = 5.0,
    jump_min_score: float = 0.25,
    id_remap_frame_thresh: int = 15,
    verbose_rules: bool = False,
    max_events: Optional[int] = None,
    on_event: Optional[Callable[[EventCandidate], None]] = None,
    show: bool = False,
) -> Tuple[List[EventCandidate], list, dict]:
    """
    단일 영상(또는 카메라 소스)을 처리해 이벤트 후보 목록을 반환합니다.

    on_event : 이벤트 확정 시 호출되는 콜백 (백엔드 연동 등). 인자는 EventCandidate.
    show     : True면 cv2.imshow로 영상 출력.
    """
    Path(output_dir + '/clips').mkdir(parents=True, exist_ok=True)
    cfg = copy.deepcopy(cfg_base)

    # 모델이 전달되지 않으면 no-op으로 대체
    _blur = blur_faces if blur_faces is not None else (lambda f: f)

    tracker = sv.ByteTrack()
    remapper = IDRemapper(dist_thresh=80, frame_thresh=id_remap_frame_thresh)
    jump_detector = JumpDetector(
        window_frames=30, jump_ratio=0.30,
        calibration_frames=90,
        dynamic_multiplier=jump_multiplier,
        min_score=jump_min_score,
    )
    jump_triggered: set = set()
    jump_consec: dict = defaultdict(int)

    rules = {
        'crawling': CrawlingRule(cfg),
        'tailgating': TailgatingRule(cfg),
    }
    rules['tailgating'].debug = verbose_rules
    rules['crawling'].debug = verbose_rules

    diag_info = {
        'gate_found_frames': 0,
        'total_frames': 0,
        'unique_tids': set(),
        'id_switches': 0,
        'jump_peak_scores': {},
        'tail_max_streak': 0,
    }

    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    buf: deque = deque(maxlen=int(fps * 20))
    all_c: List[EventCandidate] = []
    ann_frames: list = []
    fi = 0
    cached_gate = None
    gate_cache_age = 0
    gate_calibrated = False
    prev_tids: set = set()

    src_name = os.path.basename(str(video_path)) if isinstance(video_path, str) else f'cam{video_path}'

    for _ in tqdm(range(total or 9999), desc=src_name, leave=False):
        ret, frame = cap.read()
        if not ret:
            break
        fi += 1
        buf.append((fi, frame.copy()))

        if max_events is not None and len(all_c) >= max_events:
            print(f'  [조기 종료] {max_events}건 달성 (frame={fi})')
            break

        clean = _blur(frame.copy())

        # person 탐지 + tracking
        if person_detector is not None:
            raw = person_detector.detect_persons(clean)
        else:
            raw = []

        if raw:
            xyxy = np.array([[d.x1, d.y1, d.x2, d.y2] for d in raw], dtype=float)
            sv_d = sv.Detections(xyxy=xyxy, confidence=np.array([d.confidence for d in raw]))
        else:
            sv_d = sv.Detections.empty()
        sv_d = tracker.update_with_detections(sv_d)
        persons = (
            [TrackedPerson(int(sv_d.tracker_id[i]), *[float(v) for v in sv_d.xyxy[i]])
             for i in range(len(sv_d))]
            if sv_d.tracker_id is not None else []
        )

        # ID switch 보정
        remapper.record_positions(persons)
        new_maps = remapper.update(fi, persons, prev_tids)
        for new_tid, old_tid in new_maps.items():
            jump_detector.transfer_history(old_tid, new_tid)
            if old_tid in jump_triggered:
                jump_triggered.add(new_tid)
        prev_tids = {p.track_id for p in persons}

        # gate bbox 탐지 + 캐시 + 좌표 자동 보정
        if gate_detector is not None and gate_detector.enabled:
            new_gate = gate_detector.detect_best(clean)
            if new_gate:
                cached_gate = new_gate
                gate_cache_age = 0
                diag_info['gate_found_frames'] += 1
                _update_cfg_from_gate(cfg, cached_gate)
                gate_h = cached_gate['y2'] - cached_gate['y1']
                jump_detector.set_gate_height(gate_h)
                if not gate_calibrated:
                    gate_calibrated = True
                    print(f'[{src_name}] gate 보정 → '
                          f'y={cfg.pass_line.y1}, '
                          f'jump_min={jump_detector._gate_min:.1f}px')
            else:
                gate_cache_age += 1
                if gate_cache_age > GATE_CACHE_FRAMES:
                    cached_gate = None

        # JumpDetector 업데이트
        active_tids: set = set()
        if sv_d.tracker_id is not None:
            for i, tid in enumerate(sv_d.tracker_id):
                tid = int(tid)
                active_tids.add(tid)
                diag_info['unique_tids'].add(remapper.canonical(tid))
                jump_detector.update(tid, sv_d.xyxy[i])
        jump_detector.cleanup(active_tids)
        jump_scores = {p.track_id: jump_detector.get_score(p.track_id) for p in persons}

        for p in persons:
            canon = remapper.canonical(p.track_id)
            sc = jump_scores.get(p.track_id, 0.0)
            if sc > diag_info['jump_peak_scores'].get(canon, 0.0):
                diag_info['jump_peak_scores'][canon] = sc
        if rules['tailgating']._pair_streak:
            diag_info['tail_max_streak'] = max(
                diag_info['tail_max_streak'],
                max(rules['tailgating']._pair_streak.values()))

        if verbose_rules and fi % 30 == 0 and persons:
            for p in persons:
                canon = remapper.canonical(p.track_id)
                jsc = jump_scores.get(p.track_id, 0.0)
                near_g = near_gate_x(p, cached_gate, 0.3)
                consec = jump_consec.get(canon, 0)
                in_trig = canon in jump_triggered
                print(f'  [VB] f={fi} ID={canon} ar={p.aspect_ratio:.2f} '
                      f'near_gate={near_g} jump_sc={jsc:.2f} '
                      f'consec={consec}/{cfg_base.jump_min_frames} triggered={in_trig}')

        cands: List[EventCandidate] = []

        # ── jump (3프레임 연속 is_jump=True일 때만 트리거) ───────────────────
        for p in persons:
            canonical = remapper.canonical(p.track_id)
            if canonical in jump_triggered:
                continue
            if jump_detector.is_jump(p.track_id) and near_gate_x(p, cached_gate, near_gate_margin):
                jump_consec[canonical] += 1
            else:
                jump_consec[canonical] = 0
            if jump_consec[canonical] < cfg_base.jump_min_frames:
                continue
            jump_triggered.add(canonical)
            score = jump_scores.get(p.track_id, 0.0)
            gate_info = (f'gate_filter=ON conf={cached_gate["conf"]:.2f}'
                         if cached_gate else 'gate_filter=OFF')
            cands.append(EventCandidate(
                'jump', fi, fi, [canonical],
                min(1.0, score / 0.5),
                f'Y(y2) score={score:.2f} consec=3 ({gate_info})'))

        # ── crawling / tailgating ────────────────────────────────────────────
        cands += rules['crawling'].update(fi, persons, cached_gate)
        cands += rules['tailgating'].update(fi, persons, fps, cached_gate)

        for c in cands:
            if max_events is not None and len(all_c) >= max_events:
                break
            clip_path = _save_clip(c, buf, output_dir + '/clips', fps)
            c.clip_path = clip_path

            # EfficientNet 2차 검증
            if verifier is not None and verifier.enabled:
                eff = verifier.verify(clip_path)
                c.efficientnet_result = eff
                if eff and eff['prediction'] == 'normal':
                    print(f'  [EFF✗] {c.event_type} → normal({eff["confidence"]:.2f}) 제거 '
                          + os.path.basename(clip_path or ''))
                    continue

            eff_tag = ''
            if c.efficientnet_result:
                e = c.efficientnet_result
                eff_tag = f' eff={e["prediction"]}({e["confidence"]:.2f})'

            all_c.append(c)
            print(f'  [{c.event_type}] frame={fi} tracks={c.track_ids} '
                  f'conf={c.confidence:.2f}{eff_tag} | {c.reason}')

            # 백엔드 콜백
            if on_event is not None:
                on_event(c)

            if show:
                vis = frame.copy()
                _draw_overlay(vis, cfg, persons, gate_bbox=cached_gate,
                              jump_scores=jump_scores, remapper=remapper)
                cv2.putText(vis, f'!! {c.event_type.upper()}', (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                ann_frames.append((fi, c.event_type, vis.copy()))

        if show:
            display = frame.copy()
            _draw_overlay(display, cfg, persons, gate_bbox=cached_gate,
                          jump_scores=jump_scores, remapper=remapper)
            cv2.imshow('GateGuard Pipeline', display)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    diag_info['total_frames'] = fi
    diag_info['id_switches'] = len(remapper._remap)

    if verbose_rules:
        gf = diag_info['gate_found_frames']
        print(f'  [DIAG] gate={gf}/{fi}f | '
              f'tracks={len(diag_info["unique_tids"])} | '
              f'id_sw={diag_info["id_switches"]}')
        pk = max(diag_info['jump_peak_scores'].values()) if diag_info['jump_peak_scores'] else 0.0
        print(f'  [DIAG] jump_peak={pk:.2f} | tail_max_streak={diag_info["tail_max_streak"]}')

    cap.release()
    if show:
        cv2.destroyAllWindows()

    events_path = str(Path(output_dir) / 'events.json')
    with open(events_path, 'w', encoding='utf-8') as f:
        json.dump([{
            'event_type': c.event_type,
            'start_frame': c.start_frame,
            'end_frame': c.end_frame,
            'track_ids': c.track_ids,
            'confidence': round(c.confidence, 4),
            'reason': c.reason,
            'status': c.status,
        } for c in all_c], f, indent=2, ensure_ascii=False)

    return all_c, ann_frames, diag_info
