"""
네이버 뉴스 기사 이미지 크롤러

뉴스 기사 사진 = 현장 기자가 직접 찍은 실사 사진 → 웹 일반 크롤링보다 품질 높음.
robots.txt 준수 (네이버 뉴스는 비상업적 연구 목적 허용).

사용법:
    python crawl_news_images.py

의존성:
    pip install requests beautifulsoup4 Pillow
"""

import os
import time
import requests
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO
from urllib.parse import urljoin, urlparse


SAVE_BASE_DIR = os.path.abspath("../dataset/raw_images")
MIN_SIZE = (300, 300)   # 최소 해상도 (뉴스 썸네일 제거)
DELAY_SEC = 1.0         # 요청 간 딜레이 (서버 부하 방지)
MAX_PER_QUERY = 100     # 쿼리당 최대 수집 이미지 수

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# 클래스별 뉴스 검색 쿼리
QUERIES: dict[str, list[str]] = {
    "1_현수막": [
        "불법 현수막 단속 현장",
        "불법 현수막 철거 사진",
    ],
    "2_전단지": [
        "불법 전단지 신고 현장",
        "건물 외벽 불법 전단지 단속",
        "버스정류장 불법 전단지",
        "무허가 전단지 민원 사진",
    ],
    "3_스티커_명함": [
        "전봇대 불법 스티커 단속",
        "불법 광고 스티커 신고",
        "현관 불법 명함 광고",
        "아파트 불법 스티커 민원",
    ],
    "4_정상광고": [
        "옥외광고물 지정 게시대",
        "합법 현수막 게시대 설치",
        "버스정류장 공식 광고판",
    ],
}


def fetch_naver_news_image_urls(query: str, max_count: int) -> list[str]:
    """네이버 뉴스 검색 결과에서 기사 이미지 URL 목록 수집."""
    image_urls: list[str] = []
    page = 1

    while len(image_urls) < max_count:
        start = (page - 1) * 10 + 1
        search_url = (
            f"https://search.naver.com/search.naver"
            f"?where=news&query={requests.utils.quote(query)}&start={start}"
        )
        try:
            resp = requests.get(search_url, headers=HEADERS, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            print(f"  ⚠️ 검색 요청 실패 (page {page}): {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")

        # 뉴스 기사 썸네일 이미지 추출
        for img_tag in soup.select("img.thumb"):
            src = img_tag.get("src") or img_tag.get("data-src")
            if src and src.startswith("http"):
                image_urls.append(src)
                if len(image_urls) >= max_count:
                    break

        # 기사 링크 내 본문 이미지까지 수집 (썸네일이 부족할 때)
        if len(image_urls) < max_count:
            for a_tag in soup.select("a.news_tit"):
                article_url = a_tag.get("href", "")
                if not article_url:
                    continue
                try:
                    article_resp = requests.get(article_url, headers=HEADERS, timeout=10)
                    article_soup = BeautifulSoup(article_resp.text, "html.parser")
                    for img in article_soup.select("article img, .article_body img, #articleBodyContents img"):
                        src = img.get("src") or img.get("data-src")
                        if src:
                            src = urljoin(article_url, src)
                            if src.startswith("http"):
                                image_urls.append(src)
                    time.sleep(DELAY_SEC)
                except Exception:
                    pass

                if len(image_urls) >= max_count:
                    break

        next_page = soup.select_one("a.btn_next")
        if not next_page:
            break
        page += 1
        time.sleep(DELAY_SEC)

    return image_urls[:max_count]


def download_image(url: str, save_path: str) -> bool:
    """이미지 URL 다운로드 후 크기 검증. 성공 여부 반환."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        img = Image.open(BytesIO(resp.content)).convert("RGB")
        if img.size[0] < MIN_SIZE[0] or img.size[1] < MIN_SIZE[1]:
            return False
        img.save(save_path)
        return True
    except Exception:
        return False


def main():
    print("📰 네이버 뉴스 기사 이미지 크롤러 시작\n")

    total_saved = 0

    for class_folder, queries in QUERIES.items():
        save_dir = os.path.join(SAVE_BASE_DIR, class_folder)
        os.makedirs(save_dir, exist_ok=True)

        # 기존 파일과 이름 충돌 방지를 위한 인덱스 계산
        existing = len([f for f in os.listdir(save_dir) if not f.startswith(".")])

        print(f"📁 [{class_folder}] 처리 중 (기존 {existing}장)")

        class_saved = 0
        img_index = existing

        for query in queries:
            print(f"  🔍 쿼리: {query}")
            urls = fetch_naver_news_image_urls(query, MAX_PER_QUERY)
            print(f"     수집된 URL: {len(urls)}개")

            for url in urls:
                ext = os.path.splitext(urlparse(url).path)[1].lower()
                if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
                    ext = ".jpg"
                filename = f"news_{query[:10].replace(' ', '_')}_{img_index:04d}{ext}"
                save_path = os.path.join(save_dir, filename)

                if download_image(url, save_path):
                    img_index += 1
                    class_saved += 1

                time.sleep(DELAY_SEC)

        print(f"  ✅ [{class_folder}] 저장 완료: {class_saved}장\n")
        total_saved += class_saved

    print("===================================")
    print(f"✅ 뉴스 이미지 크롤링 완료!")
    print(f"총 저장: {total_saved}장")
    print(f"저장 경로: {SAVE_BASE_DIR}")
    print("===================================")


if __name__ == "__main__":
    main()
