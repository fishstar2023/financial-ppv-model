import './styles.css';
import { useState } from 'react';
import { MarketSimulator } from './features/MarketSimulator';
import { VietnamInterview } from './features/VietnamInterview';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'market' | 'vietnam'

  // 首頁
  if (currentPage === 'home') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f8fa 0%, #e8eef3 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #6b8aa3 0%, #557085 100%)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(90, 107, 122, 0.25)'
          }}>
            <span style={{ fontSize: '40px' }}>🔬</span>
          </div>
          <h1 style={{
            margin: '0 0 12px 0',
            fontSize: '36px',
            fontWeight: 700,
            color: '#3a4a5a',
            letterSpacing: '-0.02em'
          }}>
            AI Research Platform
          </h1>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: '#6b7c8a',
            maxWidth: '500px'
          }}>
            Synthetic Persona Generation & Interview Simulation
          </p>
        </div>

        {/* Feature Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          maxWidth: '800px',
          width: '100%'
        }}>
          {/* Market Simulator Card */}
          <button
            onClick={() => setCurrentPage('market')}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(107, 138, 163, 0.2)',
              borderRadius: '20px',
              padding: '32px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 24px rgba(90, 107, 122, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(90, 107, 122, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(90, 107, 122, 0.1)';
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #9db4c7 0%, #7a95ab 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 4px 16px rgba(107, 138, 163, 0.25)'
            }}>
              <span style={{ fontSize: '28px' }}>👥</span>
            </div>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: 600,
              color: '#3a4a5a'
            }}>
              Market Simulator
            </h2>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#6b7c8a',
              lineHeight: '1.6'
            }}>
              Synthetic Persona Interview Platform
              <br />
              Generate diverse personas and conduct interviews
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6b8aa3',
              fontSize: '14px',
              fontWeight: 500
            }}>
              Enter
              <span style={{ fontSize: '18px' }}>→</span>
            </div>
          </button>

          {/* Vietnam Interview Card */}
          <button
            onClick={() => setCurrentPage('vietnam')}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(139, 158, 133, 0.2)',
              borderRadius: '20px',
              padding: '32px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 24px rgba(90, 107, 122, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(90, 107, 122, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(90, 107, 122, 0.1)';
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #8b9e85 0%, #6b8065 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 4px 16px rgba(139, 158, 133, 0.25)'
            }}>
              <span style={{ fontSize: '28px' }}>🇻🇳</span>
            </div>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: 600,
              color: '#3a4a5a'
            }}>
              Vietnam Interview
            </h2>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#6b7c8a',
              lineHeight: '1.6'
            }}>
              Travel Insurance User Research
              <br />
              AI-powered Vietnamese consumer insights
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6b8065',
              fontSize: '14px',
              fontWeight: 500
            }}>
              Enter
              <span style={{ fontSize: '18px' }}>→</span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '48px',
          textAlign: 'center',
          color: '#8599a8',
          fontSize: '13px'
        }}>
          Powered by AI | Agno + OpenAI
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
              {currentPage === 'market' ? 'M' : 'V'}
            </button>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 600,
                color: '#5a6b7a',
                letterSpacing: '-0.02em'
              }}>
                {currentPage === 'market' ? 'Market Research Simulator' : 'Vietnam Interview'}
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#8599a8', fontSize: '14px', fontWeight: 400 }}>
                {currentPage === 'market'
                  ? 'Synthetic Persona Interview Platform'
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
          </nav>
        </div>
      </header>

      {/* 主內容區 */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 32px' }}>
        {currentPage === 'market' && <MarketSimulator />}
        {currentPage === 'vietnam' && <VietnamInterview />}
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
