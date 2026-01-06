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

COLOR CODES (coordinated green-blue palette):
- "是": "#6B8065" (deep moss)
- "否": "#A5B5BF" (steel blue)
- "不確定": "#B5C4B1" (pale sage)
"""
    elif classification_type == "sentiment":
        category_instruction = """
CLASSIFICATION CATEGORIES (use exactly these):
- "正面" (Positive): The respondent expresses positive sentiment, satisfaction, or approval
- "中立" (Neutral): The respondent is balanced or has mixed feelings
- "負面" (Negative): The respondent expresses dissatisfaction, concerns, or disapproval

COLOR CODES (coordinated green-blue palette):
- "正面": "#6B8065" (deep moss)
- "中立": "#8B9EB7" (dusty blue)
- "負面": "#A5B5BF" (steel blue)
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

SUGGESTED COLOR PALETTE (use these coordinated green-blue Morandi colors in order):
- "#7D9D9C" (sage green - primary)
- "#9DB4AB" (mint green)
- "#8B9EB7" (dusty blue)
- "#A5B5BF" (steel blue)
- "#B5C4B1" (pale sage)
- "#6B8065" (deep moss)
- "#8599A8" (slate)
- "#AFC4C0" (seafoam)

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
