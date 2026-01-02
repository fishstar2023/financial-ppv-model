import './styles.css';
import { MarketSimulator } from './features/MarketSimulator';

function App() {
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
              background: 'linear-gradient(135deg, #9db4c7 0%, #7a95ab 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(90, 107, 122, 0.15)'
            }}>M</div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 600,
                color: '#5a6b7a',
                letterSpacing: '-0.02em'
              }}>
                Market Research Simulator
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#8599a8', fontSize: '14px', fontWeight: 400 }}>
                Synthetic Persona Interview Platform
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 32px' }}>
        <MarketSimulator />
      </main>
    </div>
  );
}

export default App;
