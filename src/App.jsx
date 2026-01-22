import './styles.css';
import { useState } from 'react';
import { MarketSimulator } from './features/MarketSimulator';
import { VietnamInterview } from './features/VietnamInterview';
import { VietnamInterview2 } from './features/VietnamInterview2';
import { PPVDashboard } from './features/PPVDashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'market' | 'vietnam' | 'vietnam2' | 'ppv' | 'config'

  // 首頁 - 重新設計的清晰動線
  if (currentPage === 'home') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f8fa 0%, #e8eef3 100%)',
        padding: '40px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Top Bar with Logo & Config */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '48px'
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #6b8aa3 0%, #557085 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(90, 107, 122, 0.2)'
              }}>
                <span style={{ fontSize: '28px' }}>🔬</span>
              </div>
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#3a4a5a'
                }}>
                  AI Research Platform
                </h1>
                <p style={{ margin: 0, fontSize: '13px', color: '#8599a8' }}>
                  Synthetic Persona Generation & Interview Simulation
                </p>
              </div>
            </div>

            {/* Config Button */}
            <button
              onClick={() => setCurrentPage('config')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(107, 138, 163, 0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                color: '#5a6b7a',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(90, 107, 122, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(107, 138, 163, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              }}
            >
              <span style={{ fontSize: '18px' }}>⚙️</span>
              Settings
            </button>
          </div>

          {/* Main Research Tools Section */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #6b8aa3 0%, #557085 100%)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                RESEARCH TOOLS
              </span>
              <span style={{ color: '#8599a8', fontSize: '13px' }}>
                主要研究工具
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              {/* Market Simulator - Main Tool */}
              <button
                onClick={() => setCurrentPage('market')}
                style={{
                  background: 'linear-gradient(135deg, rgba(107, 138, 163, 0.08) 0%, rgba(107, 138, 163, 0.02) 100%)',
                  border: '2px solid rgba(107, 138, 163, 0.2)',
                  borderRadius: '20px',
                  padding: '28px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(107, 138, 163, 0.5)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(107, 138, 163, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(107, 138, 163, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'linear-gradient(135deg, #9db4c7 0%, #7a95ab 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(107, 138, 163, 0.3)',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '32px' }}>👥</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#3a4a5a' }}>
                        Market Simulator
                      </h2>
                      <span style={{
                        background: '#6b8aa3',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600
                      }}>
                        TW
                      </span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#6b7c8a', lineHeight: '1.5' }}>
                      台灣市場 Persona 生成與訪談模擬平台
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(107, 138, 163, 0.1)', color: '#6b8aa3', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        Persona 生成
                      </span>
                      <span style={{ background: 'rgba(107, 138, 163, 0.1)', color: '#6b8aa3', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        批量訪談
                      </span>
                      <span style={{ background: 'rgba(107, 138, 163, 0.1)', color: '#6b8aa3', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        數據分析
                      </span>
                    </div>
                  </div>
                  <span style={{ color: '#6b8aa3', fontSize: '24px' }}>→</span>
                </div>
              </button>

              {/* Vietnam Interview - Main Tool */}
              <button
                onClick={() => setCurrentPage('vietnam')}
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 158, 133, 0.08) 0%, rgba(139, 158, 133, 0.02) 100%)',
                  border: '2px solid rgba(139, 158, 133, 0.2)',
                  borderRadius: '20px',
                  padding: '28px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(139, 158, 133, 0.5)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 158, 133, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(139, 158, 133, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'linear-gradient(135deg, #8b9e85 0%, #6b8065 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(139, 158, 133, 0.3)',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '32px' }}>🇻🇳</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#3a4a5a' }}>
                        Vietnam Interview
                      </h2>
                      <span style={{
                        background: '#6b8065',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600
                      }}>
                        VN
                      </span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#6b7c8a', lineHeight: '1.5' }}>
                      越南旅遊保險用戶研究與消費者洞察
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(139, 158, 133, 0.1)', color: '#6b8065', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        AI 訪談
                      </span>
                      <span style={{ background: 'rgba(139, 158, 133, 0.1)', color: '#6b8065', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        保險研究
                      </span>
                      <span style={{ background: 'rgba(139, 158, 133, 0.1)', color: '#6b8065', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        消費洞察
                      </span>
                    </div>
                  </div>
                  <span style={{ color: '#6b8065', fontSize: '24px' }}>→</span>
                </div>
              </button>
            </div>
          </div>

          {/* Utility Tools Section */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #8599a8 0%, #6b7c8a 100%)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                UTILITIES
              </span>
              <span style={{ color: '#8599a8', fontSize: '13px' }}>
                輔助工具
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              {/* Observer Notes */}
              <button
                onClick={() => setCurrentPage('vietnam2')}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(122, 149, 171, 0.2)',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(90, 107, 122, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: 'linear-gradient(135deg, #7a95ab 0%, #5a7a8a 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '22px' }}>📋</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#3a4a5a' }}>
                      Observer Notes
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8599a8' }}>
                      第三方觀察記錄
                    </p>
                  </div>
                </div>
              </button>

              {/* PPV Dashboard */}
              <button
                onClick={() => setCurrentPage('ppv')}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(168, 133, 158, 0.2)',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(90, 107, 122, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: 'linear-gradient(135deg, #a8859e 0%, #8a6580 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '22px' }}>📊</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#3a4a5a' }}>
                      PPV Dashboard
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8599a8' }}>
                      多樣性監控面板
                    </p>
                  </div>
                </div>
              </button>

              {/* Quick Links / Documentation */}
              <button
                onClick={() => window.open('https://github.com/fishstar2023/financial-ppv-model', '_blank')}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(107, 138, 163, 0.2)',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(90, 107, 122, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: 'linear-gradient(135deg, #9db4c7 0%, #7a95ab 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '22px' }}>📚</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#3a4a5a' }}>
                      Documentation
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8599a8' }}>
                      GitHub / README
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Stats Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '48px',
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.5)',
            borderRadius: '16px',
            marginTop: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#6b8aa3' }}>v1.0.0</div>
              <div style={{ fontSize: '12px', color: '#8599a8' }}>Version</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#6b8065' }}>GPT-4o</div>
              <div style={{ fontSize: '12px', color: '#8599a8' }}>LLM Engine</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#8a6580' }}>Agno</div>
              <div style={{ fontSize: '12px', color: '#8599a8' }}>Agent Framework</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '32px',
            textAlign: 'center',
            color: '#8599a8',
            fontSize: '13px'
          }}>
            Powered by AI | Agno + OpenAI
          </div>
        </div>
      </div>
    );
  }

  // Config / Settings Page
  if (currentPage === 'config') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f8fa 0%, #e8eef3 100%)',
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
                border: '1px solid rgba(107, 138, 163, 0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#5a6b7a'
              }}
            >
              ←
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#3a4a5a' }}>
                Settings
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#8599a8' }}>
                系統設定與配置
              </p>
            </div>
          </div>

          {/* Settings Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* API Configuration */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(107, 138, 163, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#3a4a5a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔑</span> API Configuration
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(107, 138, 163, 0.05)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#5a6b7a' }}>OpenAI API Key</span>
                  <span style={{ fontSize: '13px', color: '#8599a8', fontFamily: 'monospace' }}>sk-****...****</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(107, 138, 163, 0.05)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#5a6b7a' }}>Model</span>
                  <span style={{ fontSize: '13px', color: '#6b8aa3', fontWeight: 500 }}>gpt-4o</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(107, 138, 163, 0.05)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#5a6b7a' }}>Backend Port</span>
                  <span style={{ fontSize: '13px', color: '#6b8aa3', fontWeight: 500 }}>8787</span>
                </div>
              </div>
            </div>

            {/* PPV Settings */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(168, 133, 158, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#3a4a5a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎛️</span> PPV Settings
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(168, 133, 158, 0.05)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#5a6b7a' }}>Temperature</span>
                  <span style={{ fontSize: '13px', color: '#8a6580', fontWeight: 500 }}>0.9</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(168, 133, 158, 0.05)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#5a6b7a' }}>Schema Version</span>
                  <span style={{ fontSize: '13px', color: '#8a6580', fontWeight: 500 }}>2.0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(168, 133, 158, 0.05)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#5a6b7a' }}>Diversity Score Target</span>
                  <span style={{ fontSize: '13px', color: '#8a6580', fontWeight: 500 }}>≥ 75%</span>
                </div>
              </div>
            </div>

            {/* About */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(107, 138, 163, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#3a4a5a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ℹ️</span> About
              </h3>
              <div style={{ fontSize: '14px', color: '#5a6b7a', lineHeight: '1.8' }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>AI Research Platform</strong> - Market Research Simulator
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  Version: <span style={{ color: '#6b8aa3', fontWeight: 500 }}>1.0.0</span>
                </p>
                <p style={{ margin: 0, color: '#8599a8', fontSize: '13px' }}>
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
