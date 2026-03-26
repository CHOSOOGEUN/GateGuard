import os
import ssl
import sys

# Python 3.13 이상에서 imghdr 모듈이 삭제되어 bing-image-downloader가 고장나는 이슈 우회 패치
try:
    import imghdr
except ImportError:
    import types
    import mimetypes
    imghdr = types.ModuleType('imghdr')
    def what(file, h=None):
        if hasattr(file, 'read'):
            return 'jpg'
        t, _ = mimetypes.guess_type(str(file))
        if t:
            return t.split('/')[-1]
        return 'jpg'
    imghdr.what = what
    sys.modules['imghdr'] = imghdr

from bing_image_downloader import downloader

# macOS 다운로드 중 SSL 인증서 에러 방지
ssl._create_default_https_context = ssl._create_unverified_context


def main():
    print("🚀 AdCatch 이미지 크롤링 스크립트 실행")
    
    # 1. 수집할 키워드 설정 (클래스별로 다양하게 추가)
    queries = [
        # [클래스 1: 현수막] — 이미 충분(420장), 뉴스 현장 사진 위주로만 추가
        "길거리 불법 현수막",
        "가로수 불법 현수막",
        "아파트 분양 게릴라 현수막",
        "현수막 철거 단속",
        "불법 현수막 단속 현장 사진",   # 뉴스 현장 사진 → 실사 품질 높음

        # [클래스 2: 전단지] — 부족(172장), 뉴스/민원 현장 키워드 집중 추가
        "아파트 벽면 불법 전단지",
        "길바닥 불법 전단지",
        "상가 벽면 전단지",
        "오토바이 대출 전단지",
        "건물 외벽 무허가 전단지",       # 신규
        "버스정류장 불법 전단지 부착",   # 신규
        "대출 전단지 길거리 단속",       # 신규: 뉴스 현장 사진
        "불법 전단지 신고 민원 사진",    # 신규: 민원 현장 사진

        # [클래스 3: 스티커/명함] — 부족(168장), 현장감 있는 키워드 추가
        "전봇대 불법 스티커",
        "차량 명함 광고",
        "오토바이 일수 명함",
        "가로등 대출 스티커",
        "현관문 불법 스티커",
        "현관문 불법 명함 광고",         # 신규
        "신용불량자 대출 전봇대 스티커", # 신규
        "불법 광고 스티커 단속 현장",    # 신규: 뉴스 현장 사진
        "아파트 불법 스티커 민원 사진",  # 신규: 민원 현장 사진

        # [클래스 4: 정상 광고 (대조군)] — 매우 부족(116장), 대폭 추가
        "합법 지정 게시대 현수막",
        "시청 현수막 지정 게시대",
        "옥외 지정 광고물 게시대",
        "합법 옥외광고물 게시대",         # 신규
        "버스정류장 공식 광고판",         # 신규
        "지하철역 공식 광고 게시판",      # 신규
        "지자체 승인 옥외광고물",         # 신규
    ]
    
    # 2. 키워드별 수집할 이미지 수 (기존 200 -> 전체 총합 약 2,000장에 맞추기 위해 70으로 조정)
    limit_per_query = 70
    
    # 3. 이미지가 저장될 기본 경로
    save_dir = "../dataset/raw_images"
    
    # 디렉토리가 없으면 생성 (bing_image_downloader가 생성하긴 하지만, 안전하게)
    os.makedirs(save_dir, exist_ok=True)
    
    for query in queries:
        print(f"\n====================================")
        print(f"📥 [{query}] (목표: {limit_per_query}장) 데이터 수집 시작...")
        print(f"====================================")
        
        # bing-image-downloader 모듈을 사용하여 다운로드 수행
        try:
            downloader.download(
                query, 
                limit=limit_per_query,  
                output_dir=save_dir, 
                adult_filter_off=False, 
                force_replace=False, 
                timeout=60, 
                verbose=True
            )
            print(f"✅ [{query}] 수집 완료!")
        except Exception as e:
            print(f"❌ [{query}] 수집 중 에러 발생: {e}")

    print("\n🎉 모든 데이터 수집 프로세스가 끝났습니다.")
    print(f"저장된 경로: {os.path.abspath(save_dir)}")

if __name__ == "__main__":
    main()
