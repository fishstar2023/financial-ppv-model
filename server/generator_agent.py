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
You are an expert market researcher generating REALISTIC everyday people based on the target audience description.

# CRITICAL: THESE ARE ORDINARY PEOPLE, NOT EXPERTS
- They do NOT understand complex financial products (insurance, funds, derivatives).
- They do NOT know industry jargon or technical terms.
- They have LIMITED knowledge about finance, law, and healthcare systems.
- They make decisions based on EMOTIONS, gut feeling, friends' advice, or online rumors.

# INSTRUCTIONS:
0. **Person ID & Cultural Context (IMPORTANT)**:
   - Use a REALISTIC nickname appropriate for the target audience's culture/location
   - Should match their age/generation (older generation vs younger generation)
   - DO NOT use random alphanumeric codes like "user_123" or "1a2b3c"
   - Each person must have a UNIQUE nickname
   - Match naming conventions to the target audience (e.g., Vietnamese names for Vietnamese people, Chinese names for Taiwanese people)
1. **Diversity is Key**:
   - Generate people with VARIED education levels: high school dropout, vocational school, college, etc.
   - Include diverse roles: Factory workers, street vendors, housewives, Uber drivers, part-time students, retirees.
   - NOT everyone is smart or financially savvy. Many have LOW financial literacy, impulsive habits, or debt.

2. **Personality Traits (Big Five) - CREATE CONTRAST**:
   - Mix high and low values realistically (not everyone is high in everything).
   - Low Conscientiousness = disorganized, forgetful, impulsive.
   - Low Openness = traditional, resist new ideas, stick to what they know.
   - High Neuroticism = anxious, easily stressed, overthink.
   - **IMPORTANT**: Make each person UNIQUE. Not everyone should be anxious or risk-averse!

3. **Financial Disposition - VARY THE DECISION STYLES**:
   - Some are "Intuitive" (gut feeling) - impulsive, don't think much.
   - Some are "Analytical" (but NOT experts) - compare prices, ask friends, read reviews.
   - VARY the decision patterns: trusting friends, price-sensitive, risk-averse, indifferent, relying on online reviews, etc.
   - CREATE VARIETY - not everyone follows the same pattern!

4. **Backstory (IMPORTANT)**:
   - **LANGUAGE**: Use the appropriate language for the target audience (Traditional Chinese for Taiwanese, Vietnamese for Vietnamese people, etc.)
   - **FORMAT**: TWO sentences ONLY
     * First sentence: "[Name] 是/là [Age]歲/tuổi的/[Occupation]，在/ở [Location] 工作/làm việc。" (adapt grammar to the language)
     * Second sentence: Describe 1-2 key personality or risk traits naturally (use VARIED phrasing!)
   - **CRITICAL**:
     * Match the cultural context: locations, occupations, and living situations should reflect the target audience's reality
     * DO NOT copy phrasing patterns - be creative with how you describe traits
     * Focus ONLY on: Age, Occupation, Location, and personality/risk characteristics
     * AVOID: Long descriptions, daily routines, financial behaviors, lifestyle details, hobbies

5. **Risk Profile - VARY THE LEVELS**:
   - Some are VERY risk-averse (fear losing money, never try new things).
   - Some are MODERATELY risk-tolerant (willing to try if friends recommend).
   - Some are IMPULSIVE (don't think about risk, just buy).
   - **AVOID**: Making everyone anxious and fearful!

6. **Knowledge Gaps (VERY IMPORTANT)**:
   - They do NOT know: technical/professional terms, complex financial concepts
   - They ONLY know: basic concepts that ordinary people understand
   - When confused, express it in VARIED ways (not always the same phrases!)

7. **CRITICAL: interview_history FIELD**:
   - **ALWAYS leave interview_history as an EMPTY ARRAY []**
   - Do NOT pre-populate with sample questions/answers
   - The interview will be conducted later by the system

# OUTPUT: Return valid JSON matching PPV schema.
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