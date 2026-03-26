"""
pHash(Perceptual Hash) 기반 중복 이미지 제거 스크립트

크롤링 특성상 동일 이미지가 여러 번 다운로드되는 경우가 많음.
pHash 거리 < 10 이면 중복으로 판단하고 하나만 남기고 삭제.

사용법:
    python deduplicate_images.py
"""

import os
from PIL import Image
import imagehash


HASH_THRESHOLD = 10  # 이 값 미만이면 중복으로 판단 (0=완전동일, 클수록 유사도 낮음)
DATASET_DIR = os.path.abspath("../dataset/raw_images")


def deduplicate_folder(folder_path: str) -> tuple[int, int]:
    """단일 폴더 내 중복 이미지 제거. (유지 수, 삭제 수) 반환."""
    image_exts = {".jpg", ".jpeg", ".png", ".webp"}
    files = [
        os.path.join(folder_path, f)
        for f in os.listdir(folder_path)
        if not f.startswith(".") and os.path.splitext(f)[1].lower() in image_exts
    ]

    seen: list[tuple[imagehash.ImageHash, str]] = []
    removed = 0

    for file_path in files:
        try:
            img = Image.open(file_path).convert("RGB")
            h = imagehash.phash(img)
        except Exception as e:
            print(f"  ⚠️ 읽기 실패 건너뜀 ({os.path.basename(file_path)}): {e}")
            continue

        is_duplicate = False
        for seen_hash, seen_path in seen:
            if abs(h - seen_hash) < HASH_THRESHOLD:
                print(f"  🗑️  중복 제거: {os.path.basename(file_path)} ≈ {os.path.basename(seen_path)}")
                os.remove(file_path)
                removed += 1
                is_duplicate = True
                break

        if not is_duplicate:
            seen.append((h, file_path))

    kept = len(seen)
    return kept, removed


def main():
    print("🔍 pHash 기반 중복 이미지 제거 시작")
    print(f"대상 경로: {DATASET_DIR}\n")

    if not os.path.exists(DATASET_DIR):
        print(f"❌ 데이터셋 폴더를 찾을 수 없습니다: {DATASET_DIR}")
        return

    total_kept = 0
    total_removed = 0

    for class_folder in sorted(os.listdir(DATASET_DIR)):
        class_path = os.path.join(DATASET_DIR, class_folder)
        if not os.path.isdir(class_path):
            continue

        print(f"📁 [{class_folder}] 처리 중...")
        kept, removed = deduplicate_folder(class_path)
        print(f"   유지: {kept}장 | 제거: {removed}장\n")
        total_kept += kept
        total_removed += removed

    print("===================================")
    print(f"✅ 중복 제거 완료!")
    print(f"최종 유지: {total_kept}장")
    print(f"총 제거:   {total_removed}장 ({total_removed / (total_kept + total_removed) * 100:.1f}%)")
    print("===================================")


if __name__ == "__main__":
    main()
