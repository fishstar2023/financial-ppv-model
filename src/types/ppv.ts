// src/types/ppv.ts
export interface BigFive {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

// 定義完整的 PPV 結構
export interface PPVInstance {
  interview_history: any;
  financial_disposition: any;
  notes: string;  // 人物基本資料 (Demographic Profile)
  risk_profile: any;
  id: string;
  version: string;
  big5: BigFive;
  interviewer_notes?: string;  // 訪談者筆記 (Interviewer Notes)
  // ... 其他欄位依照需求加入
}