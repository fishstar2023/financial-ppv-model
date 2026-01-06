"""
越南訪談分析 Agent
用於分析多位受訪者對同一問題的回答，找出共同趨勢和洞察
"""
import os
from typing import List, Dict, Any
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.openai import OpenAIChat

load_dotenv()


def analyze_interview_responses(
    question: str,
    responses: List[Dict[str, Any]]
) -> str:
    """
    分析多位受訪者對同一問題的回答

    Args:
        question: 訪談問題
        responses: 回答列表，每個包含 persona info 和 answer

    Returns:
        分析報告文字
    """
    if not responses:
        return "沒有回答可供分析"

    # 建立回答摘要
    response_summary = ""
    for i, resp in enumerate(responses, 1):
        persona = resp.get('persona', {})
        name = f"{persona.get('lastName', 'Unknown')} {'先生' if persona.get('gender') == 'Male' else '小姐'}"
        age = persona.get('age', '?')
        occupation = persona.get('occupation', 'Unknown')
        insurance_exp = persona.get('timesOfOverseasTravelInsurance', 0)
        answer = resp.get('answer', '')

        response_summary += f"""
---
## Respondent {i}: {name}
- Age: {age}, Occupation: {occupation}
- Travel Insurance Experience: {insurance_exp} times
- Answer:
{answer}
"""

    instructions = [
        "# ROLE: Market Research Summarizer",
        "",
        "You are a concise market research summarizer.",
        "Your job is to create a brief, actionable summary report from interview responses.",
        "",
        "# OUTPUT LANGUAGE: Traditional Chinese (繁體中文)",
        "Your summary MUST be written entirely in Traditional Chinese.",
        "",
        "# SUMMARY FORMAT:",
        "Keep it SHORT and ACTIONABLE. Use this exact structure:",
        "",
        "## 📌 一句話總結",
        "(用一句話概括所有受訪者的核心觀點)",
        "",
        "## 🔑 關鍵發現 (3-5 點)",
        "- 發現 1",
        "- 發現 2",
        "- 發現 3",
        "",
        "## 💡 行動建議 (2-3 點)",
        "- 建議 1",
        "- 建議 2",
        "",
        "# RULES:",
        "- Keep the entire summary under 300 words",
        "- Be direct and specific",
        "- Focus on actionable insights",
        "- Quote specific responses when impactful",
        "- NO lengthy explanations",
    ]

    analysis_prompt = f"""
# Interview Question:
{question}

# Responses from {len(responses)} Vietnamese Consumers:
{response_summary}

請用繁體中文產出簡潔的總結報告。
"""

    print(f"📊 [Analysis] Analyzing {len(responses)} responses for question: {question[:50]}...")

    agent = Agent(
        model=OpenAIChat(id="gpt-4o", temperature=0.7),
        description="Expert market research analyst for consumer insights",
        instructions=instructions,
        markdown=True
    )

    try:
        response = agent.run(analysis_prompt, stream=False)
        return response.content
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        return f"分析失敗: {str(e)}"


def analyze_all_questions(personas: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    分析所有問題的回答

    Args:
        personas: 所有受訪者資料

    Returns:
        問題 -> 分析報告的對照表
    """
    # 收集所有問題和對應的回答
    question_responses: Dict[str, List[Dict[str, Any]]] = {}

    for persona in personas:
        for record in persona.get('interviewHistory', []):
            question = record.get('question', '')
            if not question:
                continue

            if question not in question_responses:
                question_responses[question] = []

            question_responses[question].append({
                'persona': persona,
                'answer': record.get('answer', '')
            })

    # 分析每個問題
    analyses = {}
    for question, responses in question_responses.items():
        if len(responses) >= 2:  # 至少需要 2 個回答才分析
            analyses[question] = analyze_interview_responses(question, responses)

    return analyses


# 測試
if __name__ == "__main__":
    test_responses = [
        {
            'persona': {
                'lastName': 'Nguyễn',
                'gender': 'Female',
                'age': 28,
                'occupation': 'Office Worker',
                'timesOfOverseasTravelInsurance': 2
            },
            'answer': '我通常一年出國一到兩次，主要去東南亞國家，像是泰國、日本。預算大概在兩萬到三萬越南盾左右。'
        },
        {
            'persona': {
                'lastName': 'Trần',
                'gender': 'Male',
                'age': 35,
                'occupation': 'Business Owner',
                'timesOfOverseasTravelInsurance': 5
            },
            'answer': '因為做生意的關係，我經常出差，一年大概五到六次。主要去中國和新加坡，預算比較彈性，看出差需求。'
        }
    ]

    result = analyze_interview_responses(
        "請概述自己的旅遊習慣與型態",
        test_responses
    )
    print(result)
