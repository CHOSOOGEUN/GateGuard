"""
저장된 best_model.pth 로 dataset 평가만 다시 돌리는 헬퍼.

사용 예:
    python -m ai.classifier.evaluate \
        --data-root ~/datasets/gateguard \
        --checkpoint ai/classifier/runs/baseline/best_model.pth
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ai.classifier.dataset import CLASSES, build_datasets
from ai.classifier.model import EfficientNetClipClassifier
from ai.classifier.train import evaluate, pick_device, report_metrics


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--data-root", required=True)
    p.add_argument("--checkpoint", required=True)
    p.add_argument("--val-ratio", type=float, default=0.2)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--batch-size", type=int, default=8)
    p.add_argument("--num-workers", type=int, default=2)
    p.add_argument("--output", default=None, help="결과 JSON 저장 경로 (선택)")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    device = pick_device()

    _, val_ds, _, _ = build_datasets(args.data_root, val_ratio=args.val_ratio, seed=args.seed)
    val_loader = DataLoader(
        val_ds, batch_size=args.batch_size, shuffle=False,
        num_workers=args.num_workers, pin_memory=(device.type == "cuda"),
    )

    model = EfficientNetClipClassifier(num_classes=len(CLASSES), pretrained=False).to(device)
    ckpt = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(ckpt["model_state"])

    val_loss, val_acc, preds, targets = evaluate(
        model, val_loader, nn.CrossEntropyLoss(), device
    )
    metrics = report_metrics(targets, preds)

    print(f"[val] loss={val_loss:.4f} acc={val_acc:.4f} (n={len(val_ds)})")
    print("[confusion matrix] rows=true, cols=pred, order=" + ", ".join(CLASSES))
    for row in metrics["confusion_matrix"]:
        print("  " + " ".join(f"{v:5d}" for v in row))
    print("\n[classification report]")
    print(metrics["report_text"])

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({
            "val_loss": val_loss,
            "val_acc": val_acc,
            "confusion_matrix": metrics["confusion_matrix"],
            "classes": list(CLASSES),
            "report_text": metrics["report_text"],
        }, indent=2))
        print(f"[saved] {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
