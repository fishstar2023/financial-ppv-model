import React, { useState } from 'react';
import { PPVInstance } from '../../types/ppv'; // 引用您的型別定義
import '../../style.css';// 引入樣式

export const MarketSimulator = () => {
  // --- 狀態管理 ---
  const [targetAudience, setTargetAudience] = useState("");
  const [generatedPersonas, setGeneratedPersonas] = useState<PPVInstance[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 新增：訪談相關狀態
  const [questions, setQuestions] = useState("Q1: 你目前主要的理財工具是什麼？\nQ2: 你會考慮購買投資型保單嗎？為什麼？");
  const [interviewResults, setInterviewResults] = useState<any[]>([]); // 存結果
  const [isInterviewing, setIsInterviewing] = useState(false);

  // --- API 1: 生成客戶 (您原本已經成功的部分) ---
  const handleGenerate = async () => {
    if (!targetAudience) return alert("請輸入目標客群！");
    setLoading(true);
    setInterviewResults([]); // 清空舊的訪談結果
    try {
      const res = await fetch('http://localhost:8000/api/generate_personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint: targetAudience, count: 3 })
      });
      const data = await res.json();
      setGeneratedPersonas(data);
    } catch (e) {
      alert("生成失敗，請確認後端 server 是否啟動");
    } finally {
      setLoading(false);
    }
  };

  // --- API 2: 批量訪談 (新增的核心功能) ---
  const handleBatchInterview = async () => {
    if (generatedPersonas.length === 0) return alert("請先生成客戶！");
    if (!questions.trim()) return alert("請輸入訪談問題！");
    
    setIsInterviewing(true);
    setInterviewResults([]); // 清空舊結果
    
    const questionList = questions.split('\n').filter(q => q.trim() !== ""); // 分割問題
    const allResults = [];

    try {
      // 迴圈 1: 遍歷每一位虛擬客戶
      for (const persona of generatedPersonas) {
        const personaAnswers = [];
        
        // 迴圈 2: 問他每一個問題
        for (const q of questionList) {
          // 呼叫原本的「數位孿生對話」API
          const res = await fetch('http://localhost:8000/api/chat_with_twin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              ppv_profile: persona, // 把這位客戶的人格檔傳過去
              user_query: q         // 把問題傳過去
            })
          });
          
          const data = await res.json();
          personaAnswers.push({ question: q, answer: data.response });
        }

        // 存下這位客戶的所有回答
        allResults.push({
          persona_id: persona.id,
          role: persona.risk_profile?.decision_style || "Unknown",
          answers: personaAnswers
        });
      }
      
      setInterviewResults(allResults); // 更新畫面
    } catch (e) {
      console.error(e);
      alert("訪談過程中發生錯誤");
    } finally {
      setIsInterviewing(false);
    }
  };

  return (
    <div className="ppv-card">
      <div className="ppv-header">
        <h3 className="ppv-title">📊 合成市場調查實驗室</h3>
        <span className="ppv-badge" style={{background: '#dcfce7', color: '#166534'}}>Phase 4: Simulation</span>
      </div>

      <p className="ppv-desc">
        在此模式下，AI 將根據描述自動生成多樣化的虛擬受訪者 (PPV)，並進行批量訪談。
      </p>

      {/* === 區塊 1: 設定目標客群 === */}
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <label className="result-label" style={{ marginBottom: '8px', display: 'block' }}>
          設定目標客群 (Target Audience)
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text"
            className="ppv-textarea"
            style={{ minHeight: '50px', marginBottom: 0, height: '50px' }}
            placeholder="例如：住在越南的年輕工程師..."
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
          />
          <button 
            className="ppv-button" 
            style={{ width: '150px', background: '#059669' }}
            onClick={handleGenerate}
            disabled={loading || isInterviewing}
          >
            {loading ? '生成中...' : '🎲 生成客戶'}
          </button>
        </div>
      </div>

      {/* === 區塊 2: 顯示已生成客戶 (您截圖中的畫面) === */}
      {generatedPersonas.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>已生成的虛擬客戶 ({generatedPersonas.length})：</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            {generatedPersonas.map((p, i) => (
              <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', background: 'white' }}>
                <div style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '5px' }}>
                  👤 {p.id}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px', height: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.notes || "無背景描述"}
                </div>
                <div className="result-grid" style={{ marginTop: '0', gap: '5px' }}>
                  <div className="result-item" style={{ padding: '5px' }}>
                    <span className="result-label">風險承受</span>
                    <span className="result-value" style={{fontSize: '0.9rem'}}>{p.risk_profile?.overall}</span>
                  </div>
                  <div className="result-item" style={{ padding: '5px' }}>
                    <span className="result-label">開放性</span>
                    <span className="result-value" style={{fontSize: '0.9rem'}}>{p.big5.openness}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === 區塊 3: 批量訪談設定 (新增功能) === */}
      {generatedPersonas.length > 0 && (
        <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '20px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎤 批量訪談設定
          </h4>
          
          <p className="text-xs text-gray-500 mb-2">請輸入您想問的問題 (每行一題)，AI 將自動訪問上述所有客戶。</p>
          
          <textarea
            className="ppv-textarea"
            style={{ minHeight: '100px', background: '#fffbeb', borderColor: '#fcd34d' }}
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            placeholder="Q1: ..."
          />

          <button 
            className="ppv-button" 
            style={{ background: 'linear-gradient(to right, #ea580c, #f97316)' }}
            onClick={handleBatchInterview}
            disabled={isInterviewing}
          >
            {isInterviewing ? '⏳ 正在進行訪談與分析...' : '🚀 開始批量訪談 (Batch Interview)'}
          </button>
        </div>
      )}

      {/* === 區塊 4: 訪談結果報告 === */}
      {interviewResults.length > 0 && (
        <div className="ppv-result" style={{ marginTop: '30px', background: '#fff' }}>
          <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>📈 市場分析報告</h3>
          
          {interviewResults.map((res, i) => (
            <div key={i} style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', color: '#1e40af' }}>受訪者: {res.persona_id}</span>
                <span style={{ fontSize: '0.8rem', background: '#dbeafe', padding: '2px 8px', borderRadius: '10px' }}>
                  決策風格: {res.role}
                </span>
              </div>
              
              {res.answers.map((ans: any, j: number) => (
                <div key={j} style={{ marginBottom: '10px', fontSize: '0.9rem' }}>
                  <div style={{ color: '#64748b', fontWeight: '500' }}>Q: {ans.question}</div>
                  <div style={{ marginTop: '4px', paddingLeft: '10px', borderLeft: '3px solid #3b82f6', color: '#334155' }}>
                    {ans.answer}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};