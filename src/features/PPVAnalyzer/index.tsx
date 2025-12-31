import React, { useState } from 'react';
import { PPVService } from '../../services/ppv';
import { PPVInstance } from '../../types/ppv';
// @ts-ignore: allow importing CSS without a type declaration file
import './style.css'; // <--- 引入我們剛寫好的 CSS

interface PPVAnalyzerProps {
  onAnalysisComplete: (data: PPVInstance) => void;
}

export const PPVAnalyzer: React.FC<PPVAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [chatLog, setChatLog] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PPVInstance | null>(null);

  const handleAnalyze = async () => {
    if (!chatLog.trim()) return alert('請輸入對話紀錄');
    setLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const data = await PPVService.extractPPV(chatLog);
      setPreviewData(data);
      onAnalysisComplete(data);
    } catch (err) {
      console.error(err);
      setError('分析失敗：請確認後端 Server (Port 8000) 已啟動');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ppv-card">
      {/* 標題改得更直覺：Step 1 */}
      <div className="ppv-header">
        <h3 className="ppv-title">🧬 建立您的數位分身</h3>
        <span className="ppv-badge">Step 1: 人格建模</span>
      </div>

      <p className="ppv-desc">
        這是產生數位孿生的第一步。請貼上您過去的對話紀錄（例如 LINE 或 Email），AI 將分析您的語言風格、風險偏好與價值觀。
      </p>

      <textarea
        className="ppv-textarea"
        placeholder={`建議輸入範例：
User: 我最近不敢買股票，感覺風險好大...
AI: 為什麼呢？
User: 因為我上次賠了很多錢，所以現在投資變得很保守，只敢存定存，連 ETF 都不敢碰。`}
        value={chatLog}
        onChange={(e) => setChatLog(e.target.value)}
        disabled={loading}
      />

      {error && (
        <div style={{ color: '#dc2626', background: '#fee2e2', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={loading || !chatLog.trim()}
        className="ppv-button"
      >
        {loading ? '🧠 AI 正在分析人格大腦...' : '開始分析並建立分身'}
      </button>

      {/* 分析成功後的預覽 */}
      {previewData && (
        <div className="ppv-result">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span>✅</span>
            <h4 style={{ margin: 0, color: '#065f46', fontWeight: 'bold' }}>模型建立完成！</h4>
          </div>
          
          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">開放性 (Openness)</span>
              <span className="result-value">{previewData.big5.openness}</span>
            </div>
            <div className="result-item">
              <span className="result-label">盡責性 (Conscientiousness)</span>
              <span className="result-value">{previewData.big5.conscientiousness}</span>
            </div>
            <div className="result-item">
              <span className="result-label">風險承受 (Risk)</span>
              <span className="result-value" style={{ color: '#2563eb' }}>
                {previewData.risk_profile?.overall ?? 'N/A'}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">外向性 (Extraversion)</span>
              <span className="result-value">{previewData.big5.extraversion}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};