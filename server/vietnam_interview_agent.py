"""
越南旅遊險訪談 Agent
用於模擬越南受訪者回答訪談問題
支援自動抓取問題中的 URL 內容
"""
import os
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.openai import OpenAIChat

# 匯入 URL 抓取工具
from url_fetcher import extract_and_fetch_urls

load_dotenv()

def interview_vietnam_persona(
    persona: Dict[str, Any],
    question: str,
    sub_questions: List[str] = None
) -> str:
    """
    使用 Agno Agent 模擬越南受訪者回答問題

    Args:
        persona: 受訪者基本資料
        question: 當前訪談問題
        sub_questions: 追問項目列表

    Returns:
        模擬的回答文字
    """

    # 建立受訪者背景描述
    background = f"""
# INTERVIEWEE PROFILE:
- Name: {persona.get('lastName', 'Unknown')} {'先生' if persona.get('gender') == 'Male' else '小姐'}
- Age: {persona.get('age', 30)} tuổi (years old)
- Occupation: {persona.get('occupation', 'Unknown')}
- Travel Insurance Experience: Bought {persona.get('timesOfOverseasTravelInsurance', 0)} times
- Brands Used: {', '.join(persona.get('purchasedBrand', [])) or 'None'}
- Purchase Channels: {', '.join(persona.get('purchasedChannels', [])) or 'None'}
- Background: {persona.get('personalBackground', 'No additional background')}
"""

    # 建立訪談歷史摘要
    history_summary = ""
    if persona.get('interviewHistory'):
        history_summary = "\n# PREVIOUS INTERVIEW RESPONSES:\n"
        for record in persona['interviewHistory'][-5:]:  # 只取最近5筆
            history_summary += f"Q: {record.get('question', '')}\n"
            history_summary += f"A: {record.get('answer', '')}\n\n"

    # 建立追問項目
    sub_q_text = ""
    if sub_questions:
        sub_q_text = "\n## Sub-questions to address:\n"
        for sq in sub_questions:
            sub_q_text += f"- {sq}\n"

    # 🌐 自動抓取問題中的 URL 內容
    urls_found, url_content = extract_and_fetch_urls(question, sub_questions)
    if urls_found:
        print(f"🌐 [URL Fetcher] Found {len(urls_found)} URL(s), injecting real content into prompt")

    instructions = [
        "# ROLE: Vietnamese Travel Insurance Interviewee",
        "",
        "You are a REAL Vietnamese person being interviewed about travel insurance.",
        "You are participating in a user research interview conducted by a Taiwanese company.",
        "",
        background,
        history_summary,
        "",
        "# CRITICAL BEHAVIOR RULES:",
        "",
        "1. **RESPOND IN TRADITIONAL CHINESE (繁體中文)**:",
        "   - The interviewer speaks Chinese, so respond in Chinese",
        "   - Use natural, conversational Mandarin",
        "   - Include colloquial expressions: '啦', '喔', '欸', '嗯'",
        "",
        "2. **BE A REAL VIETNAMESE PERSON**:",
        "   - Your perspective and experiences are from Vietnam",
        "   - Reference Vietnamese prices (VND), places, and customs",
        "   - Share genuine experiences from living in Vietnam",
        "",
        "3. **KNOWLEDGE LEVEL**:",
        "   - You are an ORDINARY person, not a financial expert",
        "   - You may not know all insurance terms or details",
        "   - Share what you ACTUALLY experienced and felt",
        "",
        "4. **RESPONSE STYLE**:",
        "   - Give detailed, thoughtful answers (3-5 sentences minimum)",
        "   - Share specific examples from your experience",
        "   - Express genuine emotions and opinions",
        "   - If you haven't experienced something, say so honestly",
        "",
        "5. **INTERVIEW CONTEXT**:",
        "   - This is a formal user research interview",
        "   - The interviewer wants to understand your real experiences",
        "   - Be honest and specific, not generic",
        "",
        "6. **WEBSITE CONTENT**:",
        "   - If website content is provided, you have ACTUALLY viewed those pages",
        "   - Base your answers on the REAL content you see",
        "   - React naturally as a Vietnamese consumer viewing these sites",
    ]

    # 如果有抓取到 URL 內容，加入 instructions
    if url_content:
        instructions.append("")
        instructions.append(url_content)

    # 建立問題提示
    question_prompt = f"""
Current Interview Question:
{question}
{sub_q_text}

Please respond naturally as a Vietnamese interviewee. Share your genuine experiences and thoughts.
"""

    print(f"🇻🇳 [Vietnam Interview] Simulating response for: {persona.get('lastName', 'Unknown')}")

    # 建立 Agent
    agent = Agent(
        model=OpenAIChat(id="gpt-4o", temperature=0.85),
        description="You are a Vietnamese person being interviewed about travel insurance experiences.",
        instructions=instructions,
        markdown=False
    )

    try:
        response = agent.run(question_prompt, stream=False)
        return response.content
    except Exception as e:
        print(f"❌ Vietnam interview failed: {e}")
        return "（抱歉，系統發生錯誤，請再試一次）"


# 測試用
if __name__ == "__main__":
    test_persona = {
        "lastName": "Nguyễn",
        "gender": "Female",
        "age": 28,
        "occupation": "Office Worker",
        "timesOfOverseasTravelInsurance": 2,
        "purchasedBrand": ["Bao Viet", "Liberty"],
        "purchasedChannels": ["Official website (官網)", "Travel agency (旅行社)"],
        "personalBackground": "Working in Ho Chi Minh City, travels abroad 1-2 times per year",
        "interviewHistory": []
    }

    result = interview_vietnam_persona(
        test_persona,
        "請概述自己的旅遊習慣與型態",
        ["旅遊地點、頻率、大概的天數和預算範圍", "型態（自助/半自助/跟團）"]
    )
    print(f"\n回答: {result}")
