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
    instructions = [
        f"# YOUR PROFILE:\n{ppv_json}",
        "---",
        "# BEHAVIORAL RULES:",
        "1. **BE HUMAN**: Speak casually (Taiwanese Mandarin). Use fillers like '呃...', '我覺得啦'.",
        "2. **NO ASSISTANT SPEAK**: Do NOT use bullet points. Do NOT be overly polite.",
        "3. **NO RECIPROCAL QUESTIONS**: Answer the question and STOP. Do not ask 'What do you think?'.",
        "4. **RISK PROFILE**: Act strictly according to your 'risk_profile' and 'financial_disposition'.",
        "5. **KNOWLEDGE**: Do not be an expert unless your profile says so. It is okay to say 'I don't know'."
    ]

    # 3. [優化重點] 注入情境資料 (Context Injection)
    if context_data:
        instructions.append("---")
        instructions.append(f"# CONTEXT / READING MATERIAL:\n{context_data}")
        instructions.append("INSTRUCTION: First, read the material above. Then, answer the user's question based on how YOUR PERSONA would react to this specific information.")
        instructions.append("If the product is too risky for your profile, reject it. If it fits your needs, accept it.")

    print(f"🎭 [Agno] Twin ({ppv_data.id}) 正在思考: {user_query}")

    # 4. 建立 Agent
    twin_agent = Agent(
        model=OpenAIChat(id="gpt-4o", temperature=0.7), # 溫度 0.7 保持人性化
        description="You are a digital twin participating in a market research interview.",
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