import React, { useState, useEffect } from 'react';
import { PPVInstance } from '../../types/ppv';

// 莫蘭迪色系配色 - 藍黃色調（加深版）
const colors = {
  // 主色調 - 柔和藍灰（加深）
  primary: '#6b8aa3',
  primaryDark: '#557085',
  primaryLight: '#8ea9be',

  // 背景色（提高不透明度）
  bgPrimary: 'rgba(255, 255, 255, 0.9)',
  bgSecondary: 'rgba(240, 245, 248, 0.85)',
  bgHover: 'rgba(107, 138, 163, 0.12)',

  // 文字色（加深提高對比）
  textPrimary: '#2d3e4d',
  textSecondary: '#5a6d7e',
  textMuted: '#8599a8',

  // 邊框色（加深）
  border: 'rgba(107, 138, 163, 0.3)',
  borderLight: 'rgba(107, 138, 163, 0.2)',

  // 功能色 - 柔和版本但更飽和
  success: '#6b9d8f',
  warning: '#c4a877',
  danger: '#c17f7f',
  info: '#7a95c4',

  // 陰影（加深）
  shadow: 'rgba(45, 62, 77, 0.12)',
  shadowMedium: 'rgba(45, 62, 77, 0.18)',
};

export const MarketSimulator = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'analytics'>('current');
  const [loading, setLoading] = useState(false);
  const [currentPersonas, setCurrentPersonas] = useState<PPVInstance[]>([]);
  const [historyPersonas, setHistoryPersonas] = useState<PPVInstance[]>([]);
  const [contextInfo, setContextInfo] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8787/api/personas');
      const data = await res.json();
      if (Array.isArray(data)) {
        const reversed = data.reverse();
        setHistoryPersonas(reversed);
        // 如果 currentPersonas 是空的，自動載入歷史資料到 current
        if (currentPersonas.length === 0 && reversed.length > 0) {
          setCurrentPersonas(reversed);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleGenerate = async () => {
    if (!targetAudience) return alert("Please specify target audience");
    setLoading(true);
    try {
      const randomCount = Math.floor(Math.random() * 4) + 2;
      const res = await fetch('http://localhost:8787/api/generate_personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint: targetAudience, count: randomCount })
      });
      const data = await res.json();
      setCurrentPersonas(data);
      fetchHistory();
    } catch (e) {
      alert("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastAsk = async () => {
    if (currentPersonas.length === 0) return alert("Please generate personas first");
    if (!currentQuestion.trim()) return alert("Please enter a question");

    setIsInterviewing(true);
    const updatedPersonas = [...currentPersonas];

    try {
      // 先收集所有回答，再批次更新
      await Promise.all(updatedPersonas.map(async (persona) => {
        if (!persona.interview_history) persona.interview_history = [];

        const res = await fetch('http://localhost:8787/api/chat_with_twin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ppv_profile: persona,
            user_query: currentQuestion,
            context_data: contextInfo
          })
        });
        const data = await res.json();

        persona.interview_history.push({
          question: currentQuestion,
          answer: data.response,
          timestamp: new Date().toISOString()
        });
      }));

      // 等所有回答收集完後，批次更新到後端
      await Promise.all(updatedPersonas.map(async (persona) => {
        await fetch('http://localhost:8787/api/update_persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(persona)
        });
      }));

      // 更新本地狀態
      setCurrentPersonas(updatedPersonas);

      // 等後端更新完成後再拉取 history（確保資料一致性）
      await fetchHistory();

      setCurrentQuestion("");

    } catch (e) {
      console.error(e);
      alert("Interview failed");
    } finally {
      setIsInterviewing(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear all data?")) return;
    await fetch('http://localhost:8787/api/personas', { method: 'DELETE' });
    setHistoryPersonas([]);
    setCurrentPersonas([]);
  };

  const handleDeletePersona = async (personaId: string) => {
    if (!confirm(`Delete persona "${personaId}"?`)) return;
    try {
      await fetch(`http://localhost:8787/api/personas/${encodeURIComponent(personaId)}`, {
        method: 'DELETE'
      });
      // 更新本地狀態
      setHistoryPersonas(prev => prev.filter(p => p.id !== personaId));
      setCurrentPersonas(prev => prev.filter(p => p.id !== personaId));
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  };

  return (
    <div style={{ paddingBottom: '180px' }}>
      {/* 莫蘭迪風格 Tab Navigation */}
      <div style={{
        background: colors.bgPrimary,
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        marginBottom: '24px',
        border: `1px solid ${colors.borderLight}`,
        overflow: 'hidden',
        boxShadow: `0 4px 16px ${colors.shadow}`
      }}>
        <div style={{display: 'flex', borderBottom: `1px solid ${colors.borderLight}`}}>
          <TabButton label="Current Interviews" isActive={activeTab === 'current'} onClick={() => setActiveTab('current')} />
          <TabButton label="Archive" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabButton label="Analytics" isActive={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
        </div>
      </div>

      {activeTab === 'current' && (
        <div>
          {/* Generation Panel */}
          <div style={{
            background: colors.bgPrimary,
            backdropFilter: 'blur(10px)',
            padding: '24px',
            borderRadius: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.borderLight}`,
            boxShadow: `0 4px 16px ${colors.shadow}`
          }}>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: colors.textPrimary }}>
              Target Audience
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                  background: 'rgba(255, 255, 255, 0.6)',
                  color: colors.textPrimary,
                  transition: 'all 0.3s ease'
                }}
                placeholder="e.g., 25-35 year old tech professionals in Taipei"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = colors.primary}
                onBlur={(e) => e.target.style.borderColor = colors.border}
              />
              <button
                style={{
                  padding: '12px 28px',
                  background: loading ? colors.textMuted : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  minWidth: '120px',
                  boxShadow: loading ? 'none' : `0 4px 12px ${colors.shadow}`,
                  transition: 'all 0.3s ease'
                }}
                onClick={handleGenerate}
                disabled={loading || isInterviewing}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Persona Cards */}
          {currentPersonas.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {currentPersonas.map((p, i) => (
                <PersonaCard key={i} p={p} defaultExpanded={true} onDelete={handleDeletePersona} />
              ))}
            </div>
          ) : (
            !loading && (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '2px',
                color: '#757575'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>👥</div>
                <div style={{ fontSize: '14px' }}>No personas generated yet. Specify a target audience and click Generate.</div>
              </div>
            )
          )}

          {/* Fixed Bottom Panel */}
          {currentPersonas.length > 0 && (
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'white',
              borderTop: '1px solid #e0e0e0',
              boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
              padding: '20px 32px',
              zIndex: 100
            }}>
              <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '20px' }}>

                {/* Context Input */}
                <div style={{ width: '35%' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500, color: '#424242', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Product Context
                  </label>
                  <textarea
                    style={{
                      width: '100%',
                      height: '90px',
                      padding: '10px 12px',
                      border: '1px solid #d0d0d0',
                      borderRadius: '2px',
                      fontSize: '13px',
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Product description, news, or background information..."
                    value={contextInfo}
                    onChange={(e) => setContextInfo(e.target.value)}
                  />
                </div>

                {/* Question Input */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Interview Question
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <textarea
                      style={{
                        flex: 1,
                        height: '90px',
                        padding: '10px 12px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '12px',
                        fontSize: '15px',
                        resize: 'none',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                      placeholder="What would you like to ask all personas?"
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleBroadcastAsk(); } }}
                    />
                    <button
                      style={{
                        width: '100px',
                        background: isInterviewing ? colors.textMuted : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontWeight: 500,
                        cursor: isInterviewing ? 'not-allowed' : 'pointer'
                      }}
                      onClick={handleBroadcastAsk}
                      disabled={isInterviewing}
                    >
                      {isInterviewing ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          <div style={{textAlign: 'right', marginBottom: '16px'}}>
            <button
              onClick={handleClearHistory}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#d32f2f',
                border: '1px solid #d32f2f',
                borderRadius: '2px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Clear All Data
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {historyPersonas.map((p, i) => <PersonaCard key={i} p={p} isHistory onDelete={handleDeletePersona} />)}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <AnalyticsDashboard personas={currentPersonas.length > 0 ? currentPersonas : historyPersonas} />
      )}
    </div>
  );
};

const TabButton = ({ label, isActive, onClick }: any) => (
  <button onClick={onClick} style={{
    flex: 1,
    padding: '16px 20px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 500,
    fontSize: '15px',
    background: isActive ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)` : 'transparent',
    color: isActive ? 'white' : colors.textSecondary,
    borderBottom: isActive ? `2px solid ${colors.primaryDark}` : 'none',
    transition: 'all 0.3s ease'
  }}
  onMouseEnter={(e) => {
    if (!isActive) {
      e.currentTarget.style.background = colors.bgHover;
      e.currentTarget.style.color = colors.textPrimary;
    }
  }}
  onMouseLeave={(e) => {
    if (!isActive) {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = colors.textSecondary;
    }
  }}
  >{label}</button>
);

const PersonaCard = ({ p, isHistory = false, defaultExpanded = false, onDelete }: any) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const records = [...(p.interview_history || [])].reverse();

  return (
    <div style={{
      border: `1px solid ${colors.borderLight}`,
      borderRadius: '16px',
      background: colors.bgPrimary,
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: `0 4px 16px ${colors.shadow}`,
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 8px 24px ${colors.shadowMedium}`}
    onMouseLeave={(e) => e.currentTarget.style.boxShadow = `0 4px 16px ${colors.shadow}`}
    >
      {/* Header */}
      <div style={{
        padding: '18px 20px',
        borderBottom: `1px solid ${colors.borderLight}`,
        background: colors.bgSecondary
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontWeight: 600,
            color: colors.textPrimary,
            fontSize: '18px',
            letterSpacing: '-0.01em'
          }}>
            {p.id}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isHistory && (
              <span style={{
                fontSize: '12px',
                background: colors.info,
                padding: '4px 10px',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Archived
              </span>
            )}
            <button
              onClick={() => onDelete(p.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.danger,
                cursor: 'pointer',
                padding: '4px 6px',
                fontSize: '20px',
                lineHeight: '1',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 167, 167, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="Delete this persona"
            >
              ×
            </button>
          </div>
        </div>
        <div style={{
          fontSize: '14px',
          color: colors.textSecondary,
          marginTop: '10px',
          lineHeight: '1.6'
        }}>
          {p.notes || "No background information"}
        </div>
      </div>

      {/* Interview Records */}
      <div style={{ padding: '16px', flex: 1 }}>
        {records.length > 0 ? (
          <>
            {/* Latest Answer */}
            <div style={{
              background: colors.bgSecondary,
              padding: '14px',
              borderRadius: '12px',
              borderLeft: `3px solid ${colors.primary}`,
              marginBottom: '12px'
            }}>
              <div style={{
                fontSize: '13px',
                color: colors.primary,
                marginBottom: '8px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Q: {records[0].question}
              </div>
              <div style={{
                fontSize: '15px',
                color: colors.textPrimary,
                lineHeight: '1.6'
              }}>
                {records[0].answer}
              </div>
            </div>

            {/* History */}
            {records.length > 1 && (
              <div>
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: colors.bgHover,
                    border: 'none',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontWeight: 500
                  }}
                >
                  {expanded ? '▲ Collapse' : `▼ Show ${records.length - 1} previous response${records.length > 2 ? 's' : ''}`}
                </button>
                {expanded && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {records.slice(1).map((r: any, idx: number) => (
                      <div key={idx} style={{
                        fontSize: '14px',
                        background: colors.bgSecondary,
                        padding: '12px',
                        borderRadius: '12px',
                        borderLeft: `2px solid ${colors.borderLight}`
                      }}>
                        <div style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                          Q: {r.question}
                        </div>
                        <div style={{ color: colors.textPrimary, lineHeight: '1.5' }}>{r.answer}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '24px',
            color: colors.textMuted,
            fontSize: '14px'
          }}>
            No interview responses yet
          </div>
        )}
      </div>
    </div>
  );
};

// Analytics Dashboard Component
const AnalyticsDashboard = ({ personas }: { personas: PPVInstance[] }) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set([0])); // 預設展開第一個問題

  if (personas.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '2px',
        color: '#757575'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
        <div style={{ fontSize: '15px' }}>No data available for analysis. Generate or load personas first.</div>
      </div>
    );
  }

  const toggleQuestion = (idx: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedQuestions(newExpanded);
  };

  // 分析最新的訪談問題
  const latestQuestions = new Map<string, { question: string; responses: { id: string; answer: string; willingness: number }[] }>();

  personas.forEach(p => {
    if (p.interview_history && p.interview_history.length > 0) {
      p.interview_history.forEach((record: any) => {
        if (!latestQuestions.has(record.question)) {
          latestQuestions.set(record.question, { question: record.question, responses: [] });
        }

        // 簡單的意願分析：檢測關鍵詞
        const answer = record.answer.toLowerCase();
        let willingness = 50; // 中立

        // 正面關鍵詞
        if (answer.includes('會買') || answer.includes('想買') || answer.includes('可以') ||
            answer.includes('試試') || answer.includes('不錯') || answer.includes('好') ||
            answer.includes('衝') || answer.includes('辦')) {
          willingness = 80;
        }
        // 負面關鍵詞
        else if (answer.includes('不') || answer.includes('沒') || answer.includes('太貴') ||
                 answer.includes('不要') || answer.includes('算了') || answer.includes('擔心') ||
                 answer.includes('怕')) {
          willingness = 20;
        }
        // 猶豫關鍵詞
        else if (answer.includes('看看') || answer.includes('想一下') || answer.includes('再說') ||
                 answer.includes('考慮') || answer.includes('比較')) {
          willingness = 50;
        }

        latestQuestions.get(record.question)!.responses.push({
          id: p.id,
          answer: record.answer,
          willingness
        });
      });
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <MetricCard
          label="Total Personas"
          value={personas.length.toString()}
          color={colors.primary}
        />
        <MetricCard
          label="Total Interviews"
          value={personas.reduce((sum, p) => sum + (p.interview_history?.length || 0), 0).toString()}
          color={colors.success}
        />
        <MetricCard
          label="Avg Interviews/Person"
          value={(personas.reduce((sum, p) => sum + (p.interview_history?.length || 0), 0) / personas.length).toFixed(1)}
          color={colors.warning}
        />
      </div>

      {/* Question Analysis */}
      {Array.from(latestQuestions.entries()).map(([question, data], idx) => {
        const avgWillingness = data.responses.reduce((sum, r) => sum + r.willingness, 0) / data.responses.length;
        const highWillingness = data.responses.filter(r => r.willingness >= 70).length;
        const mediumWillingness = data.responses.filter(r => r.willingness >= 40 && r.willingness < 70).length;
        const lowWillingness = data.responses.filter(r => r.willingness < 40).length;
        const isExpanded = expandedQuestions.has(idx);

        return (
          <div key={idx} style={{
            background: colors.bgPrimary,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${colors.borderLight}`,
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: `0 4px 16px ${colors.shadow}`
          }}>
            {/* Clickable Header */}
            <div
              onClick={() => toggleQuestion(idx)}
              style={{
                padding: '18px 24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isExpanded ? colors.bgSecondary : 'transparent',
                borderBottom: isExpanded ? `1px solid ${colors.borderLight}` : 'none',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.bgHover}
              onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? colors.bgSecondary : 'transparent'}
            >
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: colors.textPrimary,
                flex: 1
              }}>
                Question {idx + 1}: {question}
              </h3>
              <div style={{
                fontSize: '20px',
                color: colors.textSecondary,
                marginLeft: '12px',
                transition: 'transform 0.3s ease',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                ▼
              </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
              <div style={{ padding: '24px' }}>
                {/* Willingness Distribution */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: colors.textSecondary, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Purchase Willingness Distribution
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: highWillingness, minWidth: '40px', background: colors.success, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '17px', borderRadius: '12px', boxShadow: `0 4px 12px ${colors.shadow}` }}>
                      {highWillingness}
                    </div>
                    <div style={{ flex: mediumWillingness || 0.1, minWidth: '40px', background: colors.warning, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '17px', borderRadius: '12px', boxShadow: `0 4px 12px ${colors.shadow}` }}>
                      {mediumWillingness}
                    </div>
                    <div style={{ flex: lowWillingness || 0.1, minWidth: '40px', background: colors.danger, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '17px', borderRadius: '12px', boxShadow: `0 4px 12px ${colors.shadow}` }}>
                      {lowWillingness}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: colors.textSecondary }}>
                    <div><span style={{ display: 'inline-block', width: '12px', height: '12px', background: colors.success, marginRight: '8px', borderRadius: '4px' }}></span>High ({((highWillingness / data.responses.length) * 100).toFixed(0)}%)</div>
                    <div><span style={{ display: 'inline-block', width: '12px', height: '12px', background: colors.warning, marginRight: '8px', borderRadius: '4px' }}></span>Medium ({((mediumWillingness / data.responses.length) * 100).toFixed(0)}%)</div>
                    <div><span style={{ display: 'inline-block', width: '12px', height: '12px', background: colors.danger, marginRight: '8px', borderRadius: '4px' }}></span>Low ({((lowWillingness / data.responses.length) * 100).toFixed(0)}%)</div>
                  </div>
                </div>

                {/* Average Score */}
                <div style={{
                  padding: '20px',
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  marginBottom: '20px',
                  border: `1px solid ${colors.borderLight}`
                }}>
                  <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>
                    Average Willingness Score
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 600, color: avgWillingness >= 70 ? colors.success : avgWillingness >= 40 ? colors.warning : colors.danger, letterSpacing: '-0.02em' }}>
                    {avgWillingness.toFixed(1)}<span style={{ fontSize: '20px', color: colors.textMuted }}>/100</span>
                  </div>
                </div>

                {/* Individual Responses */}
                <details>
                  <summary style={{
                    cursor: 'pointer',
                    padding: '12px',
                    background: colors.bgHover,
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.textSecondary
                  }}>
                    View All {data.responses.length} Responses
                  </summary>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.responses.map((r, i) => (
                      <div key={i} style={{
                        padding: '14px',
                        background: colors.bgSecondary,
                        borderLeft: `3px solid ${r.willingness >= 70 ? colors.success : r.willingness >= 40 ? colors.warning : colors.danger}`,
                        borderRadius: '12px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: colors.textPrimary, marginBottom: '6px' }}>
                          {r.id} <span style={{ fontSize: '13px', fontWeight: 400, color: colors.textSecondary }}>({r.willingness}/100)</span>
                        </div>
                        <div style={{ fontSize: '15px', color: colors.textPrimary, lineHeight: '1.6' }}>{r.answer}</div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const MetricCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{
    background: colors.bgPrimary,
    backdropFilter: 'blur(10px)',
    border: `1px solid ${colors.borderLight}`,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: `0 4px 16px ${colors.shadow}`,
    transition: 'all 0.3s ease'
  }}
  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>
      {label}
    </div>
    <div style={{ fontSize: '40px', fontWeight: 600, color: color, letterSpacing: '-0.02em' }}>
      {value}
    </div>
  </div>
);
