import os
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from ppv_schema import PPVInstance, MetaInfo

# 載入 .env
load_dotenv()

# --- 定義 Agno Agent (取代原本的 System Prompt 字串) ---
extraction_agent = Agent(
    model=OpenAIChat(id="gpt-4o-2024-08-06"), # 指定支援結構化輸出的模型
    description="You are an expert psychometrician and data analyst specializing in 'Psychometric Persona Vectors' (PPV).",
    response_model=PPVInstance, # 關鍵：直接告訴 Agent 我們要什麼格式 (Pydantic Schema)
    structured_outputs=True,    # 啟用強制結構化模式
    instructions=[
        "Your task is to analyze the provided casual conversation logs of a user and infer their psychometric profile.",
        "You must fill out the PPV Schema strictly based on the evidence in the text.",
        "---",
        "**Big Five**: Infer Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism (0-100).",
        "**Schwartz Values**: Infer values like Power, Security, Tradition based on what the user prioritizes.",
        "**Risk Profile**: Assess their attitude towards risk, especially financial and ethical risk.",
        "**Financial Disposition**: Analyze their long-term investment orientation and decision style (Analytical vs Intuitive).",
        "---",
        "**Rules:**",
        "1. Use a scale of 0-100 for numeric scores (0 = very low, 100 = very high).",
        "2. If evidence is weak for a specific trait, use a moderate score (e.g., 50) and lower the 'confidence' score.",
        "3. Do NOT make up facts. Rely on the tone, word choice, and opinions in the chat logs.",
        "4. Output MUST be a valid JSON object matching the defined schema."
    ],
    markdown=False, # 我們只需要資料物件，不需要 Markdown 文字
)

def extract_ppv(chat_log: str, user_id: str = "user_001") -> PPVInstance:
    """
    使用 Agno Agent 將對話紀錄轉換為 PPV 人格向量
    """
    print(f"🧠 [Agno] 正在分析用戶 {user_id} 的對話紀錄...")

    try:
        # Agno 的呼叫方式：直接 run，它會自動處理 JSON 解析
        response = extraction_agent.run(f"Here is the conversation log:\n\n{chat_log}")

        # response.content 就已經是轉換好的 PPVInstance 物件了
        ppv_result = response.content
        
        # 自動填入 ID 和 Meta 資訊 (維持原本的邏輯)
        ppv_result.id = f"ppv-{user_id}"
        ppv_result.meta = MetaInfo(
            model="gpt-4o-2024-08-06",
            method="agno-extraction",
            paper_ref="From Individuals to Populations (2026)"
        )

        return ppv_result

    except Exception as e:
        print(f"❌ 提取失敗: {e}")
        return None

# --- 測試區 ---
if __name__ == "__main__":
    # 模擬一段簡單的對話紀錄
    dummy_chat_log = """
    User: 我覺得最近股市波動很大，所以我把大部分資金轉到了債券和定存。
    AI: 這樣比較安全嗎？
    User: 對，我比較在意資產的安全性，不想為了多賺一點而睡不著覺。而且我都會詳細記錄每一筆開銷。
    """
    
    # 執行提取
    result = extract_ppv(dummy_chat_log, user_id="test_user")
    
    if result:
        print("\n--- 提取成功! PPV 結果如下 ---")
        # 將 Pydantic 物件轉為 JSON 字串印出
        print(result.model_dump_json(indent=2))