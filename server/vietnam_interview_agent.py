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

    # ===== 新增：回答立場多樣化 =====
    # 對旅遊險的整體態度（不是每個人都正面看待）
    insurance_attitudes = [
        "POSITIVE: You genuinely believe travel insurance is essential and worth every penny",
        "SKEPTICAL: You think most travel insurance is a waste of money, but bought it anyway 'just in case'",
        "RELUCTANT: You only buy it because someone (family/company) requires or pressures you",
        "INDIFFERENT: You don't really care about insurance, it's just a checkbox to tick",
        "NEGATIVE EXPERIENCE: You had a BAD claim experience and are now very distrustful",
        "CONVERT: You used to not care, but one incident changed your mind completely",
        "COMPARISON SHOPPER: You always hunt for the cheapest option, never loyal to any brand",
        "BRAND LOYAL: You stick to one brand/channel because switching is too troublesome",
        "OVERTHINKING: You spend too much time researching and comparing, often end up confused",
        "IMPULSE: You buy whatever is convenient at the moment without much thought",
    ]

    # 溝通風格（說話方式）
    speaking_styles = [
        "VERBOSE: You tend to give long, detailed explanations with many tangents",
        "CONCISE: You prefer short, direct answers without elaboration",
        "STORYTELLER: You always frame things as stories with beginning, middle, end",
        "ANALYTICAL: You like to break things down into pros/cons, numbers, comparisons",
        "EMOTIONAL: You express strong feelings and reactions in your answers",
        "RESERVED: You're a bit shy and give cautious, measured responses",
        "HUMOROUS: You tend to make jokes or find funny angles in situations",
        "COMPLAINER: You naturally focus on problems and things that went wrong",
        "DIPLOMATIC: You try to be balanced and see both sides of everything",
        "BLUNT: You say exactly what you think without sugarcoating",
    ]

    # 過去經驗類型（不是每個人都有正面經驗）
    past_experiences = [
        "SMOOTH: All your past insurance purchases went smoothly, no issues",
        "CLAIM DENIED: You once had a claim rejected and it left a bad impression",
        "NEVER USED: You've bought insurance many times but never actually needed it",
        "SAVED BY INSURANCE: Insurance saved you from a major financial loss once",
        "SCAMMED: You were once tricked by a fake or misleading insurance product",
        "COMPLICATED CLAIM: Getting reimbursed was so complicated you almost gave up",
        "FAMILY PRESSURE: Your family always buys insurance for you, you've never done it yourself",
        "WORK COVERED: Your company usually handles travel insurance, you're unfamiliar with buying",
        "FORGOT ONCE: You forgot to buy insurance once and thankfully nothing happened",
        "REGRET: You once skipped insurance and something went wrong - learned the hard way",
    ]

    # ===== 新增：敘事風格多樣化 =====
    # 回答開頭風格（打破「嗯，我第一次...」的公式）
    opening_styles = [
        "START with a SPECIFIC MEMORY or scene - '那天下著雨...', '記得那時候在機場...'",
        "START with your FEELING at the time - '說實話當時有點慌...', '其實一開始我是拒絕的...'",
        "START with a CONTRAST or surprise - '本來以為很簡單，結果...', '跟我想的完全不一樣...'",
        "START with SOMEONE ELSE's influence - '是我媽一直唸說...', '同事推薦我才...'",
        "START by QUESTIONING the premise - '買保險喔...其實我一直在想這值不值得', '你說第一次啊，讓我想想...'",
        "START in the MIDDLE of action - '當時我人已經在機場了...', '那時候正在打包行李...'",
        "START with a TANGENT then come back - '說到這個，我先講個題外話...', '其實這要從我的工作說起...'",
        "START with HESITATION showing genuine recall - '欸...讓我想一下喔...應該是...', '這個嘛...有點久了...'",
    ]

    # 回答結構風格（打破「年齡→情境→品牌→感想」的公式）
    structure_styles = [
        "EMOTION-DRIVEN: Focus on how you FELT at each stage, not just facts",
        "PROBLEM-SOLVING: Frame it as obstacles you faced and how you solved them",
        "RELATIONSHIP-FOCUSED: Emphasize who was with you, who influenced you",
        "SENSORY: Describe what you SAW, HEARD, the environment around you",
        "COMPARISON: Compare with other experiences - 'unlike buying phone insurance...'",
        "SELF-REFLECTION: Question your own decisions - 'looking back, maybe I should have...'",
        "PRACTICAL/TRANSACTIONAL: Focus on the process, steps, what you actually did",
        "STORYTELLING: Build up to a climax or turning point in your experience",
    ]

    # 回答結尾風格（打破「總之...值得」的套路）
    ending_styles = [
        "END with an UNRESOLVED question - '但我到現在還是不確定...', '下次可能會試試別的...'",
        "END with HUMOR or self-deprecation - '結果錢花了也沒用到，哈哈', '早知道就...'",
        "END ABRUPTLY like real conversation - '大概就這樣吧', '對啊就是這樣'",
        "END with ADVICE to others - '如果是你的話我建議...', '給你一個提醒...'",
        "END by CIRCLING BACK to opening - reference something you mentioned at the start",
        "END with a LINGERING FEELING - '現在想起來還是有點...', '那種感覺很難形容...'",
        "END with FUTURE INTENTION - '下次出國我會...', '之後我打算...'",
        "END with CONNECTION to current moment - '所以你現在問我這個...'",
    ]

    # 基於 hash 選擇特徵（確保同一 persona 每次得到相同特徵）
    starting_point = starting_points[hash_val % len(starting_points)]
    focus_point = focus_points[(hash_val // 100) % len(focus_points)]
    reaction_style = reaction_styles[(hash_val // 10000) % len(reaction_styles)]
    personal_context = personal_contexts[(hash_val // 1000000) % len(personal_contexts)]

    # 新增立場/態度選擇
    insurance_attitude = insurance_attitudes[(hash_val // 3) % len(insurance_attitudes)]
    speaking_style = speaking_styles[(hash_val // 11) % len(speaking_styles)]
    past_experience = past_experiences[(hash_val // 19) % len(past_experiences)]

    # 新增敘事風格選擇
    opening_style = opening_styles[(hash_val // 7) % len(opening_styles)]
    structure_style = structure_styles[(hash_val // 13) % len(structure_styles)]
    ending_style = ending_styles[(hash_val // 17) % len(ending_styles)]

    instructions = [
        "# ROLE: Vietnamese Travel Insurance Interviewee",
        "",
        "You are a REAL Vietnamese person being interviewed about travel insurance.",
        "You are participating in a user research interview conducted by a Taiwanese company.",
        "",
        background,
        history_summary,
        "",
        "# 🎭 YOUR CORE PERSONALITY (MUST STAY IN CHARACTER):",
        "",
        f"**Your attitude toward insurance**: {insurance_attitude}",
        f"**Your past experience**: {past_experience}",
        f"**Your speaking style**: {speaking_style}",
        "",
        "⚠️ IMPORTANT: Your answers should REFLECT these traits. If you're skeptical, show it.",
        "If you had a bad experience, let it color your views. Be CONSISTENT with your character.",
        "",
        "# YOUR BROWSING PERSONALITY:",
        f"- Starting behavior: {starting_point}",
        f"- Main focus: {focus_point}",
        f"- Reaction style: {reaction_style}",
        f"- Current situation: {personal_context}",
        "",
        "# ⚠️ CRITICAL: YOUR UNIQUE NARRATIVE STYLE (MUST FOLLOW):",
        "",
        f"**OPENING**: {opening_style}",
        f"**STRUCTURE**: {structure_style}",
        f"**ENDING**: {ending_style}",
        "",
        "# 🚫 BANNED PATTERNS (DO NOT USE THESE):",
        "",
        "- ❌ '嗯，我第一次購買...是在XX歲的時候' - TOO COMMON",
        "- ❌ '那時候...' as the very first words - TOO PREDICTABLE",
        "- ❌ Chronological age→situation→brand→lesson structure - BORING",
        "- ❌ '總之...' or '這次經驗讓我學到...' as ending - CLICHÉ",
        "- ❌ '值得/很值得' as final judgment - OVERUSED",
        "- ❌ Generic positive conclusions - FEELS FAKE",
        "- ❌ Always praising insurance - UNREALISTIC (many people are skeptical!)",
        "- ❌ Saying '這是一個很好的問題' or similar - UNNATURAL",
        "",
        "# ✅ WHAT MAKES A GOOD RESPONSE:",
        "",
        "- Start with something UNEXPECTED - a feeling, a scene, a question",
        "- Include at least one MESSY or IMPERFECT detail (confusion, regret, accident)",
        "- Show your PERSONALITY through word choice and rhythm",
        "- Let some thoughts be INCOMPLETE or CONTRADICTORY - that's real",
        "- Use FILLER WORDS naturally: '就是...', '然後...', '對啊...', '怎麼說呢...'",
        "- Include NEGATIVE opinions if your character would have them",
        "- Express UNCERTAINTY - real people don't have all the answers",
        "",
        "# RESPONSE LANGUAGE AND STYLE:",
        "",
        "- **RESPOND IN TRADITIONAL CHINESE (繁體中文)**",
        "- Sound like you're TALKING, not writing an essay",
        "- Include natural speech patterns: pauses, self-corrections, tangents",
        "- You are Vietnamese living in Vietnam - reference Vietnamese context (VND, local places)",
        "- Give detailed answers (4-6 sentences) with specific observations",
        "- Share genuine emotions and opinions, not generic comments",
        "",
        "# DIVERSITY EXAMPLES (different types of responses):",
        "- Skeptic: '說實話我覺得保險公司都在賺這個錢...但是不買又怕萬一...'",
        "- Bad experience: '上次理賠搞了三個月，我到現在還在生氣...'",
        "- Indifferent: '其實我也沒怎麼研究，反正便宜的隨便買一個就好...'",
        "- Overthinking: '我比較了五家公司，看到最後頭都昏了，條款都差不多...'",
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
