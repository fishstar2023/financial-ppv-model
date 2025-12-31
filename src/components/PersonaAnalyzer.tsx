import React, { useState } from 'react';

// 定義我們要傳出去的 Props，讓外層知道分析完的 JSON 是一個物件
interface PersonaAnalyzerProps {
  onAnalysisComplete: (ppvData: any) => void;
}

export const PersonaAnalyzer: React.FC<PersonaAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [chatLog, setChatLog] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!chatLog) return;
    setLoading(true);

    try {
      // 呼叫我們剛架好的 FastAPI
      const response = await fetch('http://localhost:8000/api/extract_ppv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_log: chatLog, user_id: 'web_user' }),
      });
      
      const data = await response.json();
      // 把拿到的 PPV JSON 傳給父元件 (Main Layout)
      onAnalysisComplete(data);
      alert('人格提取成功！已載入數位孿生。');
    } catch (error) {
      console.error(error);
      alert('連線失敗，請確認後端 server/main.py 有啟動');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className="font-bold mb-2">🧬 PPV 人格提取器</h3>
      <p className="text-xs text-gray-500 mb-2">
        [cite_start]請貼上對話紀錄 (Log)，AI 將自動分析其 Big 5 人格與風險偏好 [cite: 57, 192]。
      </p>
      
      <textarea
        className="w-full h-32 p-2 border rounded text-sm mb-2"
        placeholder="User: 我覺得最近股市..."
        value={chatLog}
        onChange={(e) => setChatLog(e.target.value)}
      />
      
      <button 
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'AI 分析中...' : '開始提取人格'}
      </button>
    </div>
  );
};