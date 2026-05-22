"""
단일 영상 추론. YOLO 후보 클립을 EfficientNet 으로 검증할 때 호출 진입점이 된다.

사용 예:
    python -m ai.classifier.inference_video \
        --checkpoint ai/classifier/runs/baseline/best_model.pth \
        --video sample.mp4

출력:
    {"video": "...", "prediction": "tailgating",
     "probs": {"jump": 0.05, "crawling": 0.10, "tailgating": 0.70, "unpaid": 0.15}}
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch

from ai.classifier.dataset import (
    CLASSES,
    NUM_FRAMES,
    _build_transform,
    _read_uniform_frames,
)
from ai.classifier.model import EfficientNetClipClassifier
from ai.classifier.train import pick_device


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--checkpoint", required=True)
    p.add_argument("--video", required=True)
    p.add_argument("--num-frames", type=int, default=NUM_FRAMES)
    p.add_argument("--json", action="store_true", help="JSON 만 출력 (스크립트 연동용)")
    return p.parse_args()


def predict_one(model: torch.nn.Module, video_path: Path, num_frames: int, device: torch.device) -> dict:
    transform = _build_transform(train=False)
    frames = _read_uniform_frames(video_path, num_frames)
    tensors = [transform(f) for f in frames]
    clip = torch.stack(tensors, dim=0).unsqueeze(0).to(device)  # (1, T, 3, 224, 224)

    model.eval()
    with torch.no_grad():
        logits = model(clip)
        probs = torch.softmax(logits, dim=1).squeeze(0).cpu().tolist()
    pred_idx = int(max(range(len(CLASSES)), key=lambda i: probs[i]))
    return {
        "video": str(video_path),
        "prediction": CLASSES[pred_idx],
        "probs": {c: float(probs[i]) for i, c in enumerate(CLASSES)},
    }


def main() -> int:
    args = parse_args()
    device = pick_device()

    model = EfficientNetClipClassifier(num_classes=len(CLASSES), pretrained=False).to(device)
    ckpt = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(ckpt["model_state"])

    result = predict_one(model, Path(args.video), args.num_frames, device)
    if args.json:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(f"video      : {result['video']}")
        print(f"prediction : {result['prediction']}")
        print("probs:")
        for c, p in result["probs"].items():
            print(f"  {c:10s} {p:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
