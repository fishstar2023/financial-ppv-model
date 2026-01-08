"""
回答多樣性熱力圖視覺化工具
產生 HTML 熱力圖來觀察回答的重複模式
"""
import json
from typing import List, Dict, Any
from pathlib import Path
from collections import defaultdict
from response_analyzer import load_all_responses


def generate_opening_heatmap_data(responses: List[Dict]) -> Dict[str, Any]:
    """生成開頭用語的熱力圖資料"""
    # 追蹤每個 persona 使用每個開頭的次數
    # 🚫 已禁止的開頭標記為 BANNED
    openings = ['其實', '嗯', '哦', '欸', '那時候',  # 🚫 BANNED
                '當時', '記得', '說實話', '大概', '怎麼說', '本來', '老實說', '就是',
                '是我', '我第一次',  # ⚠️ 應監控
                '說到這個', '唉', '你知道嗎', '講一個', '坦白說', '讓我想', '好，']  # ✅ 好的開頭

    # 標記哪些是被禁止的
    banned_openings = {'其實', '嗯', '哦', '欸', '那時候'}

    persona_openings = defaultdict(lambda: defaultdict(int))
    persona_total = defaultdict(int)

    for resp in responses:
        persona = resp['persona_name']
        answer = resp['answer'].strip()[:20]
        persona_total[persona] += 1

        for opening in openings:
            if opening in answer:
                persona_openings[persona][opening] += 1

    return {
        'openings': openings,
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
            for opening in openings
        }
    }


def generate_question_response_similarity_matrix(responses: List[Dict]) -> Dict[str, Any]:
    """生成問題-回答相似度矩陣"""
    from response_analyzer import find_similar_responses

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


def generate_html_report(responses: List[Dict]) -> str:
    """生成完整的 HTML 熱力圖報告"""
    opening_data = generate_opening_heatmap_data(responses)
    question_diversity = generate_question_response_similarity_matrix(responses)

    # 計算開頭頻率
    opening_freq = {}
    for opening in opening_data['openings']:
        count = opening_data['totals'].get(opening, 0)
        opening_freq[opening] = {
            'count': count,
            'percentage': round(count / len(responses) * 100, 1) if responses else 0
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
            max-width: 1400px;
            margin: 0 auto;
        }}
        h1 {{ color: #00d9ff; text-align: center; }}
        h2 {{ color: #ff6b6b; border-bottom: 2px solid #ff6b6b; padding-bottom: 10px; }}
        h3 {{ color: #ffd93d; }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
            font-size: 2.5em;
            font-weight: bold;
            color: #00d9ff;
        }}
        .stat-label {{
            color: #888;
            margin-top: 5px;
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
            width: 80px;
            font-weight: bold;
            color: #ffd93d;
        }}
        .opening-bar-fill {{
            height: 30px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding-left: 10px;
            color: #000;
            font-weight: bold;
            transition: width 0.3s ease;
        }}
        .bar-high {{ background: linear-gradient(90deg, #ff6b6b, #ff8e8e); }}
        .bar-medium {{ background: linear-gradient(90deg, #ffd93d, #ffe066); }}
        .bar-low {{ background: linear-gradient(90deg, #4ecdc4, #7ee8e0); }}

        .diversity-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        .diversity-table th, .diversity-table td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #333;
        }}
        .diversity-table th {{
            background: #0f3460;
            color: #00d9ff;
        }}
        .diversity-table tr:hover {{
            background: #1f4068;
        }}

        .diversity-score {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
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
        .insight-box h4 {{
            color: #ff6b6b;
            margin-top: 0;
        }}

        .recommendation {{
            background: linear-gradient(135deg, #1a4d1a, #16213e);
            border-left: 4px solid #4ecdc4;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 12px 12px 0;
        }}
        .recommendation h4 {{
            color: #4ecdc4;
            margin-top: 0;
        }}
    </style>
</head>
<body>
    <h1>📊 回答多樣性熱力圖分析</h1>

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
            <div class="stat-value">{opening_freq.get('其實', {}).get('percentage', 0):.1f}%</div>
            <div class="stat-label">「其實」開頭佔比</div>
        </div>
    </div>

    <h2>🔤 開頭用語頻率分析</h2>
    <div class="heatmap-container">
        <p style="color: #888;">紅色 = 過度使用 (>20%), 黃色 = 中等 (10-20%), 綠色 = 正常 (<10%)</p>
"""

    # 排序並顯示開頭頻率
    sorted_openings = sorted(opening_freq.items(), key=lambda x: x[1]['count'], reverse=True)
    for opening, data in sorted_openings:
        if data['count'] == 0:
            continue
        pct = data['percentage']
        bar_class = 'bar-high' if pct > 20 else ('bar-medium' if pct > 10 else 'bar-low')
        width = min(pct * 3, 100)  # 縮放寬度

        html += f"""
        <div class="opening-bar">
            <div class="opening-label">「{opening}」</div>
            <div class="opening-bar-fill {bar_class}" style="width: {width}%;">
                {data['count']} 次 ({pct}%)
            </div>
        </div>
"""

    html += """
    </div>

    <div class="insight-box">
        <h4>🚨 問題發現</h4>
        <ul>
"""

    # 找出問題
    issues = []
    if opening_freq.get('其實', {}).get('percentage', 0) > 30:
        issues.append(f"「其實」開頭佔比高達 {opening_freq['其實']['percentage']}%，需要大幅減少")
    if opening_freq.get('嗯', {}).get('percentage', 0) > 15:
        issues.append(f"「嗯」開頭佔比 {opening_freq['嗯']['percentage']}%，過於頻繁")

    for issue in issues:
        html += f"            <li>{issue}</li>\n"

    if not issues:
        html += "            <li>開頭用語分布相對均衡</li>\n"

    html += """
        </ul>
    </div>

    <h2>📋 問題回答多樣性排名</h2>
    <div class="heatmap-container">
        <p style="color: #888;">多樣性分數越低 = 回答越相似（需要改進）</p>
        <table class="diversity-table">
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
                    <td><span class="diversity-score {score_class}">{score}</span></td>
                </tr>
"""

    html += """
            </tbody>
        </table>
    </div>

    <div class="recommendation">
        <h4>💡 改進建議</h4>
        <ol>
            <li><strong>減少固定開頭</strong>：在 prompt 中明確禁止「其實」「嗯」等高頻開頭詞</li>
            <li><strong>增加開頭變化</strong>：提供更多樣的開頭模板讓 AI 選擇</li>
            <li><strong>加入隨機元素</strong>：在 prompt 中加入隨機種子或情境變化</li>
            <li><strong>檢查緩存機制</strong>：相似度 100% 的回答可能是緩存問題</li>
            <li><strong>強化個性差異</strong>：讓不同 persona 的回答風格更明顯</li>
        </ol>
    </div>

    <h2>🔄 完全相同的回答</h2>
    <div class="heatmap-container">
        <p style="color: #ff6b6b;">這些回答完全相同，表示可能有緩存問題或 prompt 不夠隨機</p>
"""

    # 找出完全相同的回答
    from collections import defaultdict
    answer_hash = defaultdict(list)
    for resp in responses:
        # 用回答的前100字作為 key
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

    <footer style="text-align: center; color: #666; margin-top: 40px; padding: 20px;">
        Generated by Response Diversity Analyzer
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
