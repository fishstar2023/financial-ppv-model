from pydantic import BaseModel, Field
from typing import Optional, List, Dict

# 為了符合 OpenAI Strict Mode，我們將 Dict 改為明確的 Class 定義
class SourceSummary(BaseModel):
    dialogue: float = Field(..., description="對話來源權重 (0.0-1.0)")
    questionnaire: float = Field(..., description="問卷來源權重 (0.0-1.0)")
    behavior: float = Field(..., description="行為來源權重 (0.0-1.0)")

class MetaInfo(BaseModel):
    model: str = Field(..., description="使用的模型名稱")
    method: str = Field(..., description="提取方法")
    paper_ref: str = Field(..., description="參考論文")

# --- 1. 基礎人格模組 ---
class BigFive(BaseModel):
    openness: int = Field(..., description="開放性 (0-100)")
    conscientiousness: int = Field(..., description="盡責性 (0-100)")
    extraversion: int = Field(..., description="外向性 (0-100)")
    agreeableness: int = Field(..., description="親和性 (0-100)")
    neuroticism: int = Field(..., description="神經質 (0-100)")

# --- 2. 價值觀模組 ---
class SchwartzValues(BaseModel):
    self_direction: int = Field(..., description="自我導向 (0-100)")
    stimulation: int = Field(..., description="刺激 (0-100)")
    hedonism: int = Field(..., description="享樂 (0-100)")
    achievement: int = Field(..., description="成就 (0-100)")
    power: int = Field(..., description="權力 (0-100)")
    security: int = Field(..., description="安全 (0-100)")
    conformity: int = Field(..., description="從眾 (0-100)")
    tradition: int = Field(..., description="傳統 (0-100)")
    benevolence: int = Field(..., description="仁慈 (0-100)")
    universalism: int = Field(..., description="普世價值 (0-100)")
    confidence: float = Field(..., description="此模組的信心分數 (0.0-1.0)")

# --- 3. 財務與風險模組 ---
class RiskProfile(BaseModel):
    overall: int = Field(..., description="整體風險承受度 (0-100)")
    financial: int = Field(..., description="財務投資風險承受度 (0-100)")
    ethical: int = Field(..., description="道德風險傾向 (0-100)")
    confidence: float = Field(..., description="此模組的信心分數 (0.0-1.0)")

class FinancialDisposition(BaseModel):
    long_term_orientation: int = Field(..., description="長期投資導向 (0-100)")
    loss_aversion: int = Field(..., description="損失規避程度 (0-100)")
    decision_style: str = Field(..., description="決策風格: Analytical 或 Intuitive")

# --- 4. 完整的 PPV 結構 ---
class PPVInstance(BaseModel):
    id: str = Field(..., description="User ID")
    version: str = Field(..., description="Schema Version (請填寫 v1.0)") 
    
    # 這裡移除了 default 值，並改用明確的 Class
    source_summary: SourceSummary 

    # 各大模組 (這裡保留 Optional 是允許的，但 OpenAI 會明確輸出 null 或物件)
    big5: BigFive
    schwartz_values: Optional[SchwartzValues] = None
    risk_profile: Optional[RiskProfile] = None
    financial_disposition: Optional[FinancialDisposition] = None

    # 元數據 (移除了 Dict，改用明確 Class)
    meta: MetaInfo