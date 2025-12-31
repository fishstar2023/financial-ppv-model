import React, { useState, useEffect } from 'react';
import { PPVInstance } from '../../types/ppv'; 
import '../PPVAnalyzer/style.css'; 

export const MarketSimulator = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(false);
  const [currentPersonas, setCurrentPersonas] = useState<PPVInstance[]>([]);
  const [historyPersonas, setHistoryPersonas] = useState<PPVInstance[]>([]);
  
  const [questions, setQuestions] = useState("Q1: 你目前主要的理財工具是什麼？\nQ2: 你會考慮購買投資型保單嗎？為什麼？");
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");

  // 載入歷史資料
  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/personas');
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistoryPersonas(data.reverse());
      }
    } catch (e) {
      console.error("讀取歷史失敗", e);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  // 生成客戶
  const handleGenerate = async () => {
    if (!targetAudience) return alert("請輸入目標客群！");
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/generate_personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint: targetAudience, count: 3 })
      });
      const data = await res.json();
      setCurrentPersonas(data); 
      fetchHistory();
    } catch (e) {
      alert("生成失敗");
    } finally {
      setLoading(false);
    }
  };

  // 批量訪談 (包含自動存檔功能)
  const handleBatchInterview = async () => {
    if (currentPersonas.length === 0) return alert("請先生成客戶！");
    if (!questions.trim()) return alert("請輸入訪談問題！");
    
    setIsInterviewing(true);
    const questionList = questions.split('\n').filter(q => q.trim() !== "");
    
    // 我們要更新 currentPersonas 的內容
    const updatedPersonas = [...currentPersonas];

    try {
      for (let i = 0; i < updatedPersonas.length; i++) {
        const persona = updatedPersonas[i];
        // 確保 interview_history 陣列存在
        if (!persona.interview_history) persona.interview_history = [];

        for (const q of questionList) {
          const res = await fetch('http://localhost:8000/api/chat_with_twin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ppv_profile: persona, user_query: q })
          });
          const data = await res.json();
          
          // 1. 把問答塞進這個人的記憶裡
          persona.interview_history.push({
            question: q,
            answer: data.response,
            timestamp: new Date().toISOString()
          });
        }
        
        // 2. 訪談完一個人，立刻呼叫後端存檔 (Update)
        await fetch('http://localhost:8000/api/update_persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(persona)
        });
      }
      
      // 更新前端畫面
      setCurrentPersonas(updatedPersonas);
      fetchHistory(); // 更新歷史區的資料
      alert("訪談完成並已存檔！請查看下方紀錄。");

    } catch (e) {
      console.error(e);
      alert("訪談或存檔失敗");
    } finally {
      setIsInterviewing(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("確定清空？")) return;
    await fetch('http://localhost:8000/api/personas', { method: 'DELETE' });
    setHistoryPersonas([]);
    setCurrentPersonas([]);
  };

  return (
    <div className="ppv-card">
      <div className="ppv-header" style={{borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px'}}>
        <h3 className="ppv-title">📊 合成市場調查實驗室</h3>
        <div style={{display: 'flex', gap: '5px'}}>
          <TabButton label="🎯 當前模擬" isActive={activeTab === 'current'} onClick={() => setActiveTab('current')} />
          <TabButton label={`📜 歷史資料庫 (${historyPersonas.length})`} isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        </div>
      </div>

      {activeTab === 'current' && (
        <div className="animate-fade-in">
          {/* 生成區 */}
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <input type="text" className="ppv-textarea" style={{ minHeight: '50px', marginBottom: 0 }} placeholder="例如：住在台南的退休公務員..." value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
            <button className="ppv-button" style={{ width: '150px', background: '#059669' }} onClick={handleGenerate} disabled={loading || isInterviewing}>
              {loading ? '生成中...' : '🎲 生成新批次'}
            </button>
          </div>

          {/* 當前客戶列表 (帶有訪談紀錄) */}
          {currentPersonas.length > 0 && (
            <>
              <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>當前批次受訪者：</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                {currentPersonas.map((p, i) => <PersonaCard key={i} p={p} defaultExpanded={true} />)}
              </div>

              {/* 訪談設定 */}
              <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '20px' }}>
                <h4 style={{marginBottom: '5px'}}>🎤 批量訪談設定</h4>
                <textarea className="ppv-textarea" style={{ minHeight: '80px', background: '#fffbeb', borderColor: '#fcd34d' }} value={questions} onChange={(e) => setQuestions(e.target.value)} />
                <button className="ppv-button" style={{ background: 'linear-gradient(to right, #ea580c, #f97316)' }} onClick={handleBatchInterview} disabled={isInterviewing}>
                  {isInterviewing ? '⏳ 正在進行訪談與存檔...' : '🚀 開始批量訪談 (並自動存檔)'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animate-fade-in">
          <div style={{textAlign: 'right', marginBottom: '10px'}}>
             <button onClick={handleClearHistory} style={{color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer'}}>🗑️ 清空資料庫</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {historyPersonas.map((p, i) => <PersonaCard key={i} p={p} isHistory />)}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 元件：按鈕 ---
const TabButton = ({ label, isActive, onClick }: any) => (
  <button onClick={onClick} style={{
    padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
    background: isActive ? '#dbeafe' : 'transparent', color: isActive ? '#1e40af' : '#64748b'
  }}>{label}</button>
);

// --- 元件：人物卡片 (支援展開顯示紀錄) ---
const PersonaCard = ({ p, isHistory = false, defaultExpanded = false }: any) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const records = p.interview_history || []; // 取得訪談紀錄

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', background: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', color: '#2563eb' }}>👤 {p.id}</div>
        {isHistory && <span style={{fontSize: '0.7rem', background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px'}}>History</span>}
      </div>
      
      <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '10px', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
        {p.notes || "無背景描述"}
      </div>

      {/* 顯示訪談紀錄區塊 */}
      {records.length > 0 ? (
        <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <button 
            onClick={() => setExpanded(!expanded)}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
          >
            {expanded ? '▼ 收合訪談紀錄' : `▶ 查看訪談紀錄 (${records.length})`}
          </button>
          
          {expanded && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {records.map((r: any, idx: number) => (
                <div key={idx} style={{ fontSize: '0.85rem', background: '#ecfdf5', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#047857', fontWeight: 'bold', marginBottom: '4px' }}>Q: {r.question}</div>
                  <div style={{ color: '#334155' }}>A: {r.answer}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{fontSize: '0.8rem', color: '#cbd5e1', textAlign: 'center', marginTop: '10px'}}>尚無訪談紀錄</div>
      )}
    </div>
  );
};