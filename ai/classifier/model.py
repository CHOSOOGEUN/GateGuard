"""
EfficientNet-B0 기반 클립 분류 모델.

입력  : (B, T, 3, 224, 224)  — 클립당 T 프레임(기본 16)
출력  : (B, num_classes)

각 프레임을 ImageNet pretrained EfficientNet-B0 의 feature(1280-d)로 인코딩 →
시간축 평균 pooling → Dropout → FC. 베이스라인 구조이며 시간 모델링은 하지 않는다.
"""

from __future__ import annotations

import torch
import torch.nn as nn
from torchvision import models
from torchvision.models import EfficientNet_B0_Weights

FEATURE_DIM = 1280


class EfficientNetClipClassifier(nn.Module):
    def __init__(self, num_classes: int = 4, dropout: float = 0.3, pretrained: bool = True):
        super().__init__()
        weights = EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        backbone = models.efficientnet_b0(weights=weights)
        # classifier 직전까지 — features → adaptive avgpool 까지 사용, 마지막 FC 만 교체
        self.features = backbone.features
        self.avgpool = backbone.avgpool
        self.dropout = nn.Dropout(p=dropout)
        self.fc = nn.Linear(FEATURE_DIM, num_classes)

    def forward(self, clips: torch.Tensor) -> torch.Tensor:
        # clips: (B, T, 3, H, W)
        b, t = clips.shape[:2]
        x = clips.view(b * t, *clips.shape[2:])  # (B*T, 3, H, W)
        x = self.features(x)                     # (B*T, 1280, h, w)
        x = self.avgpool(x).flatten(1)           # (B*T, 1280)
        x = x.view(b, t, FEATURE_DIM).mean(dim=1)  # (B, 1280) — 시간축 평균 pooling
        x = self.dropout(x)
        return self.fc(x)                         # (B, num_classes)
