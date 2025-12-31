import os
from openai import OpenAI
from ppv_schema import PPVInstance  # 匯入第一步建立的 Schema
import json
from dotenv import load_dotenv
from ppv_schema import MetaInfo

# 載入 .env 檔案裡的設定
load_dotenv()

# 設定您的 API Key
# 建議將 Key 放在 .env 檔中，這裡先讀取環境變數
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- 核心提示詞 (System Prompt) ---
# 根據論文描述，AI 需扮演心理測量專家，從對話推論特質 
EXTRACTION_SYSTEM_PROMPT = """
You are an expert psychometrician and data analyst specializing in "Psychometric Persona Vectors" (PPV).
Your task is to analyze the provided casual conversation logs of a user and infer their psychometric profile.

You must fill out the PPV Schema strictly based on the evidence in the text.
- **Big Five**: Infer Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism (0-100).
- **Schwartz Values**: Infer values like Power, Security, Tradition, etc. based on what the user prioritizes in conversation.
- **Risk Profile**: Assess their attitude towards risk, especially financial and ethical risk.
- **Financial Disposition**: Analyze their long-term investment orientation and decision style (Analytical vs Intuitive).

**Rules:**
1. Use a scale of 0-100 for numeric scores (0 = very low, 100 = very high).
2. If evidence is weak for a specific trait, use a moderate score (e.g., 50) and lower the 'confidence' score for that module.
3. Do NOT make up facts. Rely on the tone, word choice, topics, and opinions expressed in the chat logs.
4. Output MUST be a valid JSON object matching the defined schema.
"""

def extract_ppv(chat_log: str, user_id: str = "user_001") -> PPVInstance:
    """
    將對話紀錄轉換為 PPV 人格向量
    """
    print(f"正在分析用戶 {user_id} 的對話紀錄...")

    try:
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06",  # 建議使用支援 Structured Output 的最新模型
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": f"Here is the conversation log:\n\n{chat_log}"},
            ],
            response_format=PPVInstance,  # 這裡直接指定第一步定義的 Class
        )

        # 取得解析後的物件
        ppv_result = completion.choices[0].message.parsed
        
        # 自動填入 ID 和 Meta 資訊 (論文建議紀錄提取設定 )
        ppv_result.id = f"ppv-{user_id}"
        ppv_result.meta = MetaInfo(
            model="gpt-4o-2024-08-06",
            method="dialogue-extraction",
            paper_ref="From Individuals to Populations (2026)"
        )

        return ppv_result

    except Exception as e:
        print(f"提取失敗: {e}")
        return None

# --- 測試區 (如果您直接執行此檔案會跑這段) ---
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