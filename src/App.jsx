import './styles.css';
import { useState } from 'react';
import { MarketSimulator } from './features/MarketSimulator';
import { VietnamInterview } from './features/VietnamInterview';
import { VietnamInterview2 } from './features/VietnamInterview2';
import { PPVDashboard } from './features/PPVDashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'market' | 'vietnam' | 'vietnam2' | 'ppv' | 'config'

  // 首頁 - 簡潔美觀版
  if (currentPage === 'home') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f5f2ef 0%, #e8e4df 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 40px'
      }}>
        {/* Settings 按鈕 - 右上角固定 */}
        <button
          onClick={() => setCurrentPage('config')}
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            width: '44px',
            height: '44px',
            background: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            transition: 'all 0.2s ease',
            fontSize: '20px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
          }}
          title="Settings"
        >
          ⚙️
        </button>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{
            width: '88px',
            height: '88px',
            background: 'linear-gradient(135deg, #9b8b7d 0%, #7d6e62 100%)',
            borderRadius: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            boxShadow: '0 12px 40px rgba(125, 110, 98, 0.25)'
          }}>
            <span style={{ fontSize: '44px' }}>🔬</span>
          </div>
          <h1 style={{
            margin: '0 0 12px 0',
            fontSize: '38px',
            fontWeight: 700,
            color: '#4a4a4a',
            letterSpacing: '-0.03em'
          }}>
            AI Research Platform
          </h1>
          <p style={{
            margin: 0,
            fontSize: '17px',
            color: '#8b8178',
            maxWidth: '400px'
          }}>
            模擬消費者人格，進行智能訪談研究
          </p>
        </div>

        {/* Main Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          maxWidth: '800px',
          width: '100%',
          marginBottom: '40px'
        }}>
          {/* Taiwan Market */}
          <button
            onClick={() => setCurrentPage('market')}
            style={{
              background: 'white',
              border: 'none',
              borderRadius: '24px',
              padding: '32px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(139, 115, 101, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)';
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #a89b8e 0%, #8b7365 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '28px' }}>🇹🇼</span>
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 700, color: '#4a4a4a' }}>
              台灣市場研究
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#8b8178', lineHeight: '1.6' }}>
              生成多元人格的消費者 Persona，進行批量訪談與數據分析
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b7365', fontSize: '14px', fontWeight: 600 }}>
              開始研究 <span>→</span>
            </div>
          </button>

          {/* Vietnam Market */}
          <button
            onClick={() => setCurrentPage('vietnam')}
            style={{
              background: 'white',
              border: 'none',
              borderRadius: '24px',
              padding: '32px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(130, 140, 128, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)';
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #9da89b 0%, #828c80 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '28px' }}>🇻🇳</span>
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 700, color: '#4a4a4a' }}>
              越南市場研究
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#8b8178', lineHeight: '1.6' }}>
              旅遊保險用戶研究，AI 驅動的越南消費者洞察
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#828c80', fontSize: '14px', fontWeight: 600 }}>
              開始研究 <span>→</span>
            </div>
          </button>
        </div>

        {/* Secondary Tools */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '48px'
        }}>
          <button
            onClick={() => setCurrentPage('vietnam2')}
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '14px',
              padding: '14px 24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '20px' }}>📋</span>
            <span style={{ color: '#6b635b', fontWeight: 500, fontSize: '14px' }}>觀察記錄</span>
          </button>

          <button
            onClick={() => setCurrentPage('ppv')}
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '14px',
              padding: '14px 24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '20px' }}>📊</span>
            <span style={{ color: '#6b635b', fontWeight: 500, fontSize: '14px' }}>PPV 監控</span>
          </button>

          <button
            onClick={() => window.open('https://github.com/fishstar2023/financial-ppv-model', '_blank')}
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '14px',
              padding: '14px 24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '20px' }}>📖</span>
            <span style={{ color: '#6b635b', fontWeight: 500, fontSize: '14px' }}>文件說明</span>
          </button>
        </div>

        {/* Footer Info */}
        <div style={{
          display: 'flex',
          gap: '32px',
          color: '#a8a099',
          fontSize: '13px'
        }}>
          <span>Version 1.0.0</span>
          <span>•</span>
          <span>GPT-4o + Agno</span>
          <span>•</span>
          <span>React 19</span>
        </div>
      </div>
    );
  }

  // Config / Settings Page
  if (currentPage === 'config') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f2ef 0%, #e8e4df 100%)',
        padding: '40px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <button
              onClick={() => setCurrentPage('home')}
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(155, 139, 125, 0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#7d6e62'
              }}
            >
              ←
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#4a4a4a' }}>
                Settings
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#a8a099' }}>
                系統設定與配置
              </p>
            </div>
          </div>

          {/* Settings Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* API Configuration */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(155, 139, 125, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#4a4a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔑</span> API Configuration
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(155, 139, 125, 0.06)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b635b' }}>OpenAI API Key</span>
                  <span style={{ fontSize: '13px', color: '#a8a099', fontFamily: 'monospace' }}>sk-****...****</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(155, 139, 125, 0.06)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b635b' }}>Model</span>
                  <span style={{ fontSize: '13px', color: '#8b7365', fontWeight: 500 }}>gpt-4o</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(155, 139, 125, 0.06)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b635b' }}>Backend Port</span>
                  <span style={{ fontSize: '13px', color: '#8b7365', fontWeight: 500 }}>8787</span>
                </div>
              </div>
            </div>

            {/* PPV Settings */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(157, 168, 155, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#4a4a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎛️</span> PPV Settings
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(157, 168, 155, 0.06)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b635b' }}>Temperature</span>
                  <span style={{ fontSize: '13px', color: '#828c80', fontWeight: 500 }}>0.9</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(157, 168, 155, 0.06)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b635b' }}>Schema Version</span>
                  <span style={{ fontSize: '13px', color: '#828c80', fontWeight: 500 }}>2.0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(157, 168, 155, 0.06)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b635b' }}>Diversity Score Target</span>
                  <span style={{ fontSize: '13px', color: '#828c80', fontWeight: 500 }}>≥ 75%</span>
                </div>
              </div>
            </div>

            {/* About */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(155, 139, 125, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#4a4a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ℹ️</span> About
              </h3>
              <div style={{ fontSize: '14px', color: '#6b635b', lineHeight: '1.8' }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>AI Research Platform</strong> - Market Research Simulator
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  Version: <span style={{ color: '#8b7365', fontWeight: 500 }}>1.0.0</span>
                </p>
                <p style={{ margin: 0, color: '#a8a099', fontSize: '13px' }}>
                  Built with React 19 + FastAPI + Agno + OpenAI GPT-4o
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f8fa 0%, #e8eef3 100%)',
      padding: '0'
    }}>
      {/* 頂部欄 */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(157, 180, 199, 0.2)',
        padding: '20px 32px',
        boxShadow: '0 2px 12px rgba(90, 107, 122, 0.08)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Home Button */}
            <button
              onClick={() => setCurrentPage('home')}
              style={{
                width: '40px',
                height: '40px',
                background: currentPage === 'market'
                  ? 'linear-gradient(135deg, #9db4c7 0%, #7a95ab 100%)'
                  : currentPage === 'vietnam2'
                    ? 'linear-gradient(135deg, #7a95ab 0%, #5a7a8a 100%)'
                    : currentPage === 'ppv'
                      ? 'linear-gradient(135deg, #a8859e 0%, #8a6580 100%)'
                      : 'linear-gradient(135deg, #8b9e85 0%, #6b8065 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 600,
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(90, 107, 122, 0.15)',
                transition: 'all 0.3s ease',
                border: 'none',
                cursor: 'pointer'
              }}
              title="Back to Home"
            >
              {currentPage === 'market' ? 'M' : currentPage === 'vietnam2' ? 'O' : currentPage === 'ppv' ? 'P' : 'V'}
            </button>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 600,
                color: '#5a6b7a',
                letterSpacing: '-0.02em'
              }}>
                {currentPage === 'market' ? 'Market Research Simulator' : currentPage === 'vietnam2' ? 'Observer Notes' : currentPage === 'ppv' ? 'PPV Dashboard' : 'Vietnam Interview'}
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#8599a8', fontSize: '14px', fontWeight: 400 }}>
                {currentPage === 'market'
                  ? 'Synthetic Persona Interview Platform'
                  : currentPage === 'vietnam2'
                    ? 'Third-Party Observation Records'
                    : currentPage === 'ppv'
                      ? 'Real-time Persona Diversity Monitoring'
                      : 'Travel Insurance User Research'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '8px' }}>
            <NavButton
              label="Home"
              isActive={false}
              onClick={() => setCurrentPage('home')}
            />
            <NavButton
              label="Market Simulator"
              isActive={currentPage === 'market'}
              onClick={() => setCurrentPage('market')}
            />
            <NavButton
              label="Vietnam Interview"
              isActive={currentPage === 'vietnam'}
              onClick={() => setCurrentPage('vietnam')}
            />
            <NavButton
              label="Observer Notes"
              isActive={currentPage === 'vietnam2'}
              onClick={() => setCurrentPage('vietnam2')}
            />
            <NavButton
              label="PPV Dashboard"
              isActive={currentPage === 'ppv'}
              onClick={() => setCurrentPage('ppv')}
            />
          </nav>
        </div>
      </header>

      {/* 主內容區 */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 32px' }}>
        {currentPage === 'market' && <MarketSimulator />}
        {currentPage === 'vietnam' && <VietnamInterview />}
        {currentPage === 'vietnam2' && <VietnamInterview2 />}
        {currentPage === 'ppv' && <PPVDashboard />}
      </main>
    </div>
  );
}

// Navigation Button Component
const NavButton = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      border: 'none',
      borderRadius: '12px',
      background: isActive
        ? 'linear-gradient(135deg, #6b8aa3 0%, #557085 100%)'
        : 'rgba(107, 138, 163, 0.1)',
      color: isActive ? 'white' : '#5a6b7a',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: isActive ? '0 4px 12px rgba(107, 138, 163, 0.25)' : 'none'
    }}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'rgba(107, 138, 163, 0.2)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'rgba(107, 138, 163, 0.1)';
      }
    }}
  >
    {label}
  </button>
);

export default App;
