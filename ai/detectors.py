from __future__ import annotations
import os
from typing import Callable, Optional, List

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms

from ai.types import Detection


class YOLODetector:
    def __init__(self, model, conf_threshold: float = 0.4):
        self.model = model
        self.conf_threshold = conf_threshold

    def detect_persons(self, frame: np.ndarray) -> List[Detection]:
        results = self.model(frame, classes=[0], conf=self.conf_threshold, verbose=False)
        out = []
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                out.append(Detection(x1=x1, y1=y1, x2=x2, y2=y2, confidence=float(box.conf[0])))
        return out


class GateDetector:
    def __init__(self, model=None, conf_thres: float = 0.25):
        self.model = model
        self.conf_thres = conf_thres

    @property
    def enabled(self) -> bool:
        return self.model is not None

    def detect_best(self, frame: np.ndarray) -> Optional[dict]:
        if frame is None or self.model is None:
            return None
        h, w = frame.shape[:2]
        results = self.model.predict(source=frame, conf=self.conf_thres, verbose=False)
        dets = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                dets.append({
                    'x1': max(0, min(int(x1), w - 1)),
                    'y1': max(0, min(int(y1), h - 1)),
                    'x2': max(0, min(int(x2), w - 1)),
                    'y2': max(0, min(int(y2), h - 1)),
                    'conf': round(float(box.conf[0]), 4),
                })
        return max(dets, key=lambda d: d['conf']) if dets else None


def make_blur_faces(face_model) -> Callable:
    """얼굴 모델을 바인딩한 blur_faces 함수 반환. 모델이 None이면 원본 반환."""
    def blur_faces(frame: np.ndarray) -> np.ndarray:
        if face_model is None:
            return frame
        out = frame.copy()
        for r in face_model(frame, verbose=False):
            if r.boxes is None:
                continue
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                roi = out[y1:y2, x1:x2]
                if roi.size:
                    out[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (51, 51), 0)
        return out
    return blur_faces


# ── EfficientNet 2차 검증 ────────────────────────────────────────────────────
EFF_CLASSES = ("jump", "crawling", "tailgating", "unpaid", "normal")
EFF_NUM_FRAMES = 16


class _EfficientNetClipClassifier(nn.Module):
    def __init__(self, num_classes: int = 5):
        super().__init__()
        backbone = models.efficientnet_b0(weights=None)
        self.features = backbone.features
        self.avgpool = backbone.avgpool
        self.dropout = nn.Dropout(p=0.3)
        self.fc = nn.Linear(1280, num_classes)

    def forward(self, clips):
        b, t = clips.shape[:2]
        x = clips.view(b * t, *clips.shape[2:])
        x = self.features(x)
        x = self.avgpool(x).flatten(1)
        x = x.view(b, t, 1280).mean(dim=1)
        x = self.dropout(x)
        return self.fc(x)


_eff_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


class EfficientNetVerifier:
    """클립 영상 → 4+1 클래스 분류 (normal이면 FP로 간주)."""

    def __init__(self, checkpoint_path: Optional[str] = None,
                 conf_threshold: float = 0.50):
        self.conf_threshold = conf_threshold
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[_EfficientNetClipClassifier] = None

        if checkpoint_path and os.path.exists(checkpoint_path):
            self.model = _EfficientNetClipClassifier(num_classes=len(EFF_CLASSES)).to(self.device)
            ckpt = torch.load(checkpoint_path, map_location=self.device)
            self.model.load_state_dict(ckpt["model_state"])
            self.model.eval()
            print(f"[EfficientNet] 로드 완료: {checkpoint_path}")
        else:
            print(f"[EfficientNet] 체크포인트 없음 → 2차 검증 비활성화")

    @property
    def enabled(self) -> bool:
        return self.model is not None

    def verify(self, clip_path: Optional[str]) -> Optional[dict]:
        """클립 경로 → 분류 결과 dict. 모델 없거나 clip_path=None이면 None."""
        if self.model is None or clip_path is None:
            return None
        cap = cv2.VideoCapture(clip_path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total <= 0:
            cap.release()
            return None
        idxs = np.linspace(0, max(total - 1, 0), EFF_NUM_FRAMES).astype(int)
        frames = []
        for idx in idxs:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ok, f = cap.read()
            if ok and f is not None:
                frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
        cap.release()
        if not frames:
            return None
        while len(frames) < EFF_NUM_FRAMES:
            frames.append(frames[-1])
        tensors = [_eff_transform(f) for f in frames[:EFF_NUM_FRAMES]]
        clip = torch.stack(tensors, dim=0).unsqueeze(0).to(self.device)
        with torch.no_grad():
            probs = torch.softmax(self.model(clip), dim=1).squeeze(0).cpu().tolist()
        pred_idx = int(max(range(len(EFF_CLASSES)), key=lambda i: probs[i]))
        confidence = probs[pred_idx]
        return {
            "prediction": EFF_CLASSES[pred_idx] if confidence >= self.conf_threshold else "unknown",
            "confidence": round(confidence, 4),
            "probs": {c: round(probs[i], 4) for i, c in enumerate(EFF_CLASSES)},
        }
