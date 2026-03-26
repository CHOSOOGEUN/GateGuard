"""
AdCatch YOLOv8 학습 스크립트 (Google Colab Pro 용)

Colab에서 실행하기 전에:
    !pip install ultralytics

사용법:
    python train.py

또는 Colab 셀에서:
    %run train.py
"""

import os
from pathlib import Path
from ultralytics import YOLO


# ─── 설정 ────────────────────────────────────────────────────────────────────

YAML_PATH   = "adcatch.yaml"    # 데이터셋 설정 파일 (이 스크립트와 같은 위치)
MODEL       = "yolov8s.pt"      # 사전학습 가중치 (n < s < m < l < x 순으로 무거워짐)
                                 # 서버 추론이므로 속도보다 정확도 우선 → s 선택
EPOCHS      = 100
IMG_SIZE    = 640
BATCH       = 16                 # Colab Pro T4 기준 16이 안정적, 메모리 부족 시 8로 낮추기
PATIENCE    = 20                 # Early stopping: 20 epoch 동안 개선 없으면 조기 종료
PROJECT_DIR = "runs/adcatch"     # 결과 저장 디렉토리
RUN_NAME    = "v1"               # 실험 이름 (재학습 시 v2, v3 ... 으로 올리기)


# ─── 학습 ────────────────────────────────────────────────────────────────────

def main():
    yaml_abs = str(Path(__file__).parent / YAML_PATH)
    print(f"데이터셋 설정: {yaml_abs}")
    print(f"모델: {MODEL}  |  epochs: {EPOCHS}  |  imgsz: {IMG_SIZE}  |  batch: {BATCH}\n")

    model = YOLO(MODEL)

    results = model.train(
        data=yaml_abs,
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH,
        patience=PATIENCE,
        project=PROJECT_DIR,
        name=RUN_NAME,

        # 데이터 증강 (데이터 부족 보완 — mosaic이 핵심)
        mosaic=1.0,      # 4개 이미지 합성: 배경·위치 다양성 급증 (데이터 부족 시 필수)
        mixup=0.1,       # 두 이미지 혼합: 경계 케이스 학습
        degrees=15,      # 회전: 비스듬한 촬영 각도 대응
        fliplr=0.5,      # 좌우 반전
        hsv_s=0.7,       # 채도 변환: 날씨·조도 변화 대응
        hsv_v=0.4,       # 명도 변환: 밤/낮 대응
        blur=0.01,       # 블러: 흔들린 스마트폰 사진 대응

        # 학습 설정
        optimizer="AdamW",
        lr0=0.001,
        cos_lr=True,     # Cosine LR Scheduler (안정적 수렴)
        val=True,
        save=True,
        plots=True,      # Confusion matrix, PR curve 자동 생성
    )

    print("\n========== 학습 완료 ==========")
    print(f"최적 모델 저장 위치: {PROJECT_DIR}/{RUN_NAME}/weights/best.pt")
    print(f"mAP@0.5: {results.results_dict.get('metrics/mAP50(B)', 'N/A'):.4f}")
    print("================================")

    # 검증 세트 최종 평가
    print("\n[검증 세트 최종 평가]")
    model_best = YOLO(f"{PROJECT_DIR}/{RUN_NAME}/weights/best.pt")
    model_best.val(data=yaml_abs, imgsz=IMG_SIZE)


if __name__ == "__main__":
    main()
