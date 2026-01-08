"""
回答多樣性熱力圖視覺化工具
產生 HTML 熱力圖來觀察回答的重複模式

功能:
1. 開頭用語頻率分析
2. 問題回答多樣性排名
3. Persona 個別分析 (NEW)
4. N-gram 詞頻分析 (NEW)
5. 時間趨勢追蹤 (NEW)
"""
import json
import re
from typing import List, Dict, Any, Tuple
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime
from response_analyzer import load_all_responses


# ===== 禁止/監控/好的開頭詞 =====
BANNED_OPENINGS = {'其實', '嗯', '哦', '欸', '那時候'}
MONITOR_OPENINGS = {'當時', '記得', '說實話', '大概', '怎麼說', '本來', '老實說', '就是', '是我', '我第一次'}
GOOD_OPENINGS = {
    '說到這個', '唉', '你知道嗎', '講一個', '坦白說', '讓我想', '好，', '不知道', '這要從',
    '去年', '有一次', '哎呀', '天啊', '我跟你說', '怎麼說呢', '老實講', '簡單說', '你猜'
}

ALL_OPENINGS = list(BANNED_OPENINGS) + list(MONITOR_OPENINGS) + list(GOOD_OPENINGS)


def generate_opening_heatmap_data(responses: List[Dict]) -> Dict[str, Any]:
    """生成開頭用語的熱力圖資料"""
    persona_openings = defaultdict(lambda: defaultdict(int))
    persona_total = defaultdict(int)

    for resp in responses:
        persona = resp['persona_name']
        answer = resp['answer'].strip()[:20]
        persona_total[persona] += 1

        for opening in ALL_OPENINGS:
            if opening in answer:
                persona_openings[persona][opening] += 1

    return {
        'openings': ALL_OPENINGS,
        'personas': list(persona_openings.keys()),
        'data': {
            persona: {
                opening: count / max(persona_total[persona], 1) * 100
                for opening, count in counts.items()
            }
            for persona, counts in persona_openings.items()
        },
        'totals': {
            opening: sum(
                persona_openings[p].get(opening, 0)
                for p in persona_openings
            )
            for opening in ALL_OPENINGS
        }
    }


def generate_question_response_similarity_matrix(responses: List[Dict]) -> Dict[str, Any]:
    """生成問題-回答相似度矩陣"""
    # 按問題分組
    question_groups = defaultdict(list)
    for resp in responses:
        q = resp['question'][:50]
        question_groups[q].append(resp)

    # 計算每個問題的回答多樣性
    question_diversity = {}
    for question, resps in question_groups.items():
        if len(resps) < 2:
            continue

        # 計算所有回答之間的字符重疊
        total_sim = 0
        count = 0
        for i in range(len(resps)):
            for j in range(i + 1, len(resps)):
                set1 = set(resps[i]['answer'])
                set2 = set(resps[j]['answer'])
                sim = len(set1 & set2) / len(set1 | set2) if set1 | set2 else 0
                total_sim += sim
                count += 1

        avg_sim = total_sim / count if count > 0 else 0
        question_diversity[question] = {
            'response_count': len(resps),
            'avg_similarity': round(avg_sim * 100, 1),
            'diversity_score': round((1 - avg_sim) * 100, 1)
        }

    return question_diversity


# ===== NEW: Persona 個別分析 =====
def analyze_persona_style(responses: List[Dict]) -> Dict[str, Dict[str, Any]]:
    """分析每個 persona 的回答風格特徵"""
    persona_data = defaultdict(lambda: {
        'responses': [],
        'openings_used': Counter(),
        'endings_used': Counter(),
        'avg_length': 0,
        'sentiment_words': {'positive': 0, 'negative': 0},
        'unique_chars': set(),
    })

    positive_words = ['好', '棒', '方便', '快速', '推薦', '滿意', '不錯', '喜歡', '安心', '放心']
    negative_words = ['煩', '氣', '慢', '複雜', '麻煩', '難', '貴', '差', '爛', '討厭', '生氣', '失望']

    for resp in responses:
        persona = resp['persona_name']
        answer = resp['answer'].strip()

        persona_data[persona]['responses'].append(answer)

        # 分析開頭
        opening = answer[:15]
        for op in ALL_OPENINGS:
            if op in opening:
                persona_data[persona]['openings_used'][op] += 1

        # 分析結尾
        ending = answer[-20:] if len(answer) > 20 else answer
        ending_particles = ['啦', '吧', '喔', '呢', '耶', '哈哈', '對吧']
        for ep in ending_particles:
            if ep in ending:
                persona_data[persona]['endings_used'][ep] += 1

        # 情感詞
        for word in positive_words:
            persona_data[persona]['sentiment_words']['positive'] += answer.count(word)
        for word in negative_words:
            persona_data[persona]['sentiment_words']['negative'] += answer.count(word)

        # 用字多樣性
        persona_data[persona]['unique_chars'].update(set(answer))

    # 計算平均長度和多樣性指標
    result = {}
    for persona, data in persona_data.items():
        total_len = sum(len(r) for r in data['responses'])
        result[persona] = {
            'response_count': len(data['responses']),
            'avg_length': round(total_len / len(data['responses']), 1) if data['responses'] else 0,
            'top_openings': data['openings_used'].most_common(3),
            'top_endings': data['endings_used'].most_common(3),
            'sentiment_ratio': round(
                data['sentiment_words']['positive'] /
                max(data['sentiment_words']['negative'], 1), 2
            ),
            'unique_char_count': len(data['unique_chars']),
            'banned_opening_count': sum(
                data['openings_used'].get(op, 0) for op in BANNED_OPENINGS
            ),
            'good_opening_count': sum(
                data['openings_used'].get(op, 0) for op in GOOD_OPENINGS
            ),
        }

    return result


# ===== NEW: N-gram 分析 =====
def extract_ngrams(text: str, n: int = 2) -> List[str]:
    """從文字中提取 n-gram"""
    # 移除標點符號
    text = re.sub(r'[^\w\s]', '', text)
    # 按空白或字元切分（中文逐字）
    chars = list(text.replace(' ', ''))
    return [''.join(chars[i:i+n]) for i in range(len(chars) - n + 1)]


def analyze_ngrams(responses: List[Dict], n: int = 3) -> Dict[str, Any]:
    """分析回答中的常見 n-gram"""
    all_ngrams = Counter()
    opening_ngrams = Counter()  # 開頭 n-gram
    ending_ngrams = Counter()   # 結尾 n-gram

    for resp in responses:
        answer = resp['answer'].strip()

        # 全文 n-gram
        ngrams = extract_ngrams(answer, n)
        all_ngrams.update(ngrams)

        # 開頭 n-gram (前 30 字)
        opening = answer[:30]
        opening_ngrams.update(extract_ngrams(opening, n))

        # 結尾 n-gram (後 30 字)
        ending = answer[-30:] if len(answer) > 30 else answer
        ending_ngrams.update(extract_ngrams(ending, n))

    return {
        'n': n,
        'top_overall': all_ngrams.most_common(30),
        'top_openings': opening_ngrams.most_common(20),
        'top_endings': ending_ngrams.most_common(20),
    }


def analyze_phrase_patterns(responses: List[Dict]) -> Dict[str, int]:
    """分析常見短語模式"""
    patterns = [
        # 開頭模式
        (r'^其實[我是]', '「其實我/是...」開頭'),
        (r'^嗯[，,]', '「嗯，」開頭'),
        (r'^說實話', '「說實話」開頭'),
        (r'^怎麼說呢', '「怎麼說呢」開頭'),
        # 結尾模式
        (r'就這樣[吧啦]?$', '「就這樣」結尾'),
        (r'總之.{0,10}$', '「總之...」結尾'),
        (r'值得[的]?$', '「值得」結尾'),
        (r'哈哈[哈]*$', '「哈哈」結尾'),
        # 中間模式
        (r'跟你說', '使用「跟你說」'),
        (r'我覺得', '使用「我覺得」'),
        (r'然後就', '使用「然後就」'),
        (r'後來', '使用「後來」'),
    ]

    results = {}
    for pattern, name in patterns:
        count = sum(1 for r in responses if re.search(pattern, r['answer']))
        if count > 0:
            results[name] = count

    return dict(sorted(results.items(), key=lambda x: x[1], reverse=True))


# ===== NEW: 時間趨勢分析 =====
def analyze_time_trends(responses: List[Dict]) -> Dict[str, Any]:
    """分析回答隨時間的變化趨勢"""
    # 按時間排序
    dated_responses = []
    for resp in responses:
        ts = resp.get('timestamp', '')
        if ts:
            try:
                # 統一轉成 naive datetime（移除時區資訊）
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                dated_responses.append((dt, resp))
            except (ValueError, TypeError):
                pass

    if len(dated_responses) < 5:
        return {'error': '資料不足，無法分析時間趨勢'}

    dated_responses.sort(key=lambda x: x[0])

    # 分成前半和後半
    mid = len(dated_responses) // 2
    early = [r for _, r in dated_responses[:mid]]
    later = [r for _, r in dated_responses[mid:]]

    def calc_banned_rate(resps):
        count = 0
        for r in resps:
            opening = r['answer'][:15]
            if any(op in opening for op in BANNED_OPENINGS):
                count += 1
        return round(count / len(resps) * 100, 1) if resps else 0

    def calc_avg_length(resps):
        return round(sum(len(r['answer']) for r in resps) / len(resps), 1) if resps else 0

    return {
        'total_responses': len(dated_responses),
        'date_range': {
            'start': dated_responses[0][0].strftime('%Y-%m-%d'),
            'end': dated_responses[-1][0].strftime('%Y-%m-%d'),
        },
        'early_period': {
            'count': len(early),
            'banned_opening_rate': calc_banned_rate(early),
            'avg_length': calc_avg_length(early),
        },
        'later_period': {
            'count': len(later),
            'banned_opening_rate': calc_banned_rate(later),
            'avg_length': calc_avg_length(later),
        },
        'improvement': {
            'banned_opening_change': round(
                calc_banned_rate(early) - calc_banned_rate(later), 1
            ),
            'length_change': round(
                calc_avg_length(later) - calc_avg_length(early), 1
            ),
        }
    }


def generate_html_report(responses: List[Dict]) -> str:
    """生成簡潔的單頁儀表板報告"""
    opening_data = generate_opening_heatmap_data(responses)
    time_trends = analyze_time_trends(responses)

    # 計算關鍵指標
    total = len(responses)
    persona_count = len(set(r['persona_name'] for r in responses))

    # 禁止開頭使用統計
    banned_counts = {op: 0 for op in BANNED_OPENINGS}
    good_counts = {op: 0 for op in GOOD_OPENINGS}

    for resp in responses:
        opening = resp['answer'].strip()[:20]
        for op in BANNED_OPENINGS:
            if op in opening:
                banned_counts[op] += 1
        for op in GOOD_OPENINGS:
            if op in opening:
                good_counts[op] += 1

    total_banned = sum(banned_counts.values())
    total_good = sum(good_counts.values())
    banned_rate = round(total_banned / total * 100, 1) if total > 0 else 0
    good_rate = round(total_good / total * 100, 1) if total > 0 else 0

    # 排序
    sorted_banned = sorted(banned_counts.items(), key=lambda x: x[1], reverse=True)
    sorted_good = sorted(good_counts.items(), key=lambda x: x[1], reverse=True)

    # 時間趨勢
    trend_html = ""
    if 'error' not in time_trends:
        improvement = time_trends['improvement']['banned_opening_change']
        trend_icon = "📈" if improvement > 0 else "📉"
        trend_color = "#22c55e" if improvement > 0 else "#ef4444"
        trend_html = f"""
            <div style="background: {'#f0fdf4' if improvement > 0 else '#fef2f2'}; padding: 12px 16px; border-radius: 8px; margin-top: 16px;">
                <span style="color: {trend_color}; font-weight: 600;">{trend_icon} {'改善' if improvement > 0 else '惡化'} {abs(improvement)}%</span>
                <span style="color: #64748b; margin-left: 8px;">vs 前期</span>
            </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>回答多樣性儀表板</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 24px;
        }}
        .dashboard {{
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 32px;
            text-align: center;
        }}
        .header h1 {{
            font-size: 1.5em;
            font-weight: 600;
            margin-bottom: 8px;
        }}
        .header p {{
            color: #94a3b8;
            font-size: 0.9em;
        }}
        .content {{
            padding: 32px;
        }}

        /* 主要指標 */
        .metrics {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 32px;
        }}
        .metric {{
            text-align: center;
            padding: 20px;
            background: #f8fafc;
            border-radius: 12px;
        }}
        .metric-value {{
            font-size: 2.5em;
            font-weight: 700;
            color: #1e293b;
        }}
        .metric-value.bad {{ color: #dc2626; }}
        .metric-value.ok {{ color: #f59e0b; }}
        .metric-value.good {{ color: #16a34a; }}
        .metric-label {{
            color: #64748b;
            font-size: 0.85em;
            margin-top: 4px;
        }}

        /* 區塊標題 */
        .section-title {{
            font-size: 1em;
            font-weight: 600;
            color: #1e293b;
            margin: 24px 0 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        /* 問題列表 */
        .problem-list {{
            background: #fef2f2;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
        }}
        .problem-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #fecaca;
        }}
        .problem-item:last-child {{ border-bottom: none; }}
        .problem-word {{
            font-weight: 600;
            color: #991b1b;
        }}
        .problem-count {{
            background: #dc2626;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }}

        /* 好的開頭 */
        .good-list {{
            background: #f0fdf4;
            border-radius: 12px;
            padding: 20px;
        }}
        .good-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #bbf7d0;
        }}
        .good-item:last-child {{ border-bottom: none; }}
        .good-word {{
            font-weight: 600;
            color: #166534;
        }}
        .good-count {{
            background: #16a34a;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }}

        /* 建議 */
        .suggestion {{
            background: #eff6ff;
            border-radius: 12px;
            padding: 20px;
            margin-top: 24px;
        }}
        .suggestion-title {{
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 12px;
        }}
        .suggestion-text {{
            color: #1e3a8a;
            font-size: 0.9em;
            line-height: 1.6;
        }}

        .footer {{
            text-align: center;
            padding: 20px;
            color: #94a3b8;
            font-size: 0.8em;
            border-top: 1px solid #e2e8f0;
        }}
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>回答多樣性儀表板</h1>
            <p>{datetime.now().strftime('%Y-%m-%d %H:%M')} · {total} 則回答 · {persona_count} 位受訪者</p>
        </div>

        <div class="content">
            <!-- 主要指標 -->
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value{' bad' if banned_rate > 30 else ' ok' if banned_rate > 15 else ''}">{banned_rate}%</div>
                    <div class="metric-label">禁止開頭使用率</div>
                </div>
                <div class="metric">
                    <div class="metric-value{' good' if good_rate > 10 else ''}">{good_rate}%</div>
                    <div class="metric-label">好開頭使用率</div>
                </div>
                <div class="metric">
                    <div class="metric-value">{total}</div>
                    <div class="metric-label">總回答數</div>
                </div>
            </div>

            {trend_html}

            <!-- 禁止開頭統計 -->
            <div class="section-title">🚫 禁止開頭（需要減少）</div>
            <div class="problem-list">
"""

    for word, count in sorted_banned:
        if count > 0:
            pct = round(count / total * 100, 1)
            html += f"""
                <div class="problem-item">
                    <span class="problem-word">「{word}」</span>
                    <span class="problem-count">{count} 次 ({pct}%)</span>
                </div>
"""

    html += """
            </div>

            <!-- 好的開頭統計 -->
            <div class="section-title">✅ 好開頭（繼續保持）</div>
            <div class="good-list">
"""

    for word, count in sorted_good:
        if count > 0:
            pct = round(count / total * 100, 1)
            html += f"""
                <div class="good-item">
                    <span class="good-word">「{word}」</span>
                    <span class="good-count">{count} 次 ({pct}%)</span>
                </div>
"""

    if total_good == 0:
        html += """
                <div style="color: #64748b; text-align: center; padding: 20px;">
                    尚未偵測到好的開頭用語
                </div>
"""

    html += """
            </div>

            <!-- 建議 -->
            <div class="suggestion">
                <div class="suggestion-title">💡 下一步</div>
                <div class="suggestion-text">
                    重新生成訪談內容後，再次執行此報告檢查改善效果。<br>
                    目標：禁止開頭使用率 < 10%，好開頭使用率 > 20%
                </div>
            </div>
        </div>

        <div class="footer">
            Response Diversity Analyzer v3.0
        </div>
    </div>
</body>
</html>
"""

    return html


def save_report(output_path: str = "server/diversity_report.html"):
    """生成並儲存報告"""
    responses = load_all_responses()

    if not responses:
        print("沒有找到任何回答資料")
        return

    html = generate_html_report(responses)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"✅ 報告已儲存至: {output_path}")
    print(f"   請在瀏覽器中開啟查看熱力圖")


if __name__ == "__main__":
    save_report()
