# EfficientNet-B0 Clip Classifier (베이스라인)

GateGuard 두 단계 파이프라인의 **2단계(클립 검증)** 베이스라인.
1단계 YOLO + tracking + rule 후처리는 `ai/inference.py` 그대로 유지된다. 이 모듈은
그 결과로 잘려 나온 후보 클립이 실제로 jump / crawling / tailgating / unpaid 중
무엇인지 검증하는 분류기.

## 구조

```
ai/classifier/
  dataset.py           — 영상 1개 → 균등 16프레임 → (16,3,224,224) 텐서, 영상 단위 split
  model.py             — EfficientNet-B0(pretrained) + 시간축 평균 pooling + FC(4)
  train.py             — AdamW + CE(class_weight balanced), early stop, val_loss 기준 best 저장
  evaluate.py          — best_model.pth 로 val 평가만 다시
  inference_video.py   — 단일 영상 → 4클래스 확률 + 예측
  requirements.txt     — torch/torchvision/opencv/sklearn
```

## 데이터셋

```
<data-root>/
  jump/        clip001.mp4 ...
  crawling/    clip001.mp4 ...
  tailgating/  clip001.mp4 ...
  unpaid/      clip001.mp4 ...
```

`<data-root>` 는 git 밖에 두고 학습 시 `--data-root` 로 지정 (예: `~/datasets/gateguard`).

## 명령

```bash
# 의존성
pip install -r ai/classifier/requirements.txt

# 학습 (루트에서 실행 — `python -m ai.classifier.train`)
python -m ai.classifier.train \
    --data-root ~/datasets/gateguard \
    --output-dir ai/classifier/runs/baseline \
    --epochs 50 --batch-size 8

# 평가만
python -m ai.classifier.evaluate \
    --data-root ~/datasets/gateguard \
    --checkpoint ai/classifier/runs/baseline/best_model.pth

# 단일 영상 추론
python -m ai.classifier.inference_video \
    --checkpoint ai/classifier/runs/baseline/best_model.pth \
    --video sample.mp4
```

## 설계 메모

- **시간 모델 없음** — 16프레임 평균 pooling. 데이터 적은 1차 베이스라인 의도.
  jump/crawling 처럼 정적 특징이 강한 클래스에 잘 맞는다. tailgating/unpaid 는
  결과 보고 frame-level attention pooling 등 작은 개선 후보 검토.
- **train/val split 은 영상 단위** (`dataset.split_video_level`). 프레임 단위 분할
  금지 — 누수.
- **class_weight='balanced' 자동** (CrossEntropyLoss 의 `weight=`). 클래스 불균형
  완화. 비활성하려면 `--no-class-weight`.
- **augmentation 은 spatial 만** (RandomResizedCrop, HFlip, ColorJitter). 시간축
  augmentation 은 베이스라인 범위 밖.
- **best 기준 = val_loss**. early stopping patience 기본 7.
- **YOLO 와 분리** — 기존 `ai/inference.py` 와 임포트 의존 없음. 통합 시
  `from ai.classifier.inference_video import predict_one` 로 호출.
