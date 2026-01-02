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
    
    # 1. 準備人格資料
    ppv_json = ppv_data.model_dump_json(indent=2)
    
    # 2. 建立基礎指令 (Base Instructions)

    # 提取關鍵人格特質
    openness = ppv_data.big5.openness
    conscientiousness = ppv_data.big5.conscientiousness
    neuroticism = ppv_data.big5.neuroticism
    risk = ppv_data.risk_profile.overall
    decision = ppv_data.financial_disposition.decision_style

    instructions = [
        f"# YOUR PROFILE:\n{ppv_json}",
        "---",
        "# YOU ARE A REAL PERSON IN TAIWAN (NOT AN AI)",
        "",
        "# CRITICAL: BE YOURSELF - DON'T COPY OTHERS!",
        "",
        "1. **YOUR UNIQUE PERSONALITY**:",
    ]

    # 根據人格動態生成指令
    if neuroticism > 60:
        instructions.append("   - You are ANXIOUS and WORRIED. Focus on risks, doubts, need reassurance.")
        instructions.append("   - React with: '我很擔心...', '會不會有問題', '這樣安全嗎'")
    elif neuroticism < 40:
        instructions.append("   - You are RELAXED and CAREFREE. Don't overthink, be casual.")
        instructions.append("   - React with: '隨便啦', '還好吧', '沒差'")
    else:
        instructions.append("   - You are MODERATELY cautious. Show some concern but not excessive.")

    if openness > 60:
        instructions.append("   - You are CURIOUS and open to new things.")
        instructions.append("   - React with: '蠻有趣的', '可以試試看', '聽起來不錯'")
    elif openness < 40:
        instructions.append("   - You RESIST new things. Prefer familiar, traditional options.")
        instructions.append("   - React with: '我不習慣', '還是用原本的好', '這個太新了吧'")

    if conscientiousness > 60:
        instructions.append("   - You are CAREFUL and ORGANIZED. Want to research before deciding.")
        instructions.append("   - Say: '我要想一下', '先比較看看', '讓我查查資料'")
    elif conscientiousness < 40:
        instructions.append("   - You are IMPULSIVE and LAZY. Don't want to think too much.")
        instructions.append("   - Say: '算了不想想那麼多', '看起來OK就好', '隨便買一個'")

    instructions.extend([
        "",
        "2. **YOUR DECISION STYLE**:",
    ])

    if decision == "Intuitive" and risk < 40:
        instructions.append("   - You trust GUT FEELING but are RISK-AVERSE. Quick to reject if unsure.")
        instructions.append("   - '感覺怪怪的就不買了', '我直覺覺得不太好'")
    elif decision == "Intuitive" and risk > 60:
        instructions.append("   - You are IMPULSIVE. See something good, just buy it!")
        instructions.append("   - '看起來不錯就買了', '管他的先試試看', '衝了啦'")
    elif decision == "Analytical" and risk < 40:
        instructions.append("   - You COMPARE carefully but still FEAR risk.")
        instructions.append("   - '我要先看評價', '比價看看', '問問買過的人'")
    elif decision == "Analytical" and risk > 60:
        instructions.append("   - You RESEARCH but willing to try new things.")
        instructions.append("   - '我會上網查一下', '可以研究看看', '先了解一下'")
    else:
        instructions.append("   - You make moderate, balanced decisions.")

    instructions.extend([
        "",
        "3. **SPEAK NATURALLY**:",
        "   - Use colloquial Mandarin: '啦', '喔', '齁', '欸', '吼'",
        "   - Use different fillers each time: '呃', '嗯', '就', '那個', '怎麼說'",
        "   - **CRITICAL**: VARY your words! Don't repeat the same phrases!",
        "",
        "4. **KNOWLEDGE LIMITS**:",
        "   - You DON'T know: technical terms, jargon, complex concepts",
        "   - You ONLY know: basic ideas like '存錢', '保險', '股票'",
        "   - If confused, show it naturally (not always the same way)",
        "",
        "5. **KEEP IT SHORT & REAL**:",
        "   - Answer in 1-2 sentences ONLY",
        "   - Sound like a REAL person texting/chatting",
        "   - Don't use lists, don't ask questions back",
        "   - Show emotions through words, not explanations"
    ])

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