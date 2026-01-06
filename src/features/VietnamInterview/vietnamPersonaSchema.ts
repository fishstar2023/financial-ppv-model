// 越南旅遊險受訪者 Schema
export interface VietnamPersona {
  // 基本身份
  id: string;
  lastName: string;       // 姓氏
  gender: 'Male' | 'Female';
  age: number;
  occupation: string;     // 職業/職稱

  // 旅遊險購買經驗
  timesOfOverseasTravelInsurance: number;  // 購買海外旅遊險次數
  purchasedBrand: string[];                 // 購買過的品牌
  purchasedChannels: string[];              // 購買管道

  // 個人背景
  personalBackground: string;               // 個人背景描述

  // 訪談記錄
  interviewHistory: VietnamInterviewRecord[];

  // 訪談進度
  currentSectionIndex: number;
  currentQuestionIndex: number;
  isCompleted: boolean;

  // 訪談者筆記
  interviewerNotes?: string;

  // 時間戳記
  createdAt: string;
  updatedAt: string;
}

export interface VietnamInterviewRecord {
  sectionId: string;
  questionId: string;
  question: string;
  answer: string;
  timestamp: string;
}

// 用於 AI 生成的請求格式
export interface GenerateVietnamPersonaRequest {
  targetAudience: string;
  count: number;
}

// 預設的越南購買管道選項
export const PURCHASE_CHANNELS = [
  'Official website (官網)',
  'Travel agency (旅行社)',
  'Third-party platform (第三方平台)',
  'Bank/Credit card (銀行/信用卡)',
  'Airport counter (機場櫃台)',
  'Mobile app (手機App)',
  'Other (其他)'
];

// 預設的保險品牌選項 (越南市場)
export const INSURANCE_BRANDS = [
  'Cathay (國泰)',
  'Bao Viet',
  'VBI',
  'Liberty',
  'PVI',
  'Bảo Minh',
  'MIC',
  'PTI',
  'Other (其他)'
];

// 建立空的 Persona
export const createEmptyVietnamPersona = (): VietnamPersona => ({
  id: '',
  lastName: '',
  gender: 'Male',
  age: 30,
  occupation: '',
  timesOfOverseasTravelInsurance: 0,
  purchasedBrand: [],
  purchasedChannels: [],
  personalBackground: '',
  interviewHistory: [],
  currentSectionIndex: 0,
  currentQuestionIndex: 0,
  isCompleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});
