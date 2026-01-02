import React, { useState, useEffect } from 'react';
import { PPVInstance } from '../../types/ppv'; 
import '../PPVAnalyzer/style.css'; 

export const MarketSimulator = () => {
  // --- 頁面狀態 ---
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(false);
  
  // --- 資料庫 ---
  const [currentPersonas, setCurrentPersonas] = useState<PPVInstance[]>([]);
  const [historyPersonas, setHistoryPersonas] = useState<PPVInstance[]>([]);
  
  // --- 訪談狀態 (優化：加入 Context 與 單題廣播) ---
  const [contextInfo, setContextInfo] = useState(""); // 產品情境/DM
  const [currentQuestion, setCurrentQuestion] = useState(""); // 當前問題
  const [isInterviewing, setIsInterviewing] = useState(false); // 訪談 Loading
  const [targetAudience, setTargetAudience] = useState("");

  // 1. 初始化：載入歷史
  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/personas');
      const data = await res.json();
      if (Array.isArray(data)) setHistoryPersonas(data.reverse());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchHistory(); }, []);

  // 2. 生成客戶
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

  // 3. 廣播訪談 (優化：平行處理 + 情境注入)
  const handleBroadcastAsk = async () => {
    if (currentPersonas.length === 0) return alert("請先生成客戶！");
    if (!currentQuestion.trim()) return alert("請輸入問題！");
    
    setIsInterviewing(true);
    
    // 建立副本以進行更新
    const updatedPersonas = [...currentPersonas];

    try {
      // 🔥 速度優化：使用 Promise.all 讓所有人「同時」思考，不用排隊
      await Promise.all(updatedPersonas.map(async (persona) => {
        if (!persona.interview_history) persona.interview_history = [];

        // 呼叫後端 (帶入 Context)
        const res = await fetch('http://localhost:8000/api/chat_with_twin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ppv_profile: persona, 
            user_query: currentQuestion,
            context_data: contextInfo // ✅ 傳送情境資料 (DM/新聞)
          })
        });
        const data = await res.json();
        
        // 更新記憶 (Push history)
        persona.interview_history.push({
          question: currentQuestion,
          answer: data.response,
          timestamp: new Date().toISOString()
        });

        // 即時存檔 (Update Persona)
        await fetch('http://localhost:8000/api/update_persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(persona)
        });
      }));
      
      // 更新畫面與狀態
      setCurrentPersonas(updatedPersonas);
      fetchHistory();
      setCurrentQuestion(""); // 發送完清空問題框，方便問下一題

    } catch (e) {
      console.error(e);
      alert("訪談發生錯誤");
    } finally {
      setIsInterviewing(false);
    }
  };

  // 4. 清空歷史
  const handleClearHistory = async () => {
    if (!confirm("確定清空？")) return;
    await fetch('http://localhost:8000/api/personas', { method: 'DELETE' });
    setHistoryPersonas([]);
    setCurrentPersonas([]);
  };

  return (
    // paddingBottom 留給底部的固定輸入框
    <div className="ppv-card" style={{ paddingBottom: '140px' }}>
      <div className="ppv-header" style={{borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px'}}>
        <h3 className="ppv-title">📊 合成市場調查實驗室</h3>
        <div style={{display: 'flex', gap: '5px'}}>
          <TabButton label="🎯 當前訪談" isActive={activeTab === 'current'} onClick={() => setActiveTab('current')} />
          <TabButton label="📜 歷史存檔" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        </div>
      </div>

      {activeTab === 'current' && (
        <div className="animate-fade-in">
          {/* 生成區 */}
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <input type="text" className="ppv-textarea" style={{ minHeight: '40px', marginBottom: 0 }} placeholder="設定客群：例如 30歲科技業工程師..." value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
            <button className="ppv-button" style={{ width: '120px', background: '#059669' }} onClick={handleGenerate} disabled={loading || isInterviewing}>
              {loading ? '生成中...' : '🎲 生成'}
            </button>
          </div>

          {/* 客戶列表 */}
          {currentPersonas.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
              {currentPersonas.map((p, i) => (
                <PersonaCard key={i} p={p} defaultExpanded={true} />
              ))}
            </div>
          ) : (
            !loading && <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px'}}>👋 請先生成受訪者，才能開始進行訪談。</div>
          )}

          {/* 🔥 優化介面：底部控制台 (左邊貼文案，右邊問問題) */}
          {currentPersonas.length > 0 && (
            <div style={{ 
              position: 'fixed', bottom: 0, left: 0, right: 0, 
              background: 'white', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
              padding: '20px', zIndex: 100, display: 'flex', justifyContent: 'center'
            }}>
              <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                
                {/* 左邊：情境輸入 (Context) */}
                <div style={{ width: '35%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b'}}>📌 產品/情境描述 (Context)</span>
                  <textarea 
                    className="ppv-textarea"
                    style={{ minHeight: '80px', height: '80px', fontSize: '0.85rem', marginBottom: 0, background: '#fffbeb', borderColor: '#fcd34d' }}
                    placeholder="請在此貼上產品 DM、新聞或情境背景..."
                    value={contextInfo}
                    onChange={(e) => setContextInfo(e.target.value)}
                  />
                </div>

                {/* 右邊：問題輸入 (Question) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b'}}>❓ 訪談問題 (Question)</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <textarea 
                      className="ppv-textarea"
                      style={{ flex: 1, minHeight: '80px', height: '80px', marginBottom: 0, fontSize: '1rem', borderColor: '#3b82f6' }}
                      placeholder="針對左邊的情境，你想問他們什麼？"
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleBroadcastAsk(); } }}
                    />
                    <button 
                      className="ppv-button" 
                      style={{ width: '100px', height: '80px', borderRadius: '8px', background: 'linear-gradient(to right, #3b82f6, #2563eb)' }} 
                      onClick={handleBroadcastAsk} 
                      disabled={isInterviewing}
                    >
                      {isInterviewing ? '...' : '發送 🚀'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 歷史區 */}
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

// --- 元件：Tab 按鈕 ---
const TabButton = ({ label, isActive, onClick }: any) => (
  <button onClick={onClick} style={{
    padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
    background: isActive ? '#dbeafe' : 'transparent', color: isActive ? '#1e40af' : '#64748b'
  }}>{label}</button>
);

// --- 元件：人物卡片 (優化：Highlight 最新回答) ---
const PersonaCard = ({ p, isHistory = false, defaultExpanded = false }: any) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // 取得訪談紀錄 (倒序，讓最新的在最上面)
  const records = [...(p.interview_history || [])].reverse(); 

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', background: 'white', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '5px' }}>
          👤 {p.id}
        </div>
        {isHistory && <span style={{fontSize: '0.7rem', background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px'}}>History</span>}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px', background: '#f8fafc', padding: '8px', borderRadius: '6px', maxHeight: '60px', overflowY: 'auto' }}>
        {p.notes || "無背景描述"}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {records.length > 0 ? (
          <>
            {/* 最新回答高亮顯示 */}
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginBottom: '4px', fontWeight: 'bold' }}>Q: {records[0].question}</div>
              <div style={{ fontSize: '0.9rem', color: '#1e3a8a', lineHeight: '1.5' }}>{records[0].answer}</div>
            </div>
            
            {/* 歷史回答摺疊區 */}
            {records.length > 1 && (
              <div>
                <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', textAlign: 'center', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
                  {expanded ? '▲ 收起' : `▼ 查看舊紀錄 (${records.length - 1})`}
                </button>
                {expanded && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {records.slice(1).map((r: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '0.85rem', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '2px' }}>Q: {r.question}</div>
                        <div style={{ color: '#475569' }}>{r.answer}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{textAlign: 'center', color: '#cbd5e1', fontSize: '0.8rem', marginTop: 'auto', paddingBottom: '10px'}}>等待提問...</div>
        )}
      </div>
    </div>
  );
};