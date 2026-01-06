"""
越南旅遊險受訪者生成 Agent
根據目標客群生成多元的越南受訪者
"""
import os
from typing import List
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- 越南受訪者 Schema ---
class VietnamPersona(BaseModel):
    id: str = Field(..., description="受訪者 ID，格式：[姓氏]先生 或 [姓氏]小姐")
    lastName: str = Field(..., description="姓氏（越南姓氏）")
    gender: str = Field(..., description="性別：Male 或 Female")
    age: int = Field(..., description="年齡")
    occupation: str = Field(..., description="職業/職稱")
    timesOfOverseasTravelInsurance: int = Field(..., description="購買海外旅遊險次數")
    purchasedBrand: List[str] = Field(default_factory=list, description="購買過的保險品牌")
    purchasedChannels: List[str] = Field(default_factory=list, description="購買管道")
    personalBackground: str = Field(..., description="個人背景描述")

class BatchVietnamPersonaResponse(BaseModel):
    personas: List[VietnamPersona]

# --- 生成提示詞 ---
VIETNAM_GENERATION_PROMPT = """
You are an expert market researcher generating REALISTIC Vietnamese people for travel insurance user research.

# CRITICAL: THESE ARE ORDINARY VIETNAMESE PEOPLE
- They live in Vietnam (胡志明市, 河內, 峴港, 芽莊, 等)
- They have varying levels of travel experience
- They may or may not have bought travel insurance before
- They make decisions based on Vietnamese cultural context

# INSTRUCTIONS:

## 1. Person ID Format
- Format: "[Vietnamese Surname]先生" for males, "[Vietnamese Surname]小姐" for females
- Use common Vietnamese surnames: Nguyễn, Trần, Lê, Phạm, Huỳnh, Hoàng, Phan, Vũ, Võ, Đặng, Bùi, Đỗ, Hồ, Ngô, Dương, Lý
- Examples: "Nguyễn先生", "Trần小姐", "Lê先生"

## 2. Diversity Requirements
- VARY ages: young professionals (22-30), middle-aged (31-50), older (51-65)
- VARY occupations: office workers, business owners, freelancers, teachers, engineers, sales, etc.
- VARY travel insurance experience: 0 times (never bought), 1-2 times (occasional), 3+ times (experienced)
- VARY income levels and education backgrounds

## 3. Purchased Brands (if any)
Choose from Vietnamese market brands:
- Bao Viet, VBI, Liberty, PVI, Bảo Minh, MIC, PTI, Cathay, AIA, Prudential
- Some people may have never purchased (empty array)

## 4. Purchase Channels (if any)
Choose from:
- Official website (官網)
- Travel agency (旅行社)
- Third-party platform (第三方平台)
- Bank/Credit card (銀行/信用卡)
- Airport counter (機場櫃台)
- Mobile app (手機App)

## 5. Personal Background (in Traditional Chinese - 繁體中文)
Write a brief background in bullet point format:
- 居住地：[Vietnamese city]
- 職業背景：[job description]
- 旅遊習慣：[travel frequency and style]
- 其他：[any relevant details]

Example:
"居住地：胡志明市第七郡
職業背景：在外商公司擔任行銷專員，工作五年
旅遊習慣：每年出國旅遊1-2次，主要去東南亞國家
其他：喜歡自由行，通常和朋友一起出遊"

# OUTPUT: Return valid JSON matching the VietnamPersona schema.
"""

def generate_vietnam_personas(target_audience: str, count: int = 3) -> List[VietnamPersona]:
    """
    生成越南旅遊險受訪者

    Args:
        target_audience: 目標客群描述
        count: 生成人數

    Returns:
        List of VietnamPersona
    """
    print(f"🇻🇳 正在生成 {count} 位越南受訪者，目標: {target_audience}...")

    try:
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": VIETNAM_GENERATION_PROMPT},
                {
                    "role": "user",
                    "content": f"Please generate {count} distinct and diverse Vietnamese personas for this target audience: '{target_audience}'. Make sure they have varied travel insurance purchase experience (some never bought, some bought 1-2 times, some are experienced buyers)."
                },
            ],
            response_format=BatchVietnamPersonaResponse,
        )

        batch_result = completion.choices[0].message.parsed
        return batch_result.personas

    except Exception as e:
        print(f"❌ 生成失敗: {e}")
        return []


# 測試
if __name__ == "__main__":
    personas = generate_vietnam_personas("越南的上班族，有出國旅遊經驗", count=3)

    for p in personas:
        print(f"\n--- {p.id} ---")
        print(f"Age: {p.age}, Occupation: {p.occupation}")
        print(f"Insurance Experience: {p.timesOfOverseasTravelInsurance} times")
        print(f"Brands: {p.purchasedBrand}")
        print(f"Background: {p.personalBackground[:100]}...")
