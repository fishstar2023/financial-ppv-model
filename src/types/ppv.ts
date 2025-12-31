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
  id: string;
  version: string;
  big5: BigFive;
  // ... 其他欄位依照需求加入
}