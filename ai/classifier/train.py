"""
EfficientNet-B0 클립 분류 베이스라인 학습 스크립트.

사용 예:
    python -m ai.classifier.train \
        --data-root ~/datasets/gateguard \
        --output-dir ai/classifier/runs/baseline \
        --epochs 50 --batch-size 8

특징:
- AdamW + CrossEntropyLoss(class_weight 자동, balanced)
- 영상 단위 train/val split (dataset.split_video_level)
- val loss 기준 best_model.pth 저장
- early stopping (patience 기본 7)
- epoch 별 train/val loss/acc 출력
- best 체크포인트로 최종 confusion matrix + classification report 출력
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ai.classifier.dataset import (
    CLASSES,
    build_datasets,
    class_weights,
)
from ai.classifier.model import EfficientNetClipClassifier


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--data-root", required=True, help="dataset 루트 (jump/, crawling/, ... 하위)")
    p.add_argument("--output-dir", default="ai/classifier/runs/baseline")
    p.add_argument("--epochs", type=int, default=50)
    p.add_argument("--batch-size", type=int, default=8)
    p.add_argument("--lr", type=float, default=1e-4)
    p.add_argument("--weight-decay", type=float, default=1e-4)
    p.add_argument("--val-ratio", type=float, default=0.2)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--patience", type=int, default=7, help="early stopping patience")
    p.add_argument("--num-workers", type=int, default=2)
    p.add_argument("--no-class-weight", action="store_true", help="class_weight 비활성")
    p.add_argument("--no-pretrained", action="store_true")
    return p.parse_args()


def set_seed(seed: int) -> None:
    import random
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def pick_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


@torch.no_grad()
def evaluate(model: nn.Module, loader: DataLoader, criterion: nn.Module, device: torch.device):
    model.eval()
    losses, correct, total = 0.0, 0, 0
    all_preds, all_targets = [], []
    for clips, labels in loader:
        clips = clips.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)
        logits = model(clips)
        loss = criterion(logits, labels)
        losses += loss.item() * labels.size(0)
        preds = logits.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)
        all_preds.append(preds.cpu().numpy())
        all_targets.append(labels.cpu().numpy())
    avg_loss = losses / max(total, 1)
    acc = correct / max(total, 1)
    preds_np = np.concatenate(all_preds) if all_preds else np.array([])
    targets_np = np.concatenate(all_targets) if all_targets else np.array([])
    return avg_loss, acc, preds_np, targets_np


def report_metrics(targets: np.ndarray, preds: np.ndarray) -> dict:
    from sklearn.metrics import classification_report, confusion_matrix
    cm = confusion_matrix(targets, preds, labels=list(range(len(CLASSES))))
    report = classification_report(
        targets,
        preds,
        labels=list(range(len(CLASSES))),
        target_names=list(CLASSES),
        zero_division=0,
        digits=4,
    )
    return {"confusion_matrix": cm.tolist(), "report_text": report}


def main() -> int:
    args = parse_args()
    set_seed(args.seed)
    device = pick_device()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    train_ds, val_ds, train_samples, val_samples = build_datasets(
        args.data_root, val_ratio=args.val_ratio, seed=args.seed
    )

    print(f"[device] {device}")
    print(f"[data]   train clips={len(train_ds)} | val clips={len(val_ds)}")
    print(f"[train counts] {Counter(s.label for s in train_samples)}")
    print(f"[val counts]   {Counter(s.label for s in val_samples)}")

    if len(val_ds) == 0:
        print("ERROR: val set is empty — 클래스당 최소 2개 클립 필요", file=sys.stderr)
        return 2

    train_loader = DataLoader(
        train_ds, batch_size=args.batch_size, shuffle=True,
        num_workers=args.num_workers, pin_memory=(device.type == "cuda"),
        drop_last=False,
    )
    val_loader = DataLoader(
        val_ds, batch_size=args.batch_size, shuffle=False,
        num_workers=args.num_workers, pin_memory=(device.type == "cuda"),
    )

    model = EfficientNetClipClassifier(
        num_classes=len(CLASSES), pretrained=not args.no_pretrained
    ).to(device)

    weights = None if args.no_class_weight else class_weights(train_samples).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    best_val_loss = float("inf")
    best_path = output_dir / "best_model.pth"
    history: list[dict] = []
    epochs_without_improve = 0

    for epoch in range(1, args.epochs + 1):
        model.train()
        t0 = time.time()
        running_loss, running_correct, running_total = 0.0, 0, 0
        for clips, labels in train_loader:
            clips = clips.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            optimizer.zero_grad()
            logits = model(clips)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * labels.size(0)
            preds = logits.argmax(dim=1)
            running_correct += (preds == labels).sum().item()
            running_total += labels.size(0)

        train_loss = running_loss / max(running_total, 1)
        train_acc = running_correct / max(running_total, 1)
        val_loss, val_acc, _, _ = evaluate(model, val_loader, criterion, device)
        elapsed = time.time() - t0

        improved = val_loss < best_val_loss - 1e-6
        if improved:
            best_val_loss = val_loss
            epochs_without_improve = 0
            torch.save({
                "model_state": model.state_dict(),
                "classes": list(CLASSES),
                "epoch": epoch,
                "val_loss": val_loss,
                "val_acc": val_acc,
            }, best_path)
        else:
            epochs_without_improve += 1

        marker = " *" if improved else ""
        print(
            f"epoch {epoch:3d}/{args.epochs} | "
            f"train loss={train_loss:.4f} acc={train_acc:.4f} | "
            f"val loss={val_loss:.4f} acc={val_acc:.4f} | "
            f"{elapsed:.1f}s{marker}"
        )
        history.append({
            "epoch": epoch,
            "train_loss": train_loss, "train_acc": train_acc,
            "val_loss": val_loss, "val_acc": val_acc,
        })

        if epochs_without_improve >= args.patience:
            print(f"[early stop] {args.patience} epochs without val_loss improvement")
            break

    # 최종: best 로드 후 평가
    print(f"\n[best] loading {best_path}")
    ckpt = torch.load(best_path, map_location=device)
    model.load_state_dict(ckpt["model_state"])
    val_loss, val_acc, preds, targets = evaluate(model, val_loader, criterion, device)
    metrics = report_metrics(targets, preds)
    print(f"\n[final val] loss={val_loss:.4f} acc={val_acc:.4f}")
    print("[confusion matrix] rows=true, cols=pred, order=" + ", ".join(CLASSES))
    for row in metrics["confusion_matrix"]:
        print("  " + " ".join(f"{v:5d}" for v in row))
    print("\n[classification report]")
    print(metrics["report_text"])

    (output_dir / "history.json").write_text(json.dumps(history, indent=2))
    (output_dir / "final_metrics.json").write_text(json.dumps({
        "val_loss": val_loss,
        "val_acc": val_acc,
        "confusion_matrix": metrics["confusion_matrix"],
        "classes": list(CLASSES),
    }, indent=2))
    (output_dir / "final_report.txt").write_text(metrics["report_text"])
    print(f"\n[saved] {best_path}")
    print(f"[saved] {output_dir / 'history.json'}")
    print(f"[saved] {output_dir / 'final_metrics.json'}")
    print(f"[saved] {output_dir / 'final_report.txt'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
