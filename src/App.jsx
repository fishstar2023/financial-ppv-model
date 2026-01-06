import './styles.css';
import { useState } from 'react';
import { MarketSimulator } from './features/MarketSimulator';
import { VietnamInterview } from './features/VietnamInterview';

function App() {
  const [currentPage, setCurrentPage] = useState('market'); // 'market' | 'vietnam'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f8fa 0%, #e8eef3 100%)',
      padding: '0'
    }}>
      {/* 莫蘭迪風格頂部欄 - 藍黃色調 */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(157, 180, 199, 0.2)',
        padding: '20px 32px',
        boxShadow: '0 2px 12px rgba(90, 107, 122, 0.08)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
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
              transition: 'all 0.3s ease'
            }}>
              {currentPage === 'market' ? 'M' : 'V'}
            </div>
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
              label="Market Simulator"
              icon="👥"
              isActive={currentPage === 'market'}
              onClick={() => setCurrentPage('market')}
            />
            <NavButton
              label="Vietnam Interview"
              icon="🇻🇳"
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
const NavButton = ({ label, icon, isActive, onClick }) => (
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
    <span style={{ fontSize: '16px' }}>{icon}</span>
    {label}
  </button>
);

export default App;
