import React, { useState } from 'react';
import './styles.css'; 

// 引入兩個功能模組
import { PPVAnalyzer } from './features/PPVAnalyzer';     // 舊的：單人提取
import { MarketSimulator } from './features/MarketSimulator'; // 新的：市場模擬

function App() {
  // 控制現在要顯示哪個畫面
  const [activeTab, setActiveTab] = useState('individual'); // 預設顯示單人

  return (
    <div className="app-layout">
      {/* === 左側導航欄 === */}
      <aside className="sidebar">
        <div style={{ padding: '20px', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🧠 PPV Lab</h2>
        </div>
        
        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'individual' ? 'active' : ''}`}
            onClick={() => setActiveTab('individual')}
          >
            <span style={{ marginRight: '10px' }}>🧬</span>
            單人提取 (Extraction)
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'market' ? 'active' : ''}`}
            onClick={() => setActiveTab('market')}
          >
            <span style={{ marginRight: '10px' }}>📊</span>
            市場模擬 (Simulation)
          </button>
        </nav>
      </aside>

      {/* === 右側主畫面 === */}
      <main className="main-content">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          
          {/* 根據 activeTab 決定顯示哪個元件 */}
          
          {activeTab === 'individual' ? (
            // 這是您原本截圖裡的畫面
            <PPVAnalyzerWrapper />
          ) : (
            // 這是新畫面：輸入信用卡客群的地方
            <MarketSimulator />
          )}
          
        </div>
      </main>
    </div>
  );
}

// 簡單包裝原本的提取邏輯
function PPVAnalyzerWrapper() {
  // 這裡可以復用您原本寫在 App.jsx 裡的聊天邏輯
  // 為了簡化，我先直接呼叫 PPVAnalyzer 元件
  return (
    <>
      <h2 style={{ marginBottom: '10px' }}>單人數位孿生</h2>
      <PPVAnalyzer onAnalysisComplete={(data) => console.log(data)} />
    </>
  )
}

export default App;