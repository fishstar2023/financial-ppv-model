"""
URL 內容抓取工具
用於從網頁 URL 抓取內容，讓 AI 可以基於真實網頁內容回答問題
"""
import re
import requests
from typing import List, Dict, Optional, Tuple
from bs4 import BeautifulSoup
from urllib.parse import urlparse

# URL 正則表達式
URL_PATTERN = re.compile(
    r'https?://[^\s<>"{}|\\^`\[\]）】」』\)]+',
    re.IGNORECASE
)

def extract_urls(text: str) -> List[str]:
    """
    從文字中提取所有 URL

    Args:
        text: 要搜尋的文字

    Returns:
        URL 列表
    """
    if not text:
        return []

    urls = URL_PATTERN.findall(text)
    # 清理 URL 尾端可能的標點符號
    cleaned_urls = []
    for url in urls:
        # 移除尾端的標點符號
        url = url.rstrip('.,;:!?。，；：！？')
        if url and url not in cleaned_urls:
            cleaned_urls.append(url)

    return cleaned_urls


def fetch_url_content(url: str, max_length: int = 3000) -> Dict[str, any]:
    """
    抓取單一 URL 的內容

    Args:
        url: 要抓取的 URL
        max_length: 內容最大長度（字元數）

    Returns:
        包含抓取結果的字典：
        {
            "url": str,
            "success": bool,
            "title": str,
            "content": str,
            "error": str (if failed)
        }
    """
    result = {
        "url": url,
        "success": False,
        "title": "",
        "content": "",
        "error": None
    }

    try:
        # 設定 headers 模擬瀏覽器
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5,zh-TW;q=0.3',
        }

        # 發送請求 - 減少 timeout 到 5 秒
        response = requests.get(
            url,
            headers=headers,
            timeout=5,  # 從 10 秒減少到 5 秒
            allow_redirects=True
        )
        response.raise_for_status()

        # 確保正確處理編碼
        if response.encoding is None:
            response.encoding = 'utf-8'

        # 解析 HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        # 取得標題
        title_tag = soup.find('title')
        result["title"] = title_tag.get_text(strip=True) if title_tag else urlparse(url).netloc

        # 移除不需要的元素
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']):
            tag.decompose()

        # 嘗試找主要內容區
        main_content = None

        # 優先找 main, article 或特定 class
        for selector in ['main', 'article', '[role="main"]', '.main-content', '.content', '#content', '.article-body']:
            main_content = soup.select_one(selector)
            if main_content:
                break

        # 如果沒找到，使用 body
        if not main_content:
            main_content = soup.find('body') or soup

        # 提取文字內容
        text_content = main_content.get_text(separator='\n', strip=True)

        # 清理多餘空白行
        lines = [line.strip() for line in text_content.split('\n') if line.strip()]
        cleaned_content = '\n'.join(lines)

        # 限制長度
        if len(cleaned_content) > max_length:
            cleaned_content = cleaned_content[:max_length] + "\n\n[... 內容已截斷 ...]"

        result["content"] = cleaned_content
        result["success"] = True

    except requests.Timeout:
        result["error"] = "請求超時"
    except requests.RequestException as e:
        result["error"] = f"網路請求失敗: {str(e)}"
    except Exception as e:
        result["error"] = f"抓取失敗: {str(e)}"

    return result


def fetch_multiple_urls(urls: List[str], max_length_per_url: int = 2000) -> List[Dict]:
    """
    抓取多個 URL 的內容

    Args:
        urls: URL 列表
        max_length_per_url: 每個 URL 內容的最大長度

    Returns:
        抓取結果列表
    """
    results = []
    for url in urls[:5]:  # 最多抓取 5 個 URL
        result = fetch_url_content(url, max_length_per_url)
        results.append(result)
        print(f"  {'✓' if result['success'] else '✗'} {url[:60]}...")

    return results


def format_url_content_for_prompt(fetch_results: List[Dict]) -> str:
    """
    將抓取的網頁內容格式化為 AI prompt

    Args:
        fetch_results: fetch_multiple_urls 的回傳結果

    Returns:
        格式化的文字，可直接加入 prompt
    """
    if not fetch_results:
        return ""

    successful = [r for r in fetch_results if r['success']]

    if not successful:
        return ""

    content_sections = []

    for result in successful:
        section = f"""
---
📌 Website: {result['title']}
🔗 URL: {result['url']}

{result['content']}
---
"""
        content_sections.append(section)

    return f"""
# 📖 REAL WEBSITE CONTENT FOR YOUR REFERENCE:

The interviewer is asking about specific websites. Below is the ACTUAL content from those websites.
You should base your answers on what you SEE in this content, as if you really browsed these websites.

{"".join(content_sections)}

IMPORTANT: When answering questions about these websites, refer to the ACTUAL content above.
Share your genuine reactions and opinions as a Vietnamese consumer viewing these pages.
"""


def extract_and_fetch_urls(question: str, sub_questions: List[str] = None) -> Tuple[List[str], str]:
    """
    從問題中提取 URL 並抓取內容的便利函數

    Args:
        question: 主問題
        sub_questions: 子問題列表

    Returns:
        (urls, formatted_content) tuple
    """
    # 合併所有文字
    all_text = question
    if sub_questions:
        all_text += '\n' + '\n'.join(sub_questions)

    # 提取 URL
    urls = extract_urls(all_text)

    if not urls:
        return [], ""

    print(f"🌐 Found {len(urls)} URL(s) in question, fetching content...")

    # 抓取內容
    results = fetch_multiple_urls(urls)

    # 格式化為 prompt
    formatted = format_url_content_for_prompt(results)

    return urls, formatted


# 測試
if __name__ == "__main__":
    # 測試 URL 提取
    test_text = """
    請參考國泰產險的旅遊險網頁 https://www.cathay-ins.com.tw/cathayins/personal/travel/oversea_single_travel/product/
    以及這個頁面 https://www.cathay-ins.com.tw/cathayins/personal/travel/oversea_single_travel/faq/
    """

    urls = extract_urls(test_text)
    print(f"Found URLs: {urls}")

    # 測試內容抓取
    if urls:
        results = fetch_multiple_urls(urls)
        formatted = format_url_content_for_prompt(results)
        print("\n" + "="*50)
        print(formatted[:1000])
