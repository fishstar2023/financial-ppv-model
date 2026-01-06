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
0. **Person ID - FORMAL NAME FORMAT (CRITICAL)**:
   - Format: "[Surname]先生" for males, "[Surname]小姐" for females
   - Examples: "陳先生", "林小姐", "Nguyễn先生", "Trần小姐"
   - Use common surnames from the target audience's culture
   - DO NOT use full names, nicknames, or alphanumeric codes
   - Each person must have a UNIQUE ID
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

4. **Backstory - PRE-INTERVIEW DEMOGRAPHIC FORM (IMPORTANT)**:
   - **LANGUAGE**: Use Traditional Chinese (繁體中文) for all personas
   - **LOCATION DETECTION (CRITICAL)**:
     * If target audience mentions Vietnam/Vietnamese/越南 → use Vietnamese locations (胡志明市, 河內, 峴港 etc.) and VND currency
     * Otherwise, DEFAULT to Taiwan → use Taiwanese locations (台北, 台中, 高雄 etc.) and TWD currency
     * ALL personas in ONE batch must be from the SAME country - do NOT mix countries!
   - **FORMAT**: Use bullet points with labels, one item per line:
     * 年齡：[age]歲
     * 身份：[occupation/role]
     * 目前所在地：[location with context]
     * 學歷：[education level]
     * 收入/資金來源：[income or financial source]
     * 感情狀況：[relationship status, spouse age if married]
     * 家庭：[children info if any, or living situation]
     * 住處：[housing situation]
   - **EXAMPLE** (for Taiwan - DEFAULT):
     "年齡：35歲
身份：計程車司機
目前所在地：在台中工作
學歷：大學畢業
收入/資金來源：年收入約100萬
感情狀況：已婚，配偶32歲
家庭：有兩個小孩，分別5歲和8歲
住處：自有房屋"
   - **EXAMPLE** (for student):
     "年齡：21歲
身份：大學生
目前所在地：在高雄讀書
學歷：大學就讀中
收入/資金來源：主要依賴父母支持
感情狀況：單身
家庭：無
住處：住在學校宿舍"
   - **EXAMPLE** (for Vietnam - only if explicitly requested):
     "年齡：28歲
身份：工廠作業員
目前所在地：在胡志明市工作
學歷：高中畢業
收入/資金來源：年收入約1億5千萬越南盾
感情狀況：未婚
家庭：與父母同住
住處：家中"
   - **CRITICAL**:
     * ONLY include observable demographics - things they would write on a survey form
     * DO NOT include personality traits, risk preferences, decision styles, or behavioral patterns
     * These hidden traits will only be revealed through the interview process
     * Make demographics REALISTIC and VARIED (not everyone is middle-class or college-educated)

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