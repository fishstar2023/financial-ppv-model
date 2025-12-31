// src/services/ppv.ts
import { PPVInstance } from '../types/ppv';

// 定義後端網址 (建議之後寫在環境變數)
const API_URL = 'http://localhost:8000/api';

export const PPVService = {
  // 提取人格
  extractPPV: async (chatLog: string): Promise<PPVInstance> => {
    const res = await fetch(`${API_URL}/extract_ppv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_log: chatLog })
    });
    if (!res.ok) throw new Error('提取失敗');
    return res.json();
  },

  // 數位孿生對話
  chatWithTwin: async (ppvProfile: PPVInstance, query: string) => {
    const res = await fetch(`${API_URL}/chat_with_twin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ppv_profile: ppvProfile, user_query: query })
    });
    return res.json();
  }
};