import os
import shutil

def organize_by_class(raw_dir):
    print("📦 기존의 너무 잘게 쪼개진 16개 검색어 폴더를 -> M1 목표인 4개 핵심 클래스 폴더로 병합합니다!")
    
    # CLAUDE.md에 정의된 1단계 탐지 카테고리 (현수막, 전단지, 스티커/명함, 정상)
    category_map = {
        "1_현수막": [
            "길거리 불법 현수막", "가로수 불법 현수막", "아파트 분양 게릴라 현수막", 
            "현수막 철거 단속", "불법 현수막 단속 현장 사진"
        ],
        "2_전단지": [
            "아파트 벽면 불법 전단지", "길바닥 불법 전단지", "상가 벽면 전단지", 
            "오토바이 대출 전단지", "건물 외벽 무허가 전단지", "버스정류장 불법 전단지 부착", 
            "대출 전단지 길거리 단속", "불법 전단지 신고 민원 사진"
        ],
        "3_스티커_명함": [
            "전봇대 불법 스티커", "차량 명함 광고", "오토바이 일수 명함", 
            "가로등 대출 스티커", "현관문 불법 스티커", "현관문 불법 명함 광고", 
            "신용불량자 대출 전봇대 스티커", "불법 광고 스티커 단속 현장", "아파트 불법 스티커 민원 사진"
        ],
        "4_정상광고": [
            "합법 지정 게시대 현수막", "시청 현수막 지정 게시대", "옥외 지정 광고물 게시대", 
            "합법 옥외광고물 게시대", "버스정류장 공식 광고판", "지하철역 공식 광고 게시판", 
            "지자체 승인 옥외광고물"
        ]
    }
    
    moved_count = 0
    
    for class_name, keywords in category_map.items():
        class_dir = os.path.join(raw_dir, class_name)
        os.makedirs(class_dir, exist_ok=True)
        
        for keyword in keywords:
            keyword_dir = os.path.join(raw_dir, keyword)
            if os.path.exists(keyword_dir):
                for file in os.listdir(keyword_dir):
                    src_file = os.path.join(keyword_dir, file)
                    
                    # 파일명 중복을 막기 위해 앞에 원본 키워드를 붙여서 이동
                    # 예: image_1.jpg -> 길거리 불법 현수막_image_1.jpg
                    if not file.startswith(keyword):
                        new_filename = f"{keyword}_{file}"
                    else:
                        new_filename = file
                        
                    dst_file = os.path.join(class_dir, new_filename)
                    
                    try:
                        shutil.move(src_file, dst_file)
                        moved_count += 1
                    except Exception as e:
                        pass
                
                # 파일이 전부 병합되었으면 기존 키워드 빈 폴더는 삭제
                try:
                    os.rmdir(keyword_dir)
                except OSError:
                    pass # 폴더가 안 비워졌으면(ex: .DS_Store) 무시
                    
    print(f"\n✅ 깔끔하게 병합 성공! 총 {moved_count}개의 이미지가 핵심 4개 클래스 폴더로 합쳐졌습니다.")

if __name__ == "__main__":
    raw_images_path = os.path.abspath("../dataset/raw_images")
    if os.path.exists(raw_images_path):
        organize_by_class(raw_images_path)
    else:
        print(f"❌ 데이터 폴더를 찾을 수 없습니다: {raw_images_path}")
