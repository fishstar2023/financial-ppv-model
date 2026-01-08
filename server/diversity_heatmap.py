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
GOOD_OPENINGS = {'說到這個', '唉', '你知道嗎', '講一個', '坦白說', '讓我想', '好，', '不知道', '這要從'}

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
    """生成完整的 HTML 熱力圖報告"""
    opening_data = generate_opening_heatmap_data(responses)
    question_diversity = generate_question_response_similarity_matrix(responses)
    persona_analysis = analyze_persona_style(responses)
    ngram_analysis = analyze_ngrams(responses, n=3)
    bigram_analysis = analyze_ngrams(responses, n=2)
    phrase_patterns = analyze_phrase_patterns(responses)
    time_trends = analyze_time_trends(responses)

    # 計算開頭頻率
    opening_freq = {}
    for opening in ALL_OPENINGS:
        count = opening_data['totals'].get(opening, 0)
        opening_freq[opening] = {
            'count': count,
            'percentage': round(count / len(responses) * 100, 1) if responses else 0,
            'status': 'banned' if opening in BANNED_OPENINGS else (
                'monitor' if opening in MONITOR_OPENINGS else 'good'
            )
        }

    # 排序問題多樣性（低多樣性優先）
    sorted_questions = sorted(
        question_diversity.items(),
        key=lambda x: x[1]['diversity_score']
    )

    html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>回答多樣性熱力圖分析</title>
    <style>
        * {{ box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #eee;
            padding: 20px;
            max-width: 1600px;
            margin: 0 auto;
        }}
        h1 {{ color: #00d9ff; text-align: center; }}
        h2 {{ color: #ff6b6b; border-bottom: 2px solid #ff6b6b; padding-bottom: 10px; margin-top: 40px; }}
        h3 {{ color: #ffd93d; margin-top: 25px; }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }}
        .stat-value {{
            font-size: 2.2em;
            font-weight: bold;
            color: #00d9ff;
        }}
        .stat-value.warning {{ color: #ff6b6b; }}
        .stat-value.good {{ color: #4ecdc4; }}
        .stat-label {{
            color: #888;
            margin-top: 5px;
            font-size: 0.9em;
        }}

        .heatmap-container {{
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            overflow-x: auto;
        }}

        .opening-bar {{
            display: flex;
            align-items: center;
            margin: 8px 0;
        }}
        .opening-label {{
            width: 100px;
            font-weight: bold;
        }}
        .opening-label.banned {{ color: #ff6b6b; }}
        .opening-label.monitor {{ color: #ffd93d; }}
        .opening-label.good {{ color: #4ecdc4; }}
        .opening-bar-fill {{
            height: 28px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding-left: 10px;
            color: #000;
            font-weight: bold;
            font-size: 0.9em;
        }}
        .bar-high {{ background: linear-gradient(90deg, #ff6b6b, #ff8e8e); }}
        .bar-medium {{ background: linear-gradient(90deg, #ffd93d, #ffe066); }}
        .bar-low {{ background: linear-gradient(90deg, #4ecdc4, #7ee8e0); }}

        .table-container {{
            overflow-x: auto;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 0.9em;
        }}
        th, td {{
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #333;
        }}
        th {{
            background: #0f3460;
            color: #00d9ff;
            white-space: nowrap;
        }}
        tr:hover {{
            background: #1f4068;
        }}

        .score-badge {{
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-weight: bold;
            font-size: 0.85em;
        }}
        .score-low {{ background: #ff6b6b; color: #000; }}
        .score-medium {{ background: #ffd93d; color: #000; }}
        .score-high {{ background: #4ecdc4; color: #000; }}

        .insight-box {{
            background: linear-gradient(135deg, #0f3460, #16213e);
            border-left: 4px solid #ff6b6b;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 12px 12px 0;
        }}
        .insight-box h4 {{ color: #ff6b6b; margin-top: 0; }}

        .recommendation {{
            background: linear-gradient(135deg, #1a4d1a, #16213e);
            border-left: 4px solid #4ecdc4;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 12px 12px 0;
        }}
        .recommendation h4 {{ color: #4ecdc4; margin-top: 0; }}

        .trend-box {{
            background: linear-gradient(135deg, #2d1b4e, #16213e);
            border-left: 4px solid #9d4edd;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 12px 12px 0;
        }}
        .trend-box h4 {{ color: #9d4edd; margin-top: 0; }}

        .ngram-cloud {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 15px;
        }}
        .ngram-tag {{
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 0.85em;
        }}
        .ngram-hot {{ background: #ff6b6b; color: #000; }}
        .ngram-warm {{ background: #ffd93d; color: #000; }}
        .ngram-cool {{ background: #4ecdc4; color: #000; }}

        .persona-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }}
        .persona-card {{
            background: #0f3460;
            border-radius: 12px;
            padding: 15px;
        }}
        .persona-name {{
            font-size: 1.1em;
            font-weight: bold;
            color: #00d9ff;
            margin-bottom: 10px;
        }}
        .persona-stat {{
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 0.9em;
        }}
        .persona-stat-label {{ color: #888; }}
        .persona-stat-value {{ font-weight: bold; }}

        .two-column {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }}
        @media (max-width: 900px) {{
            .two-column {{ grid-template-columns: 1fr; }}
        }}

        .nav-tabs {{
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }}
        .nav-tab {{
            padding: 10px 20px;
            background: #16213e;
            border: none;
            border-radius: 8px;
            color: #888;
            cursor: pointer;
            font-size: 0.9em;
        }}
        .nav-tab:hover {{ background: #1f4068; color: #eee; }}
        .nav-tab.active {{ background: #0f3460; color: #00d9ff; }}
    </style>
</head>
<body>
    <h1>📊 回答多樣性熱力圖分析</h1>
    <p style="text-align: center; color: #888;">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">{len(responses)}</div>
            <div class="stat-label">總回答數</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">{len(set(r['persona_name'] for r in responses))}</div>
            <div class="stat-label">受訪者數</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">{len(question_diversity)}</div>
            <div class="stat-label">不同問題數</div>
        </div>
        <div class="stat-card">
            <div class="stat-value{' warning' if opening_freq.get('其實', {}).get('percentage', 0) > 20 else ''}">{opening_freq.get('其實', {}).get('percentage', 0):.1f}%</div>
            <div class="stat-label">🚫「其實」開頭</div>
        </div>
        <div class="stat-card">
            <div class="stat-value{' warning' if opening_freq.get('嗯', {}).get('percentage', 0) > 15 else ''}">{opening_freq.get('嗯', {}).get('percentage', 0):.1f}%</div>
            <div class="stat-label">🚫「嗯」開頭</div>
        </div>
    </div>
"""

    # ===== 時間趨勢 =====
    if 'error' not in time_trends:
        improvement = time_trends['improvement']['banned_opening_change']
        improvement_class = 'good' if improvement > 0 else 'warning'
        html += f"""
    <div class="trend-box">
        <h4>📈 時間趨勢分析</h4>
        <p>資料期間: {time_trends['date_range']['start']} ~ {time_trends['date_range']['end']}</p>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{time_trends['early_period']['banned_opening_rate']}%</div>
                <div class="stat-label">前期禁止開頭率<br>({time_trends['early_period']['count']} 則)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{time_trends['later_period']['banned_opening_rate']}%</div>
                <div class="stat-label">後期禁止開頭率<br>({time_trends['later_period']['count']} 則)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value {improvement_class}">{'+' if improvement > 0 else ''}{improvement}%</div>
                <div class="stat-label">{'改善幅度 ✓' if improvement > 0 else '惡化幅度 ✗'}</div>
            </div>
        </div>
    </div>
"""

    # ===== 開頭用語分析 =====
    html += """
    <h2>🔤 開頭用語頻率分析</h2>
    <div class="heatmap-container">
        <p style="color: #888;">🚫 紅色 = 已禁止 | ⚠️ 黃色 = 監控中 | ✅ 綠色 = 好的開頭</p>
"""

    sorted_openings = sorted(opening_freq.items(), key=lambda x: x[1]['count'], reverse=True)
    for opening, data in sorted_openings:
        if data['count'] == 0:
            continue
        pct = data['percentage']
        status = data['status']
        bar_class = 'bar-high' if status == 'banned' else ('bar-medium' if status == 'monitor' else 'bar-low')
        label_class = status
        width = min(pct * 3, 100)

        html += f"""
        <div class="opening-bar">
            <div class="opening-label {label_class}">「{opening}」</div>
            <div class="opening-bar-fill {bar_class}" style="width: {width}%;">
                {data['count']} 次 ({pct}%)
            </div>
        </div>
"""

    html += """
    </div>
"""

    # ===== N-gram 詞頻雲 =====
    html += """
    <h2>🔠 常見詞組分析 (N-gram)</h2>
    <div class="two-column">
        <div class="heatmap-container">
            <h3>開頭常見 3-gram</h3>
            <div class="ngram-cloud">
"""
    for ngram, count in ngram_analysis['top_openings'][:15]:
        tag_class = 'ngram-hot' if count > 20 else ('ngram-warm' if count > 10 else 'ngram-cool')
        html += f'<span class="ngram-tag {tag_class}">{ngram} ({count})</span>\n'

    html += """
            </div>
        </div>
        <div class="heatmap-container">
            <h3>結尾常見 3-gram</h3>
            <div class="ngram-cloud">
"""
    for ngram, count in ngram_analysis['top_endings'][:15]:
        tag_class = 'ngram-hot' if count > 20 else ('ngram-warm' if count > 10 else 'ngram-cool')
        html += f'<span class="ngram-tag {tag_class}">{ngram} ({count})</span>\n'

    html += """
            </div>
        </div>
    </div>
"""

    # ===== 短語模式 =====
    if phrase_patterns:
        html += """
    <div class="heatmap-container">
        <h3>常見短語模式</h3>
        <div class="table-container">
            <table>
                <thead><tr><th>模式</th><th>出現次數</th><th>佔比</th></tr></thead>
                <tbody>
"""
        for pattern, count in list(phrase_patterns.items())[:10]:
            pct = round(count / len(responses) * 100, 1)
            html += f"<tr><td>{pattern}</td><td>{count}</td><td>{pct}%</td></tr>\n"

        html += """
                </tbody>
            </table>
        </div>
    </div>
"""

    # ===== Persona 個別分析 =====
    html += """
    <h2>👤 Persona 個別分析</h2>
    <div class="persona-grid">
"""
    # 按禁止開頭數量排序（問題最大的在前面）
    sorted_personas = sorted(
        persona_analysis.items(),
        key=lambda x: x[1]['banned_opening_count'],
        reverse=True
    )

    for persona_name, data in sorted_personas[:12]:
        banned_rate = round(data['banned_opening_count'] / max(data['response_count'], 1) * 100, 1)
        good_rate = round(data['good_opening_count'] / max(data['response_count'], 1) * 100, 1)
        badge_class = 'score-low' if banned_rate > 50 else ('score-medium' if banned_rate > 30 else 'score-high')

        html += f"""
        <div class="persona-card">
            <div class="persona-name">{persona_name}</div>
            <div class="persona-stat">
                <span class="persona-stat-label">回答數</span>
                <span class="persona-stat-value">{data['response_count']}</span>
            </div>
            <div class="persona-stat">
                <span class="persona-stat-label">平均長度</span>
                <span class="persona-stat-value">{data['avg_length']} 字</span>
            </div>
            <div class="persona-stat">
                <span class="persona-stat-label">🚫 禁止開頭使用率</span>
                <span class="persona-stat-value"><span class="score-badge {badge_class}">{banned_rate}%</span></span>
            </div>
            <div class="persona-stat">
                <span class="persona-stat-label">✅ 好開頭使用率</span>
                <span class="persona-stat-value">{good_rate}%</span>
            </div>
            <div class="persona-stat">
                <span class="persona-stat-label">正/負情感比</span>
                <span class="persona-stat-value">{data['sentiment_ratio']}</span>
            </div>
            <div class="persona-stat">
                <span class="persona-stat-label">用字豐富度</span>
                <span class="persona-stat-value">{data['unique_char_count']} 字</span>
            </div>
        </div>
"""

    html += """
    </div>
"""

    # ===== 問題多樣性排名 =====
    html += """
    <h2>📋 問題回答多樣性排名</h2>
    <div class="heatmap-container">
        <p style="color: #888;">多樣性分數越低 = 回答越相似（需要改進）</p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>問題</th>
                        <th>回答數</th>
                        <th>平均相似度</th>
                        <th>多樣性分數</th>
                    </tr>
                </thead>
                <tbody>
"""

    for question, data in sorted_questions[:15]:
        score = data['diversity_score']
        score_class = 'score-low' if score < 40 else ('score-medium' if score < 60 else 'score-high')

        html += f"""
                    <tr>
                        <td>{question}...</td>
                        <td>{data['response_count']}</td>
                        <td>{data['avg_similarity']}%</td>
                        <td><span class="score-badge {score_class}">{score}</span></td>
                    </tr>
"""

    html += """
                </tbody>
            </table>
        </div>
    </div>
"""

    # ===== 重複回答 =====
    html += """
    <h2>🔄 完全相同的回答</h2>
    <div class="heatmap-container">
        <p style="color: #ff6b6b;">這些回答完全相同，表示可能有緩存問題或 prompt 不夠隨機</p>
"""

    answer_hash = defaultdict(list)
    for resp in responses:
        key = resp['answer'][:100]
        answer_hash[key].append(resp)

    duplicates = [(k, v) for k, v in answer_hash.items() if len(v) > 1]

    if duplicates:
        html += "<ul>\n"
        for key, resps in duplicates[:10]:
            personas = [r['persona_name'] for r in resps]
            question = resps[0]['question'][:40]
            html += f"""
            <li>
                <strong>問題:</strong> {question}...<br>
                <strong>受訪者:</strong> {', '.join(personas)}<br>
                <strong>回答預覽:</strong> {key}...
            </li>
"""
        html += "</ul>\n"
    else:
        html += "<p style='color: #4ecdc4;'>✅ 未發現完全相同的回答</p>\n"

    html += """
    </div>
"""

    # ===== 改進建議 =====
    html += """
    <div class="recommendation">
        <h4>💡 改進建議</h4>
        <ol>
            <li><strong>減少固定開頭</strong>：在 prompt 中明確禁止「其實」「嗯」等高頻開頭詞</li>
            <li><strong>增加開頭變化</strong>：提供更多樣的開頭模板讓 AI 選擇</li>
            <li><strong>強化個性差異</strong>：不同 persona 應有明顯不同的說話風格</li>
            <li><strong>檢查緩存機制</strong>：相似度 100% 的回答可能是緩存問題</li>
            <li><strong>持續監控</strong>：定期重新執行此報告，追蹤改進效果</li>
        </ol>
    </div>

    <footer style="text-align: center; color: #666; margin-top: 40px; padding: 20px;">
        Generated by Response Diversity Analyzer v2.0
    </footer>
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
