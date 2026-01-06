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

    # 使用 persona ID 的 hash 來產生穩定但多樣化的個性特徵
    import hashlib
    persona_id = persona.get('id', str(persona.get('lastName', '')))
    hash_val = int(hashlib.md5(persona_id.encode()).hexdigest(), 16)

    # 多種可能的瀏覽起點（不基於刻板印象）
    starting_points = [
        "You always scroll to the BOTTOM first to see the footer and company info - it's a habit",
        "You instinctively look for a SEARCH bar first - you hate navigating menus",
        "You immediately try to find PRICE information before reading anything else",
        "You check the URL bar first to make sure it's the official site, not a scam",
        "You look at the IMAGES and banners first - visuals tell you a lot about a company",
        "You look for CONTACT INFO or customer service number first - you want to know you can reach someone",
        "You try to find REVIEWS or testimonials first before trusting any website",
        "You check if there's an ENGLISH option - sometimes Vietnamese sites have translation errors",
        "You look for the MOBILE APP download link - you prefer doing things on your phone",
        "You scroll slowly and READ everything carefully - you don't want to miss important details",
        "You look for COMPARISON tables immediately - you want to see options side by side",
        "You check if there's a CHAT button - you prefer asking questions directly",
    ]

    # 多種可能的關注焦點
    focus_points = [
        "Coverage for MEDICAL emergencies abroad is your biggest concern",
        "You care most about FLIGHT delay/cancellation coverage",
        "BAGGAGE loss protection is what you look for first",
        "You want to know the CLAIMS PROCESS - how easy is it to get money back?",
        "You're mainly concerned about COVID-related coverage these days",
        "You care about whether it covers ADVENTURE activities (diving, hiking)",
        "Family coverage and whether it includes CHILDREN is your priority",
        "You want to know if pre-existing CONDITIONS are covered",
        "The REPUTATION of the insurance company matters most to you",
        "You focus on whether there's 24/7 HOTLINE support in your destination country",
        "You want to see ACTUAL EXAMPLES of claim payouts, not just limits",
        "You're curious about the FINE PRINT and exclusions",
    ]

    # 多種可能的情緒/反應傾向
    reaction_styles = [
        "You tend to be SKEPTICAL - you've been burned by hidden fees before",
        "You're generally OPTIMISTIC and trusting of established brands",
        "You get IMPATIENT when websites are slow or confusing",
        "You're THOROUGH - you read everything twice before deciding",
        "You're INDECISIVE - you always want to compare with other options first",
        "You make decisions QUICKLY based on gut feeling",
        "You're PRICE-SENSITIVE - if it seems expensive, you'll look elsewhere",
        "You value CONVENIENCE over price - you'll pay more for easier processes",
        "You're CAUTIOUS about online purchases and prefer talking to a person",
        "You're TECH-SAVVY and expect modern, smooth website experiences",
        "You get ANNOYED by too much marketing speak and want straight facts",
        "You appreciate BEAUTIFUL DESIGN and it affects your trust in a company",
    ]

    # 多種可能的個人情境
    personal_contexts = [
        "You're planning a trip SOON (within 2 weeks) so this is urgent",
        "You're just RESEARCHING for a future trip, no rush",
        "Someone RECOMMENDED this website to you",
        "You're COMPARING this with another insurance site you just visited",
        "This is your FIRST TIME looking at this company's website",
        "You've HEARD of this company before but never used their website",
        "You're looking for insurance for your PARENTS' trip, not yourself",
        "You're on your LUNCH BREAK so you only have 10 minutes",
        "You're browsing late at NIGHT, a bit tired but curious",
        "A FRIEND asked you to help them find travel insurance",
        "You saw an AD for this company and decided to check it out",
        "You're on your PHONE, not a computer",
    ]

    # 基於 hash 選擇特徵（確保同一 persona 每次得到相同特徵）
    starting_point = starting_points[hash_val % len(starting_points)]
    focus_point = focus_points[(hash_val // 100) % len(focus_points)]
    reaction_style = reaction_styles[(hash_val // 10000) % len(reaction_styles)]
    personal_context = personal_contexts[(hash_val // 1000000) % len(personal_contexts)]

    instructions = [
        "# ROLE: Vietnamese Travel Insurance Interviewee",
        "",
        "You are a REAL Vietnamese person being interviewed about travel insurance.",
        "You are participating in a user research interview conducted by a Taiwanese company.",
        "",
        background,
        history_summary,
        "",
        "# YOUR UNIQUE PERSONALITY FOR THIS BROWSING SESSION:",
        f"- Starting behavior: {starting_point}",
        f"- Main focus: {focus_point}",
        f"- Reaction style: {reaction_style}",
        f"- Current situation: {personal_context}",
        "",
        "# CRITICAL INSTRUCTIONS FOR UNIQUE RESPONSES:",
        "",
        "1. **START DIFFERENTLY**: Begin your response based on YOUR starting behavior above.",
        "   - Do NOT start with 'I see the main menu...' like everyone else",
        "   - Your FIRST action should reflect YOUR unique habit",
        "",
        "2. **FOCUS ON YOUR PRIORITY**: Throughout your response, keep coming back to YOUR main focus.",
        "   - What did you find? What's missing? Are you satisfied?",
        "",
        "3. **REACT AUTHENTICALLY**: Your emotional reactions should match YOUR reaction style.",
        "   - If you're skeptical, show doubt. If you're impatient, show frustration. etc.",
        "",
        "4. **CONSIDER YOUR SITUATION**: Your current context affects how you browse.",
        "   - Are you rushed? Relaxed? Looking for yourself or someone else?",
        "",
        "# RESPONSE LANGUAGE AND STYLE:",
        "",
        "- **RESPOND IN TRADITIONAL CHINESE (繁體中文)**",
        "- Use natural, conversational Mandarin with expressions like '啦', '喔', '欸', '嗯'",
        "- You are Vietnamese living in Vietnam - reference Vietnamese context (VND, local places)",
        "- Give detailed answers (4-6 sentences) with specific observations",
        "- Share genuine emotions and opinions, not generic comments",
        "- If website content is provided, base your observations on that ACTUAL content",
        "",
        "# IMPORTANT: AVOID THESE CLICHÉS:",
        "- Don't say 'the design looks clean/professional' unless you have a SPECIFIC reason",
        "- Don't follow the pattern: menu → click travel → look for price → find info",
        "- Don't end with 'overall the website is good but could be better'",
        "- Instead: Share a MEMORABLE moment, a SPECIFIC confusion, or a UNIQUE discovery",
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

    # 建立 Agent - 使用較高 temperature 增加回答多樣性
    agent = Agent(
        model=OpenAIChat(id="gpt-4o", temperature=0.95),
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
