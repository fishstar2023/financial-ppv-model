"""
回答多樣性分析工具
用於觀測 AI 生成回答的重複模式，找出需要改進的地方
"""
import json
import re
from typing import List, Dict, Any
from collections import Counter
from pathlib import Path


def load_all_responses() -> List[Dict[str, Any]]:
    """從 JSON 載入所有訪談回答"""
    db_file = Path("server/vietnam_personas.json")
    if not db_file.exists():
        return []

    with open(db_file, 'r', encoding='utf-8') as f:
        personas = json.load(f)

    responses = []
    for persona in personas:
        for record in persona.get('interviewHistory', []):
            responses.append({
                'persona_id': persona.get('id'),
                'persona_name': persona.get('lastName'),
                'question': record.get('question', ''),
                'answer': record.get('answer', ''),
                'timestamp': record.get('timestamp', '')
            })
    return responses


def analyze_opening_patterns(responses: List[Dict]) -> Dict[str, int]:
    """分析回答開頭的模式"""
    # 分類：🚫 = 已禁止, ⚠️ = 應監控, ✅ = 好的開頭
    patterns = {
        # 🚫 已禁止的高頻開頭
        '其實': 0,      # 🚫 BANNED - 37.7%
        '嗯': 0,        # 🚫 BANNED - 19.2%
        '哦': 0,        # 🚫 BANNED - 12.1%
        '欸': 0,        # 🚫 BANNED - 11.7%
        '那時候': 0,    # 🚫 BANNED
        # ⚠️ 應監控的開頭
        '當時': 0,
        '記得': 0,
        '說實話': 0,
        '大概': 0,
        '怎麼說': 0,
        '本來': 0,
        '老實說': 0,
        '就是': 0,
        '是我': 0,
        '我第一次': 0,
        # ✅ 好的多樣化開頭
        '說到這個': 0,
        '唉': 0,
        '你知道嗎': 0,
        '講一個': 0,
        '坦白說': 0,
        '讓我想': 0,
        '好，': 0,
        '不知道': 0,
        '這要從': 0,
    }

    for resp in responses:
        answer = resp['answer'].strip()
        if not answer:
            continue
        # 取前 20 個字
        opening = answer[:20]
        for pattern in patterns:
            if pattern in opening:
                patterns[pattern] += 1

    return dict(sorted(patterns.items(), key=lambda x: x[1], reverse=True))


def analyze_ending_patterns(responses: List[Dict]) -> Dict[str, int]:
    """分析回答結尾的模式"""
    patterns = {
        '值得': 0,
        '很值得': 0,
        '總之': 0,
        '學到': 0,
        '經驗': 0,
        '建議': 0,
        '下次': 0,
        '就這樣': 0,
        '吧': 0,
        '啦': 0,
        '哈哈': 0,
        '不確定': 0,
        '看看': 0,
        '再說': 0,
    }

    for resp in responses:
        answer = resp['answer'].strip()
        if not answer:
            continue
        # 取後 30 個字
        ending = answer[-30:] if len(answer) > 30 else answer
        for pattern in patterns:
            if pattern in ending:
                patterns[pattern] += 1

    return dict(sorted(patterns.items(), key=lambda x: x[1], reverse=True))


def analyze_sentiment_words(responses: List[Dict]) -> Dict[str, int]:
    """分析情感詞彙的使用"""
    positive_words = ['好', '棒', '方便', '快速', '推薦', '滿意', '不錯', '喜歡', '安心', '放心']
    negative_words = ['煩', '氣', '慢', '複雜', '麻煩', '難', '貴', '差', '爛', '討厭', '生氣', '失望']
    neutral_words = ['普通', '一般', '還好', '差不多', '都可以']

    counts = {
        'positive': Counter(),
        'negative': Counter(),
        'neutral': Counter()
    }

    for resp in responses:
        answer = resp['answer']
        for word in positive_words:
            if word in answer:
                counts['positive'][word] += answer.count(word)
        for word in negative_words:
            if word in answer:
                counts['negative'][word] += answer.count(word)
        for word in neutral_words:
            if word in answer:
                counts['neutral'][word] += answer.count(word)

    return {
        'positive': dict(counts['positive'].most_common(10)),
        'negative': dict(counts['negative'].most_common(10)),
        'neutral': dict(counts['neutral'].most_common(10)),
        'total_positive': sum(counts['positive'].values()),
        'total_negative': sum(counts['negative'].values()),
        'total_neutral': sum(counts['neutral'].values()),
    }


def analyze_structure_patterns(responses: List[Dict]) -> Dict[str, Any]:
    """分析回答結構模式"""
    # 檢測常見結構
    patterns = {
        'chronological': 0,  # 時間順序（第一次...然後...後來...）
        'comparison': 0,     # 比較型（跟...比起來）
        'problem_solution': 0,  # 問題解決型（遇到...然後解決）
        'list_style': 0,     # 列舉型（首先...其次...）
    }

    chronological_markers = ['第一次', '後來', '之後', '然後', '最後', '那時候', '現在']
    comparison_markers = ['比起', '相比', '不像', '跟', '和...不同']
    problem_markers = ['遇到', '問題', '困難', '解決', '處理']
    list_markers = ['首先', '第一', '其次', '第二', '再來', '最後']

    for resp in responses:
        answer = resp['answer']

        chron_count = sum(1 for m in chronological_markers if m in answer)
        if chron_count >= 2:
            patterns['chronological'] += 1

        comp_count = sum(1 for m in comparison_markers if m in answer)
        if comp_count >= 1:
            patterns['comparison'] += 1

        prob_count = sum(1 for m in problem_markers if m in answer)
        if prob_count >= 2:
            patterns['problem_solution'] += 1

        list_count = sum(1 for m in list_markers if m in answer)
        if list_count >= 2:
            patterns['list_style'] += 1

    return patterns


def analyze_answer_length(responses: List[Dict]) -> Dict[str, Any]:
    """分析回答長度分布"""
    lengths = [len(resp['answer']) for resp in responses if resp['answer']]

    if not lengths:
        return {}

    return {
        'min': min(lengths),
        'max': max(lengths),
        'avg': sum(lengths) / len(lengths),
        'median': sorted(lengths)[len(lengths) // 2],
        'distribution': {
            'short (<100)': sum(1 for l in lengths if l < 100),
            'medium (100-300)': sum(1 for l in lengths if 100 <= l < 300),
            'long (300-500)': sum(1 for l in lengths if 300 <= l < 500),
            'very_long (>500)': sum(1 for l in lengths if l >= 500),
        }
    }


def find_similar_responses(responses: List[Dict], threshold: float = 0.5) -> List[tuple]:
    """找出相似的回答（簡單的字符重疊比較）"""
    similar_pairs = []

    def simple_similarity(s1: str, s2: str) -> float:
        """計算兩個字串的簡單相似度（共同字符比例）"""
        if not s1 or not s2:
            return 0
        set1 = set(s1)
        set2 = set(s2)
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        return intersection / union if union > 0 else 0

    # 只比較同一問題的回答
    question_groups = {}
    for resp in responses:
        q = resp['question']
        if q not in question_groups:
            question_groups[q] = []
        question_groups[q].append(resp)

    for question, group in question_groups.items():
        if len(group) < 2:
            continue
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                sim = simple_similarity(group[i]['answer'], group[j]['answer'])
                if sim >= threshold:
                    similar_pairs.append({
                        'question': question[:50] + '...' if len(question) > 50 else question,
                        'persona1': group[i]['persona_name'],
                        'persona2': group[j]['persona_name'],
                        'similarity': round(sim, 3),
                        'answer1_preview': group[i]['answer'][:100] + '...',
                        'answer2_preview': group[j]['answer'][:100] + '...',
                    })

    return sorted(similar_pairs, key=lambda x: x['similarity'], reverse=True)[:20]


def generate_report() -> str:
    """生成完整的多樣性分析報告"""
    responses = load_all_responses()

    if not responses:
        return "沒有找到任何回答資料"

    report = []
    report.append("=" * 60)
    report.append("📊 回答多樣性分析報告")
    report.append("=" * 60)
    report.append(f"\n總回答數: {len(responses)}")

    # 1. 開頭模式分析
    report.append("\n" + "-" * 40)
    report.append("🔤 開頭用語分析 (前20字)")
    report.append("-" * 40)
    opening = analyze_opening_patterns(responses)
    for pattern, count in opening.items():
        if count > 0:
            pct = count / len(responses) * 100
            bar = "█" * int(pct / 5)
            report.append(f"  '{pattern}': {count} ({pct:.1f}%) {bar}")

    # 2. 結尾模式分析
    report.append("\n" + "-" * 40)
    report.append("🔚 結尾用語分析 (後30字)")
    report.append("-" * 40)
    ending = analyze_ending_patterns(responses)
    for pattern, count in ending.items():
        if count > 0:
            pct = count / len(responses) * 100
            bar = "█" * int(pct / 5)
            report.append(f"  '{pattern}': {count} ({pct:.1f}%) {bar}")

    # 3. 情感詞彙分析
    report.append("\n" + "-" * 40)
    report.append("💭 情感詞彙分析")
    report.append("-" * 40)
    sentiment = analyze_sentiment_words(responses)
    report.append(f"  正面詞總數: {sentiment['total_positive']}")
    report.append(f"  負面詞總數: {sentiment['total_negative']}")
    report.append(f"  中性詞總數: {sentiment['total_neutral']}")
    report.append(f"  正/負比: {sentiment['total_positive'] / max(sentiment['total_negative'], 1):.2f}")
    report.append("\n  Top 正面詞:")
    for word, count in sentiment['positive'].items():
        report.append(f"    {word}: {count}")
    report.append("\n  Top 負面詞:")
    for word, count in sentiment['negative'].items():
        report.append(f"    {word}: {count}")

    # 4. 結構模式分析
    report.append("\n" + "-" * 40)
    report.append("📐 回答結構模式")
    report.append("-" * 40)
    structure = analyze_structure_patterns(responses)
    for pattern, count in structure.items():
        pct = count / len(responses) * 100
        report.append(f"  {pattern}: {count} ({pct:.1f}%)")

    # 5. 長度分析
    report.append("\n" + "-" * 40)
    report.append("📏 回答長度分析")
    report.append("-" * 40)
    length = analyze_answer_length(responses)
    if length:
        report.append(f"  最短: {length['min']} 字")
        report.append(f"  最長: {length['max']} 字")
        report.append(f"  平均: {length['avg']:.1f} 字")
        report.append(f"  中位數: {length['median']} 字")
        report.append("\n  分布:")
        for bucket, count in length['distribution'].items():
            pct = count / len(responses) * 100
            bar = "█" * int(pct / 5)
            report.append(f"    {bucket}: {count} ({pct:.1f}%) {bar}")

    # 6. 相似回答
    report.append("\n" + "-" * 40)
    report.append("🔄 高度相似的回答 (相似度 > 50%)")
    report.append("-" * 40)
    similar = find_similar_responses(responses, threshold=0.5)
    if similar:
        for pair in similar[:10]:
            report.append(f"\n  [{pair['persona1']}] vs [{pair['persona2']}] - 相似度: {pair['similarity']}")
            report.append(f"  問題: {pair['question']}")
            report.append(f"  回答1: {pair['answer1_preview']}")
            report.append(f"  回答2: {pair['answer2_preview']}")
    else:
        report.append("  未發現高度相似的回答")

    report.append("\n" + "=" * 60)
    report.append("分析完成")
    report.append("=" * 60)

    return "\n".join(report)


if __name__ == "__main__":
    print(generate_report())
