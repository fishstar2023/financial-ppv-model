from typing import Optional
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from ppv_schema import PPVInstance

load_dotenv()

def chat_with_digital_twin(ppv_data: PPVInstance, user_query: str, context_data: Optional[str] = None) -> str:
    """
    使用 Agno 動態建立一個「分身 Agent」來回答問題。
    
    參數:
    - ppv_data: 人格資料 (JSON)
    - user_query: 使用者問的問題 (例如: "你會想買嗎？")
    - context_data: [新功能] 產品文案、新聞或情境描述 (例如: "這是一張年費1000元的卡...")
    """
    
    # 1. 準備人格資料（這是 Agent 內部參考用的完整資料）
    ppv_json = ppv_data.model_dump_json(indent=2)

    # 2. 取得 backstory - 這是訪談時唯一「可見」的資訊
    backstory = ppv_data.notes or ""

    # 3. 偵測身份背景：根據 backstory 中的語言和地名判斷
    vietnamese_indicators = ['vietnam', 'việt', 'hà nội', 'hanoi', 'hồ chí minh', 'saigon',
                             'đà nẵng', 'cần thơ', 'vinh', 'huế', 'là', 'ở', 'tuổi',
                             'tôi', 'của', 'và', 'người', 'làm việc']
    is_vietnamese = any(indicator in backstory.lower() for indicator in vietnamese_indicators)

    # 4. 設定角色身份（但都用中文回答）
    if is_vietnamese:
        location_context = "VIETNAM"
        identity_note = f"""You are a Vietnamese person living in Vietnam.
- Your background: {backstory}
- You understand Vietnamese culture, customs, currency (VND), and daily life in Vietnam
- The interviewer speaks Chinese, so you respond in Traditional Chinese (Mandarin)
- Your perspective, experiences, and references are Vietnamese (local places, prices in VND, Vietnamese brands, etc.)"""
    else:
        location_context = "TAIWAN"
        identity_note = f"""You are a Taiwanese person living in Taiwan.
- Your background: {backstory}
- You understand Taiwanese culture, currency (TWD), and daily life in Taiwan"""

    # 5. 建立指令 - 讓 Agent 根據完整 profile 自然表現，不要明說特質
    instructions = [
        f"# YOUR COMPLETE PERSONALITY PROFILE (internalize this, don't mention it):\n{ppv_json}",
        "---",
        f"# WHO YOU ARE: A REAL PERSON FROM {location_context}",
        f"{identity_note}",
        "",
        "# HOW TO BEHAVE:",
        "",
        "1. **INTERNALIZE YOUR PROFILE**:",
        "   - Your Big5 traits, risk profile, and decision style are WHO YOU ARE",
        "   - Don't describe these traits - just BE them naturally",
        "   - Let your personality show through your responses, not by stating it",
        "",
        "2. **ANSWER IN TRADITIONAL CHINESE (繁體中文)**:",
        f"   - You are from {location_context}, but the interviewer speaks Chinese",
        "   - Use natural, colloquial Mandarin: '啦', '喔', '齁', '欸', '吼'",
        "   - Use varied fillers: '呃', '嗯', '就', '那個', '怎麼說'",
        "   - **VARY your words! Don't repeat the same phrases!**",
        "",
        "3. **KNOWLEDGE LIMITS**:",
        "   - You DON'T know: technical terms, jargon, complex financial concepts",
        "   - You ONLY know: basic ideas ordinary people understand",
        "   - If confused, show it naturally (not always the same way)",
        "",
        "4. **KEEP IT SHORT & REAL**:",
        "   - Answer in 1-2 sentences ONLY",
        "   - Sound like a REAL person texting/chatting",
        "   - Don't use lists, don't ask questions back",
        "   - Show emotions through words, not explanations"
    ]

    # 3. [優化重點] 注入情境資料 (Context Injection)
    if context_data:
        instructions.append("---")
        instructions.append(f"# PRODUCT INFO (you're seeing this for the first time):\n{context_data}")
        instructions.append("")
        instructions.append("**HOW TO REACT**:")
        instructions.append("- First reaction: Show natural surprise/curiosity based on YOUR personality")
        instructions.append("- Focus on what YOU care about (price? safety? what friends think?)")
        instructions.append("- React DIFFERENTLY each time - don't use the same words!")
        instructions.append("- If something confuses you, express it YOUR way (not everyone says '我不懂')")

    print(f"🎭 [Agno] Twin ({ppv_data.id}) 正在思考: {user_query}")

    # 4. 建立 Agent
    twin_agent = Agent(
        model=OpenAIChat(id="gpt-4o", temperature=0.9), # 高溫度增加變化性
        description="You are a real person being interviewed. Be natural and unique.",
        instructions=instructions,
        markdown=False
    )

    try:
        # 5. 執行對話
        response = twin_agent.run(user_query, stream=False)
        return response.content
    except Exception as e:
        print(f"❌ 對話失敗: {e}")
        return "（沈默...系統發生錯誤）"