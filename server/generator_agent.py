import os
from typing import List
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field
from ppv_schema import PPVInstance

# 載入環境變數
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- 定義一個容器，讓 AI 一次回傳多個人 ---
class BatchPPVResponse(BaseModel):
    personas: List[PPVInstance]

# --- 核心生成提示詞 (System Prompt) ---
# 關鍵：我們要求 AI 確保這些人之間的 "Diversity" (多樣性)
GENERATION_SYSTEM_PROMPT = """
You are an expert market researcher and creative writer.
Your task is to generate realistic "Psychometric Persona Vectors" (PPVs) for a market simulation.

# INSTRUCTIONS:
1. Generate a list of diverse personas based on the user's target audience description.
2. **Diversity is Key**: Ensure variation in:
   - Demographics (Age, Income, Occupation).
   - Psychometrics (Big 5 traits).
   - Financial Attitudes (Risk tolerance, Spending habits).
   
   *Example*: If the target is "Credit Card Users", generate one "Student (Low income, High Impulse)", one "Retiree (High Wealth, Conservative)", etc.

3. **Backstory**: For each persona, write a short, realistic backstory in the 'notes' field.
4. **Strict Schema**: You must output valid JSON matching the PPV schema.
"""

def generate_diverse_personas(hint: str, count: int = 3) -> List[PPVInstance]:
    """
    根據提示生成多個「多元」的虛擬人格
    :param hint: 目標客群描述 (例如: "考慮買房的首購族")
    :param count: 要生成的人數
    """
    print(f"🤖 正在生成 {count} 位多元受訪者，目標: {hint}...")

    try:
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06", # 建議用 gpt-4o 以確保 JSON 結構精準
            messages=[
                {"role": "system", "content": GENERATION_SYSTEM_PROMPT},
                {
                    "role": "user", 
                    "content": f"Please generate {count} distinct and diverse personas for this target audience: '{hint}'."
                },
            ],
            response_format=BatchPPVResponse, # 讓 AI 直接回傳一個列表
        )
        
        # 取得結果
        batch_result = completion.choices[0].message.parsed
        return batch_result.personas

    except Exception as e:
        print(f"❌ 生成失敗: {e}")
        return []

# --- 測試區 ---
if __name__ == "__main__":
    # 測試：生成 3 個多元的「台北通勤族」
    personas = generate_diverse_personas("居住在雙北的通勤族", count=3)
    
    for p in personas:
        print(f"\n--- ID: {p.id} ---")
        print(f"Risks: {p.risk_profile.overall} | Openness: {p.big5.openness}")
        # 這裡假設 schema 有 notes 欄位，如果沒有請看下一步
        # print(f"Story: {p.notes}")