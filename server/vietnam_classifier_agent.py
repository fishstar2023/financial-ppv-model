"""
越南訪談回答分類 Agent
用於將自由文字回答分類為結構化選項，以便產生統計圖表
"""
import os
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.openai import OpenAIChat

load_dotenv()


def classify_responses(
    question: str,
    responses: List[Dict[str, Any]],
    classification_type: str = "auto"
) -> Dict[str, Any]:
    """
    將多個回答分類為結構化資料，用於圖表視覺化

    Args:
        question: 訪談問題
        responses: 回答列表，每個包含 persona info 和 answer
        classification_type: 分類類型
            - "auto": AI 自動判斷最適合的分類方式
            - "yes_no": 是/否/不確定
            - "sentiment": 正面/中立/負面
            - "custom": AI 自動建立合適的類別

    Returns:
        包含分類結果的字典：
        {
            "question": str,
            "classification_type": str,
            "recommended_chart": str,  # "pie" | "bar" | "horizontal_bar"
            "categories": [{"name": str, "count": int, "percentage": float, "color": str}],
            "details": [{"personaId": str, "personaName": str, "category": str, "reason": str}]
        }
    """
    if not responses:
        return {
            "question": question,
            "classification_type": classification_type,
            "recommended_chart": "pie",
            "categories": [],
            "details": []
        }

    # 建立回答摘要
    response_list = []
    for i, resp in enumerate(responses, 1):
        persona = resp.get('persona', {})
        name = f"{persona.get('lastName', 'Unknown')} {'先生' if persona.get('gender') == 'Male' else '小姐'}"
        answer = resp.get('answer', '')
        persona_id = persona.get('id', f'unknown_{i}')
        response_list.append({
            "index": i,
            "personaId": persona_id,
            "personaName": name,
            "answer": answer[:500]  # 限制長度
        })

    # 根據分類類型決定 prompt
    if classification_type == "yes_no":
        category_instruction = """
CLASSIFICATION CATEGORIES (use exactly these):
- "是" (Yes): The respondent clearly indicates YES or affirmative
- "否" (No): The respondent clearly indicates NO or negative
- "不確定" (Unclear): The answer is ambiguous or doesn't directly address the question

COLOR CODES (high-contrast palette):
- "是": "#6B8065" (deep moss green)
- "否": "#8b5a5a" (wine red)
- "不確定": "#c4a877" (golden sand)
"""
    elif classification_type == "sentiment":
        category_instruction = """
CLASSIFICATION CATEGORIES (use exactly these):
- "正面" (Positive): The respondent expresses positive sentiment, satisfaction, or approval
- "中立" (Neutral): The respondent is balanced or has mixed feelings
- "負面" (Negative): The respondent expresses dissatisfaction, concerns, or disapproval

COLOR CODES (high-contrast palette):
- "正面": "#6B8065" (deep moss green)
- "中立": "#c4a877" (golden sand)
- "負面": "#8b5a5a" (wine red)
"""
    else:  # auto or custom
        category_instruction = """
CLASSIFICATION APPROACH:
1. First, analyze all responses to understand the question type
2. Create 3-5 meaningful categories that best capture the response patterns
3. Categories should be mutually exclusive and collectively exhaustive
4. Use clear, concise category names in Traditional Chinese

CHART TYPE RECOMMENDATION:
Based on the question type, recommend one of:
- "pie": Best for yes/no questions, binary choices, or 2-3 categories showing proportions (e.g., "有無購買經驗")
- "bar": Best for comparison across 4+ categories, frequency questions, or rating scales (e.g., "旅遊頻率", "滿意程度")
- "horizontal_bar": Best for preference rankings, brand comparisons, or when category names are long (e.g., "最重要的功能", "偏好哪些品牌")

SUGGESTED COLOR PALETTE (use these HIGH-CONTRAST Morandi colors in order):
- "#6B8065" (deep moss green)
- "#8b5a5a" (wine red)
- "#7a95ab" (steel blue)
- "#c4a877" (golden sand)
- "#9a7b8c" (dusty mauve)
- "#5a7a7a" (teal)
- "#a5896a" (warm taupe)
- "#7d8a6b" (olive)

EXAMPLES:
- For "有無購買經驗" type questions: "有", "無", "考慮中" → recommend "pie"
- For "頻率" type questions: "經常", "偶爾", "很少", "從未" → recommend "bar"
- For "偏好" type questions: List the main preference options mentioned → recommend "horizontal_bar"
"""

    instructions = [
        "You are a response classifier for market research data.",
        "Your job is to categorize interview responses into meaningful groups for data visualization.",
        "",
        "OUTPUT FORMAT: Return ONLY valid JSON, no markdown, no explanation.",
        "",
        category_instruction,
        "",
        "JSON OUTPUT STRUCTURE:",
        '{',
        '  "classification_type": "the type used",',
        '  "recommended_chart": "pie|bar|horizontal_bar",',
        '  "categories": [',
        '    {"name": "類別名稱", "color": "#hexcolor"}',
        '  ],',
        '  "classifications": [',
        '    {"index": 1, "category": "類別名稱", "reason": "簡短理由"}',
        '  ]',
        '}',
        "",
        "RULES:",
        "- Return ONLY the JSON object, nothing else",
        "- Every response MUST be classified into exactly one category",
        "- Reasons should be brief (under 20 characters)",
        "- Category names should be in Traditional Chinese",
    ]

    classification_prompt = f"""
Question being analyzed:
{question}

Responses to classify:
{json.dumps(response_list, ensure_ascii=False, indent=2)}

Please classify each response and return the JSON result.
"""

    print(f"📊 [Classifier] Classifying {len(responses)} responses...")

    agent = Agent(
        model=OpenAIChat(id="gpt-4o", temperature=0.3),
        description="Response classifier for market research",
        instructions=instructions,
        markdown=False
    )

    try:
        response = agent.run(classification_prompt, stream=False)
        result_text = response.content.strip()

        # 清理可能的 markdown 標記
        if result_text.startswith('```'):
            result_text = result_text.split('\n', 1)[1]
        if result_text.endswith('```'):
            result_text = result_text.rsplit('\n', 1)[0]
        if result_text.startswith('json'):
            result_text = result_text[4:].strip()

        parsed = json.loads(result_text)

        # 統計各類別數量
        category_counts = {}
        for cat in parsed.get('categories', []):
            category_counts[cat['name']] = {'count': 0, 'color': cat.get('color', '#9E9E9E')}

        details = []
        for cls in parsed.get('classifications', []):
            idx = cls.get('index', 0)
            category = cls.get('category', '不確定')
            reason = cls.get('reason', '')

            if category in category_counts:
                category_counts[category]['count'] += 1

            # 找到對應的 persona 資訊
            if 0 < idx <= len(response_list):
                resp_info = response_list[idx - 1]
                details.append({
                    "personaId": resp_info['personaId'],
                    "personaName": resp_info['personaName'],
                    "category": category,
                    "reason": reason
                })

        # 計算百分比
        total = len(responses)
        categories = []
        for name, data in category_counts.items():
            categories.append({
                "name": name,
                "count": data['count'],
                "percentage": round(data['count'] / total * 100, 1) if total > 0 else 0,
                "color": data['color']
            })

        # 按數量排序
        categories.sort(key=lambda x: x['count'], reverse=True)

        # 取得推薦的圖表類型，預設為 pie
        recommended_chart = parsed.get('recommended_chart', 'pie')
        # 驗證圖表類型
        if recommended_chart not in ['pie', 'bar', 'horizontal_bar']:
            recommended_chart = 'pie'

        print(f"✓ [Classifier] Classified into {len(categories)} categories, chart: {recommended_chart}")

        return {
            "question": question,
            "classification_type": parsed.get('classification_type', classification_type),
            "recommended_chart": recommended_chart,
            "categories": categories,
            "details": details,
            "total": total
        }

    except json.JSONDecodeError as e:
        print(f"❌ [Classifier] JSON parse error: {e}")
        print(f"Raw response: {response.content[:500]}")
        return {
            "question": question,
            "classification_type": classification_type,
            "recommended_chart": "pie",
            "categories": [],
            "details": [],
            "error": f"JSON 解析失敗: {str(e)}"
        }
    except Exception as e:
        print(f"❌ [Classifier] Error: {e}")
        return {
            "question": question,
            "classification_type": classification_type,
            "recommended_chart": "pie",
            "categories": [],
            "details": [],
            "error": str(e)
        }


def classify_responses_multi_dimension(
    question: str,
    responses: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    多維度分類 - 自動識別問題中的多個面向，分別產生圖表

    例如問題「請概述自己的旅遊習慣與型態」包含：
    - 旅遊頻率
    - 旅遊型態（自助/跟團）
    - 旅伴類型
    - 預算範圍

    Returns:
        {
            "question": str,
            "dimensions": [
                {
                    "dimension_name": "旅遊頻率",
                    "recommended_chart": "bar",
                    "categories": [...],
                    "details": [...]
                },
                ...
            ]
        }
    """
    if not responses:
        return {
            "question": question,
            "dimensions": []
        }

    # 建立回答摘要
    response_list = []
    for i, resp in enumerate(responses, 1):
        persona = resp.get('persona', {})
        name = f"{persona.get('lastName', 'Unknown')} {'先生' if persona.get('gender') == 'Male' else '小姐'}"
        answer = resp.get('answer', '')
        persona_id = persona.get('id', f'unknown_{i}')
        response_list.append({
            "index": i,
            "personaId": persona_id,
            "personaName": name,
            "answer": answer[:800]  # 多維度需要更多內容
        })

    instructions = [
        "You are an expert market research analyst specializing in multi-dimensional response classification.",
        "",
        "Your task is to:",
        "1. Analyze the interview question to identify DISTINCT DIMENSIONS being asked",
        "2. For each dimension, classify all responses into meaningful categories",
        "",
        "OUTPUT FORMAT: Return ONLY valid JSON, no markdown, no explanation.",
        "",
        "DIMENSION IDENTIFICATION RULES:",
        "- Look for sub-questions separated by ■ or bullet points",
        "- Common dimensions: 頻率, 型態, 金額/預算, 偏好, 原因, 是否有經驗",
        "- Each dimension should have its own set of categories",
        "- Maximum 5 dimensions per question",
        "",
        "COLOR PALETTE (use these HIGH-CONTRAST colors, cycle through for each dimension):",
        '- "#6B8065" (deep moss green)',
        '- "#8b5a5a" (wine red)',
        '- "#7a95ab" (steel blue)',
        '- "#c4a877" (golden sand)',
        '- "#9a7b8c" (dusty mauve)',
        '- "#5a7a7a" (teal)',
        '- "#a5896a" (warm taupe)',
        '- "#7d8a6b" (olive)',
        "",
        "CHART TYPE PER DIMENSION:",
        '- "pie": For yes/no, binary choices, 2-3 categories',
        '- "bar": For frequency, scales, 4+ categories',
        '- "horizontal_bar": For preferences, rankings, long category names',
        "",
        "JSON OUTPUT STRUCTURE:",
        '{',
        '  "dimensions": [',
        '    {',
        '      "dimension_name": "維度名稱（如：旅遊頻率）",',
        '      "recommended_chart": "pie|bar|horizontal_bar",',
        '      "categories": [{"name": "類別", "color": "#hex"}],',
        '      "classifications": [{"index": 1, "category": "類別", "reason": "理由"}]',
        '    }',
        '  ]',
        '}',
        "",
        "RULES:",
        "- Return ONLY the JSON object",
        "- Every response MUST be classified for EACH dimension",
        "- If a response doesn't mention a dimension, classify as '未提及'",
        "- Category names in Traditional Chinese",
        "- Reasons should be brief (under 15 characters)",
    ]

    classification_prompt = f"""
Interview Question (may contain multiple sub-questions marked with ■):
{question}

Responses to analyze:
{json.dumps(response_list, ensure_ascii=False, indent=2)}

Please identify all dimensions in the question and classify each response for each dimension.
"""

    print(f"📊 [Multi-Classifier] Analyzing {len(responses)} responses for multiple dimensions...")

    agent = Agent(
        model=OpenAIChat(id="gpt-4o", temperature=0.3),
        description="Multi-dimensional response classifier",
        instructions=instructions,
        markdown=False
    )

    try:
        response = agent.run(classification_prompt, stream=False)
        result_text = response.content.strip()

        # 清理 markdown
        if result_text.startswith('```'):
            result_text = result_text.split('\n', 1)[1]
        if result_text.endswith('```'):
            result_text = result_text.rsplit('\n', 1)[0]
        if result_text.startswith('json'):
            result_text = result_text[4:].strip()

        parsed = json.loads(result_text)

        # 處理每個維度
        processed_dimensions = []
        total = len(responses)

        for dim in parsed.get('dimensions', []):
            dim_name = dim.get('dimension_name', '未命名維度')

            # 統計類別
            category_counts = {}
            for cat in dim.get('categories', []):
                category_counts[cat['name']] = {'count': 0, 'color': cat.get('color', '#9E9E9E')}

            details = []
            for cls in dim.get('classifications', []):
                idx = cls.get('index', 0)
                category = cls.get('category', '未提及')
                reason = cls.get('reason', '')

                if category in category_counts:
                    category_counts[category]['count'] += 1
                elif category == '未提及':
                    if '未提及' not in category_counts:
                        category_counts['未提及'] = {'count': 0, 'color': '#b0b0b0'}
                    category_counts['未提及']['count'] += 1

                if 0 < idx <= len(response_list):
                    resp_info = response_list[idx - 1]
                    details.append({
                        "personaId": resp_info['personaId'],
                        "personaName": resp_info['personaName'],
                        "category": category,
                        "reason": reason
                    })

            # 計算百分比
            categories = []
            for name, data in category_counts.items():
                if data['count'] > 0:  # 只包含有資料的類別
                    categories.append({
                        "name": name,
                        "count": data['count'],
                        "percentage": round(data['count'] / total * 100, 1) if total > 0 else 0,
                        "color": data['color']
                    })

            categories.sort(key=lambda x: x['count'], reverse=True)

            recommended_chart = dim.get('recommended_chart', 'bar')
            if recommended_chart not in ['pie', 'bar', 'horizontal_bar']:
                recommended_chart = 'bar'

            processed_dimensions.append({
                "dimension_name": dim_name,
                "recommended_chart": recommended_chart,
                "categories": categories,
                "details": details,
                "total": total
            })

        print(f"✓ [Multi-Classifier] Found {len(processed_dimensions)} dimensions")

        return {
            "question": question,
            "dimensions": processed_dimensions
        }

    except json.JSONDecodeError as e:
        print(f"❌ [Multi-Classifier] JSON parse error: {e}")
        # Fallback 到單維度分類
        return {
            "question": question,
            "dimensions": [],
            "error": f"JSON 解析失敗: {str(e)}"
        }
    except Exception as e:
        print(f"❌ [Multi-Classifier] Error: {e}")
        return {
            "question": question,
            "dimensions": [],
            "error": str(e)
        }


# 測試
if __name__ == "__main__":
    test_responses = [
        {
            'persona': {
                'id': 'test1',
                'lastName': 'Nguyễn',
                'gender': 'Female',
            },
            'answer': '有喔，我身邊很多朋友都會自己買旅遊險，尤其是去日本玩的時候。'
        },
        {
            'persona': {
                'id': 'test2',
                'lastName': 'Trần',
                'gender': 'Male',
            },
            'answer': '沒有欸，我認識的人都是跟團的時候旅行社會包含保險，很少人會自己另外買。'
        },
        {
            'persona': {
                'id': 'test3',
                'lastName': 'Lê',
                'gender': 'Female',
            },
            'answer': '我自己會買，但身邊的朋友大部分都覺得不需要，他們覺得信用卡刷機票就有附贈了。'
        }
    ]

    result = classify_responses(
        "身邊是否有人會自行購買旅遊險？",
        test_responses,
        "yes_no"
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
