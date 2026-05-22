"""
GateGuard EfficientNet 베이스라인용 영상 클립 Dataset.

dataset 루트 구조:
    <data-root>/
        jump/        *.mp4
        crawling/    *.mp4
        tailgating/  *.mp4
        unpaid/      *.mp4

각 영상에서 균등 간격 16프레임을 추출해 (16, 3, 224, 224) 텐서로 반환한다.
train/val split 은 영상 단위로만 수행 (프레임 단위 누수 방지).
"""

from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

import cv2
import numpy as np
import torch
from torch.utils.data import Dataset
from torchvision import transforms

CLASSES = ("jump", "crawling", "tailgating", "unpaid")
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}
NUM_FRAMES = 16
FRAME_SIZE = 224

VIDEO_EXTS = (".mp4", ".mov", ".avi", ".mkv")

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


@dataclass(frozen=True)
class ClipSample:
    path: Path
    label: int


def _scan_clips(data_root: Path) -> list[ClipSample]:
    samples: list[ClipSample] = []
    for cls in CLASSES:
        cls_dir = data_root / cls
        if not cls_dir.is_dir():
            continue
        for p in sorted(cls_dir.iterdir()):
            if p.suffix.lower() in VIDEO_EXTS:
                samples.append(ClipSample(p, CLASS_TO_IDX[cls]))
    return samples


def split_video_level(
    samples: Sequence[ClipSample],
    val_ratio: float = 0.2,
    seed: int = 42,
) -> tuple[list[ClipSample], list[ClipSample]]:
    """클래스별로 stratify 한 영상 단위 split. 각 클래스에 최소 1개씩은 val 에 가도록 보장."""
    rng = random.Random(seed)
    by_cls: dict[int, list[ClipSample]] = defaultdict(list)
    for s in samples:
        by_cls[s.label].append(s)

    train, val = [], []
    for label, items in by_cls.items():
        items = list(items)
        rng.shuffle(items)
        n_val = max(1, int(round(len(items) * val_ratio))) if len(items) > 1 else 0
        val.extend(items[:n_val])
        train.extend(items[n_val:])
    rng.shuffle(train)
    rng.shuffle(val)
    return train, val


def class_weights(samples: Sequence[ClipSample]) -> torch.Tensor:
    """sklearn 'balanced' 와 동일한 공식 — n_samples / (n_classes * count[c])."""
    counts = np.zeros(len(CLASSES), dtype=np.float64)
    for s in samples:
        counts[s.label] += 1
    counts = np.where(counts == 0, 1.0, counts)
    weights = counts.sum() / (len(CLASSES) * counts)
    return torch.tensor(weights, dtype=torch.float32)


def _build_transform(train: bool) -> transforms.Compose:
    """공간 augmentation 만 적용 (시간축 augmentation 은 베이스라인 범위 밖)."""
    if train:
        return transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize(256),
            transforms.RandomResizedCrop(FRAME_SIZE, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])
    return transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize(256),
        transforms.CenterCrop(FRAME_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])


def _read_uniform_frames(path: Path, num_frames: int) -> np.ndarray:
    """opencv 로 영상을 열어 균등 간격 num_frames 개를 RGB ndarray (T,H,W,3) 로 반환."""
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"cannot open video: {path}")
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total <= 0:
        # 일부 컨테이너는 frame count 가 0 으로 나옴 — 순차 read 로 fallback
        frames = []
        while True:
            ok, f = cap.read()
            if not ok:
                break
            frames.append(f)
        cap.release()
        if not frames:
            raise RuntimeError(f"no readable frames: {path}")
        idxs = np.linspace(0, len(frames) - 1, num_frames).astype(int)
        picked = [frames[i] for i in idxs]
    else:
        idxs = np.linspace(0, max(total - 1, 0), num_frames).astype(int)
        picked = []
        last_good = None
        for i in idxs:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
            ok, f = cap.read()
            if not ok or f is None:
                if last_good is None:
                    continue
                f = last_good
            last_good = f
            picked.append(f)
        cap.release()
        if not picked:
            raise RuntimeError(f"no readable frames: {path}")
        # 부족하면 마지막 프레임 반복으로 패딩
        while len(picked) < num_frames:
            picked.append(picked[-1])

    rgb = [cv2.cvtColor(f, cv2.COLOR_BGR2RGB) for f in picked]
    return np.stack(rgb, axis=0)


class VideoClipDataset(Dataset):
    """클립 1개 → (16, 3, 224, 224) 텐서 + label."""

    def __init__(self, samples: Sequence[ClipSample], train: bool, num_frames: int = NUM_FRAMES):
        self.samples = list(samples)
        self.num_frames = num_frames
        self.transform = _build_transform(train=train)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        sample = self.samples[idx]
        frames = _read_uniform_frames(sample.path, self.num_frames)  # (T,H,W,3) uint8 RGB
        tensors = [self.transform(f) for f in frames]                 # each (3,224,224)
        clip = torch.stack(tensors, dim=0)                            # (T,3,224,224)
        return clip, sample.label


def build_datasets(
    data_root: str | Path,
    val_ratio: float = 0.2,
    seed: int = 42,
) -> tuple[VideoClipDataset, VideoClipDataset, list[ClipSample], list[ClipSample]]:
    root = Path(data_root)
    samples = _scan_clips(root)
    if not samples:
        raise RuntimeError(
            f"no video clips found under {root} — expected subfolders: {', '.join(CLASSES)}"
        )
    train_samples, val_samples = split_video_level(samples, val_ratio=val_ratio, seed=seed)
    return (
        VideoClipDataset(train_samples, train=True),
        VideoClipDataset(val_samples, train=False),
        train_samples,
        val_samples,
    )
