import React, { useState, useEffect } from 'react';
import {
  VietnamPersona,
  VietnamInterviewRecord,
  createEmptyVietnamPersona,
  PURCHASE_CHANNELS,
  INSURANCE_BRANDS
} from './vietnamPersonaSchema';
import {
  VIETNAM_INTERVIEW_SECTIONS,
  getTotalQuestions
} from './interviewQuestions';

// 莫蘭迪色系 - 越南版用較暖的色調
const colors = {
  primary: '#8b9e85',      // 莫蘭迪綠
  primaryDark: '#6b8065',
  primaryLight: '#a8b9a3',
  accent: '#c4a877',       // 金黃色點綴

  bgPrimary: 'rgba(255, 255, 255, 0.9)',
  bgSecondary: 'rgba(245, 248, 243, 0.85)',
  bgHover: 'rgba(139, 158, 133, 0.12)',

  textPrimary: '#2d3e2d',
  textSecondary: '#5a6d5a',
  textMuted: '#859985',

  border: 'rgba(139, 158, 133, 0.3)',
  borderLight: 'rgba(139, 158, 133, 0.2)',

  success: '#6b9d8f',
  warning: '#c4a877',
  danger: '#c17f7f',
  info: '#7a95c4',

  shadow: 'rgba(45, 62, 45, 0.12)',
  shadowMedium: 'rgba(45, 62, 45, 0.18)',
};

export const VietnamInterview = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'interview' | 'history' | 'analysis'>('generate');
  const [personas, setPersonas] = useState<VietnamPersona[]>([]);
  const [currentPersona, setCurrentPersona] = useState<VietnamPersona | null>(null);
  const [loading, setLoading] = useState(false);

  // AI 生成狀態
  const [targetAudience, setTargetAudience] = useState('');
  const [personaCount, setPersonaCount] = useState(3);
  const [generatedPersonas, setGeneratedPersonas] = useState<VietnamPersona[]>([]);

  // 表單狀態
  const [formData, setFormData] = useState<VietnamPersona>(createEmptyVietnamPersona());

  // 訪談狀態 - 彈性問答模式
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // 分析狀態
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 載入歷史資料
  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const res = await fetch('http://localhost:8787/api/vietnam_personas');
      if (res.ok) {
        const data = await res.json();
        setPersonas(data);
      }
    } catch (e) {
      console.error('Failed to load personas:', e);
    }
  };

  const savePersona = async (persona: VietnamPersona) => {
    try {
      await fetch('http://localhost:8787/api/vietnam_personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona)
      });
      loadPersonas();
    } catch (e) {
      console.error('Failed to save persona:', e);
    }
  };

  // AI 生成受訪者
  const handleGeneratePersonas = async () => {
    if (!targetAudience.trim()) {
      alert('Please enter target audience description');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8787/api/generate_vietnam_personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hint: targetAudience,
          count: personaCount
        })
      });

      if (res.ok) {
        const data = await res.json();
        // 轉換成完整的 VietnamPersona 格式
        const fullPersonas: VietnamPersona[] = data.map((p: any) => ({
          ...p,
          interviewHistory: [],
          currentSectionIndex: 0,
          currentQuestionIndex: 0,
          isCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        setGeneratedPersonas(fullPersonas);
        loadPersonas(); // 重新載入歷史
      } else {
        alert('Generation failed');
      }
    } catch (e) {
      console.error('Generation failed:', e);
      alert('Generation failed');
    } finally {
      setLoading(false);
    }
  };

  // 手動新增受訪者
  const handleFormSubmit = async () => {
    if (!formData.lastName || !formData.occupation) {
      alert('Please fill in required fields (Last Name, Occupation)');
      return;
    }

    const newPersona: VietnamPersona = {
      ...formData,
      id: formData.id || `${formData.lastName}_${Date.now()}`,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await savePersona(newPersona);
    setCurrentPersona(newPersona);
    setActiveTab('interview');
    setFormData(createEmptyVietnamPersona());
  };

  const startInterview = (persona: VietnamPersona) => {
    setCurrentPersona(persona);
    setActiveTab('interview');
  };

  // 彈性問答模式 - AI 模擬回答
  const handleFlexibleAIInterview = async () => {
    if (!currentPersona || !currentQuestion.trim()) return;

    setIsThinking(true);

    try {
      const res = await fetch('http://localhost:8787/api/vietnam_interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: currentPersona,
          question: currentQuestion,
          subQuestions: []
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentAnswer(data.response);
      }
    } catch (e) {
      console.error('AI interview failed:', e);
    } finally {
      setIsThinking(false);
    }
  };

  // 彈性問答模式 - 儲存回答
  const handleSaveFlexibleAnswer = async () => {
    if (!currentPersona || !currentQuestion.trim() || !currentAnswer.trim()) return;

    const newRecord: VietnamInterviewRecord = {
      sectionId: 'flexible',
      questionId: `q_${Date.now()}`,
      question: currentQuestion,
      answer: currentAnswer,
      timestamp: new Date().toISOString()
    };

    const updatedPersona: VietnamPersona = {
      ...currentPersona,
      interviewHistory: [...currentPersona.interviewHistory, newRecord],
      updatedAt: new Date().toISOString()
    };

    await savePersona(updatedPersona);
    setCurrentPersona(updatedPersona);
    setCurrentQuestion('');
    setCurrentAnswer('');
  };

  // 取得所有問題列表（從所有受訪者的訪談紀錄中）
  const getAllQuestions = (): string[] => {
    const questionSet = new Set<string>();
    personas.forEach(p => {
      p.interviewHistory.forEach(record => {
        if (record.question) {
          questionSet.add(record.question);
        }
      });
    });
    return Array.from(questionSet);
  };

  // 取得特定問題的所有回答
  const getResponsesForQuestion = (question: string) => {
    const responses: Array<{ persona: VietnamPersona; answer: string }> = [];
    personas.forEach(persona => {
      persona.interviewHistory.forEach(record => {
        if (record.question === question) {
          responses.push({
            persona,
            answer: record.answer
          });
        }
      });
    });
    return responses;
  };

  // 執行分析
  const handleAnalyze = async () => {
    if (!selectedQuestion) return;

    const responses = getResponsesForQuestion(selectedQuestion);
    if (responses.length < 2) {
      alert('需要至少 2 位受訪者的回答才能進行分析');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult('');

    try {
      const res = await fetch('http://localhost:8787/api/vietnam_analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: selectedQuestion,
          responses: responses.map(r => ({
            persona: {
              lastName: r.persona.lastName,
              gender: r.persona.gender,
              age: r.persona.age,
              occupation: r.persona.occupation,
              timesOfOverseasTravelInsurance: r.persona.timesOfOverseasTravelInsurance,
              purchasedBrand: r.persona.purchasedBrand
            },
            answer: r.answer
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data.analysis);
      } else {
        setAnalysisResult('分析失敗，請稍後再試');
      }
    } catch (e) {
      console.error('Analysis failed:', e);
      setAnalysisResult('分析失敗，請稍後再試');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProgress = () => {
    if (!currentPersona) return 0;

    let completedQuestions = 0;
    for (let i = 0; i < currentPersona.currentSectionIndex; i++) {
      completedQuestions += VIETNAM_INTERVIEW_SECTIONS[i].questions.length;
    }
    completedQuestions += currentPersona.currentQuestionIndex;

    return (completedQuestions / getTotalQuestions()) * 100;
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Tab Navigation */}
      <div style={{
        background: colors.bgPrimary,
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        marginBottom: '24px',
        border: `1px solid ${colors.borderLight}`,
        overflow: 'hidden',
        boxShadow: `0 4px 16px ${colors.shadow}`
      }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.borderLight}` }}>
          <TabButton label="🤖 AI Generate" isActive={activeTab === 'generate'} onClick={() => setActiveTab('generate')} />
          <TabButton label="✏️ Manual Input" isActive={activeTab === 'manual'} onClick={() => setActiveTab('manual')} />
          <TabButton label="🎤 Interview" isActive={activeTab === 'interview'} onClick={() => setActiveTab('interview')} disabled={!currentPersona} />
          <TabButton label="📋 History" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabButton label="📊 Analysis" isActive={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
        </div>
      </div>

      {/* Generate Tab - AI 生成受訪者 */}
      {activeTab === 'generate' && (
        <div>
          {/* Generation Panel */}
          <div style={{
            background: colors.bgPrimary,
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            border: `1px solid ${colors.borderLight}`,
            boxShadow: `0 4px 16px ${colors.shadow}`
          }}>
            <h2 style={{ margin: '0 0 24px 0', color: colors.textPrimary, fontSize: '20px', fontWeight: 600 }}>
              🇻🇳 Generate Vietnamese Interviewees / AI 生成越南受訪者
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: colors.textPrimary }}>
                Target Audience / 目標客群描述
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., 越南上班族，有出國旅遊經驗 / Vietnamese office workers with travel experience"
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                  background: 'rgba(255, 255, 255, 0.6)',
                  color: colors.textPrimary
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: 500, color: colors.textSecondary }}>
                  Number of Personas / 人數
                </label>
                <select
                  value={personaCount}
                  onChange={(e) => setPersonaCount(Number(e.target.value))}
                  style={{
                    padding: '14px 18px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    background: 'rgba(255, 255, 255, 0.6)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    minWidth: '100px'
                  }}
                >
                  {[3, 5, 8, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGeneratePersonas}
                disabled={loading}
                style={{
                  padding: '14px 32px',
                  background: loading ? colors.textMuted : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: `0 4px 12px ${colors.shadow}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {loading ? '⏳ Generating...' : '🚀 Generate'}
              </button>
            </div>
          </div>

          {/* Generated Personas */}
          {generatedPersonas.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: colors.textPrimary, fontSize: '18px', fontWeight: 600 }}>
                Generated Personas ({generatedPersonas.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {generatedPersonas.map((persona, idx) => (
                  <GeneratedPersonaCard
                    key={idx}
                    persona={persona}
                    onStartInterview={() => startInterview(persona)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Tab - 手動輸入受訪者資料 */}
      {activeTab === 'manual' && (
        <div style={{
          background: colors.bgPrimary,
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '32px',
          border: `1px solid ${colors.borderLight}`,
          boxShadow: `0 4px 16px ${colors.shadow}`
        }}>
          <h2 style={{ margin: '0 0 24px 0', color: colors.textPrimary, fontSize: '20px', fontWeight: 600 }}>
            ✏️ Manual Input / 手動輸入受訪者資料
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Last Name */}
            <FormField label="Last Name / 姓氏 *">
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g., Nguyễn, Trần, Lê..."
                style={inputStyle}
              />
            </FormField>

            {/* Gender */}
            <FormField label="Gender / 性別 *">
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
                style={inputStyle}
              >
                <option value="Male">Male / 男</option>
                <option value="Female">Female / 女</option>
              </select>
            </FormField>

            {/* Age */}
            <FormField label="Age / 年齡 *">
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                min={18}
                max={80}
                style={inputStyle}
              />
            </FormField>

            {/* Occupation */}
            <FormField label="Occupation / Title / 職業 *">
              <input
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                placeholder="e.g., Office Worker, Business Owner..."
                style={inputStyle}
              />
            </FormField>

            {/* Times of Travel Insurance */}
            <FormField label="Times of Overseas Travel Insurance / 購買次數">
              <input
                type="number"
                value={formData.timesOfOverseasTravelInsurance}
                onChange={(e) => setFormData({ ...formData, timesOfOverseasTravelInsurance: parseInt(e.target.value) || 0 })}
                min={0}
                style={inputStyle}
              />
            </FormField>

            {/* Purchased Brand */}
            <FormField label="Purchased Brand / 購買過的品牌">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {INSURANCE_BRANDS.map(brand => (
                  <label key={brand} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    background: formData.purchasedBrand.includes(brand) ? colors.primary : colors.bgSecondary,
                    color: formData.purchasedBrand.includes(brand) ? 'white' : colors.textSecondary,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.purchasedBrand.includes(brand)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, purchasedBrand: [...formData.purchasedBrand, brand] });
                        } else {
                          setFormData({ ...formData, purchasedBrand: formData.purchasedBrand.filter(b => b !== brand) });
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    {brand}
                  </label>
                ))}
              </div>
            </FormField>

            {/* Purchased Channels */}
            <FormField label="Purchased Channels / 購買管道">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PURCHASE_CHANNELS.map(channel => (
                  <label key={channel} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    background: formData.purchasedChannels.includes(channel) ? colors.primary : colors.bgSecondary,
                    color: formData.purchasedChannels.includes(channel) ? 'white' : colors.textSecondary,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.purchasedChannels.includes(channel)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, purchasedChannels: [...formData.purchasedChannels, channel] });
                        } else {
                          setFormData({ ...formData, purchasedChannels: formData.purchasedChannels.filter(c => c !== channel) });
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    {channel}
                  </label>
                ))}
              </div>
            </FormField>
          </div>

          {/* Personal Background */}
          <div style={{ marginTop: '20px' }}>
            <FormField label="Personal Background / 個人背景">
              <textarea
                value={formData.personalBackground}
                onChange={(e) => setFormData({ ...formData, personalBackground: e.target.value })}
                placeholder="Brief description of the interviewee's background..."
                style={{
                  ...inputStyle,
                  minHeight: '100px',
                  resize: 'vertical'
                }}
              />
            </FormField>
          </div>

          {/* Submit Button */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setFormData(createEmptyVietnamPersona())}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                color: colors.textSecondary,
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              Clear / 清除
            </button>
            <button
              onClick={handleFormSubmit}
              style={{
                padding: '12px 32px',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: `0 4px 12px ${colors.shadow}`
              }}
            >
              Start Interview / 開始訪談
            </button>
          </div>
        </div>
      )}

      {/* Interview Tab - 彈性問答模式 */}
      {activeTab === 'interview' && currentPersona && (
        <div>
          {/* Persona Info Header */}
          <div style={{
            background: colors.bgPrimary,
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '20px',
            border: `1px solid ${colors.borderLight}`,
            boxShadow: `0 4px 16px ${colors.shadow}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary }}>
                  🎤 {currentPersona.lastName} {currentPersona.gender === 'Male' ? '先生' : '小姐'}
                </span>
                <span style={{ marginLeft: '12px', fontSize: '14px', color: colors.textMuted }}>
                  {currentPersona.occupation}, {currentPersona.age} tuổi
                </span>
              </div>
              <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                {currentPersona.interviewHistory.length} responses recorded
              </div>
            </div>
            {/* Persona Background */}
            <div style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: colors.bgSecondary,
              borderRadius: '10px',
              fontSize: '13px',
              color: colors.textSecondary,
              lineHeight: '1.6'
            }}>
              <strong>Background:</strong> {currentPersona.personalBackground || 'No background info'}
              {currentPersona.purchasedBrand.length > 0 && (
                <span> • <strong>Brands:</strong> {currentPersona.purchasedBrand.join(', ')}</span>
              )}
              {currentPersona.timesOfOverseasTravelInsurance > 0 && (
                <span> • <strong>Insurance exp:</strong> {currentPersona.timesOfOverseasTravelInsurance} times</span>
              )}
            </div>
          </div>

          {/* Flexible Q&A Panel */}
          <div style={{
            background: colors.bgPrimary,
            borderRadius: '16px',
            padding: '32px',
            border: `1px solid ${colors.borderLight}`,
            boxShadow: `0 4px 16px ${colors.shadow}`
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: colors.textPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              💬 Ask Any Question / 輸入任何問題
            </h3>

            {/* Question Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary
              }}>
                Your Question / 你的問題 (可包含 URL，AI 會自動抓取網頁內容)
              </label>
              <textarea
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="輸入訪談問題... 例如：&#10;- 請參考 https://example.com 這個網站，你覺得設計如何？&#10;- 你過去買旅遊險的經驗是什麼？&#10;- 你會選擇哪種保障方案？為什麼？"
                disabled={isThinking}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  color: colors.textPrimary,
                  background: 'rgba(255, 255, 255, 0.6)'
                }}
              />
            </div>

            {/* AI Response Area */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary
              }}>
                Response / 回覆
              </label>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={isThinking ? '🤔 AI 正在思考中...' : '點擊「AI 模擬回答」讓 AI 回答，或手動輸入回覆...'}
                disabled={isThinking}
                style={{
                  width: '100%',
                  minHeight: '180px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  fontSize: '15px',
                  lineHeight: '1.8',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  color: colors.textPrimary,
                  background: isThinking ? 'rgba(139, 158, 133, 0.05)' : 'rgba(255, 255, 255, 0.6)'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <button
                onClick={handleFlexibleAIInterview}
                disabled={isThinking || !currentQuestion.trim()}
                style={{
                  padding: '12px 24px',
                  background: isThinking || !currentQuestion.trim() ? colors.textMuted : colors.info,
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: isThinking || !currentQuestion.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: `0 4px 12px ${colors.shadow}`
                }}
              >
                {isThinking ? '🤔 Thinking...' : '🤖 AI Simulate Response'}
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setCurrentQuestion('');
                    setCurrentAnswer('');
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '12px',
                    color: colors.textSecondary,
                    fontSize: '15px',
                    cursor: 'pointer'
                  }}
                >
                  Clear All
                </button>
                <button
                  onClick={handleSaveFlexibleAnswer}
                  disabled={!currentQuestion.trim() || !currentAnswer.trim() || isThinking}
                  style={{
                    padding: '12px 32px',
                    background: !currentQuestion.trim() || !currentAnswer.trim() || isThinking
                      ? colors.textMuted
                      : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: !currentQuestion.trim() || !currentAnswer.trim() || isThinking ? 'not-allowed' : 'pointer',
                    boxShadow: `0 4px 12px ${colors.shadow}`
                  }}
                >
                  💾 Save & Continue
                </button>
              </div>
            </div>
          </div>

          {/* Previous Answers */}
          {currentPersona.interviewHistory.length > 0 && (
            <div style={{
              marginTop: '24px',
              background: colors.bgPrimary,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${colors.borderLight}`,
              boxShadow: `0 4px 16px ${colors.shadow}`
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: colors.textPrimary }}>
                📝 Previous Responses ({currentPersona.interviewHistory.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                {[...currentPersona.interviewHistory].reverse().map((record, idx) => (
                  <div key={idx} style={{
                    padding: '16px',
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    borderLeft: `3px solid ${colors.primary}`
                  }}>
                    <div style={{ fontSize: '13px', color: colors.primary, marginBottom: '8px', fontWeight: 600 }}>
                      Q: {record.question}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textPrimary, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                      {record.answer}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '8px' }}>
                      {new Date(record.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          {personas.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {personas.map((persona, idx) => (
                <HistoryCard
                  key={idx}
                  persona={persona}
                  onContinue={() => startInterview(persona)}
                />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: colors.bgPrimary,
              borderRadius: '16px',
              border: `1px solid ${colors.borderLight}`,
              color: colors.textMuted
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
              <div style={{ fontSize: '15px' }}>No interview records yet. Generate personas or input manually to start.</div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Tab - 回答分析 */}
      {activeTab === 'analysis' && (
        <div>
          <div style={{
            background: colors.bgPrimary,
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            border: `1px solid ${colors.borderLight}`,
            boxShadow: `0 4px 16px ${colors.shadow}`
          }}>
            <h2 style={{ margin: '0 0 24px 0', color: colors.textPrimary, fontSize: '20px', fontWeight: 600 }}>
              📊 Summary Report / 總結報告
            </h2>

            {getAllQuestions().length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: colors.textMuted
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
                <div style={{ fontSize: '15px' }}>尚無訪談紀錄可分析。請先完成一些訪談。</div>
              </div>
            ) : (
              <>
                {/* Question Selector */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: colors.textPrimary
                  }}>
                    選擇要分析的問題 / Select Question to Analyze
                  </label>
                  <select
                    value={selectedQuestion}
                    onChange={(e) => {
                      setSelectedQuestion(e.target.value);
                      setAnalysisResult('');
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '12px',
                      fontSize: '15px',
                      outline: 'none',
                      background: 'rgba(255, 255, 255, 0.6)',
                      color: colors.textPrimary,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- 選擇問題 --</option>
                    {getAllQuestions().map((q, idx) => {
                      const responseCount = getResponsesForQuestion(q).length;
                      return (
                        <option key={idx} value={q}>
                          {q.length > 60 ? q.substring(0, 60) + '...' : q} ({responseCount} 人回答)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Response Preview */}
                {selectedQuestion && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: colors.textPrimary }}>
                      📝 回答預覽 ({getResponsesForQuestion(selectedQuestion).length} 人)
                    </h3>
                    <div style={{
                      maxHeight: '300px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {getResponsesForQuestion(selectedQuestion).map((resp, idx) => (
                        <div key={idx} style={{
                          padding: '14px',
                          background: colors.bgSecondary,
                          borderRadius: '12px',
                          borderLeft: `3px solid ${colors.primary}`
                        }}>
                          <div style={{
                            fontSize: '13px',
                            color: colors.primary,
                            marginBottom: '6px',
                            fontWeight: 600
                          }}>
                            {resp.persona.lastName} {resp.persona.gender === 'Male' ? '先生' : '小姐'}
                            <span style={{ fontWeight: 400, color: colors.textMuted, marginLeft: '8px' }}>
                              {resp.persona.age} tuổi • {resp.persona.occupation}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: colors.textPrimary,
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {resp.answer.length > 200 ? resp.answer.substring(0, 200) + '...' : resp.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analyze Button */}
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedQuestion || isAnalyzing || getResponsesForQuestion(selectedQuestion).length < 2}
                  style={{
                    padding: '14px 32px',
                    background: !selectedQuestion || isAnalyzing || getResponsesForQuestion(selectedQuestion).length < 2
                      ? colors.textMuted
                      : `linear-gradient(135deg, ${colors.info} 0%, #5a7db5 100%)`,
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: !selectedQuestion || isAnalyzing ? 'not-allowed' : 'pointer',
                    boxShadow: `0 4px 12px ${colors.shadow}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isAnalyzing ? '🔄 產出中...' : '🤖 AI 產出總結'}
                </button>

                {selectedQuestion && getResponsesForQuestion(selectedQuestion).length < 2 && (
                  <p style={{ marginTop: '12px', fontSize: '13px', color: colors.warning }}>
                    ⚠️ 需要至少 2 位受訪者的回答才能進行分析
                  </p>
                )}
              </>
            )}
          </div>

          {/* Analysis Result */}
          {analysisResult && (
            <div style={{
              background: colors.bgPrimary,
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '32px',
              border: `1px solid ${colors.borderLight}`,
              boxShadow: `0 4px 16px ${colors.shadow}`
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: colors.textPrimary }}>
                📈 總結報告 / Summary Report
              </h3>
              <div style={{
                fontSize: '14px',
                color: colors.textPrimary,
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap'
              }}>
                {analysisResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Sub-components
const TabButton = ({ label, isActive, onClick, disabled = false }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      flex: 1,
      padding: '16px 20px',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: isActive ? 600 : 500,
      fontSize: '14px',
      background: isActive ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)` : 'transparent',
      color: isActive ? 'white' : disabled ? colors.textMuted : colors.textSecondary,
      borderBottom: isActive ? `2px solid ${colors.primaryDark}` : 'none',
      transition: 'all 0.3s ease',
      opacity: disabled ? 0.5 : 1
    }}
  >{label}</button>
);

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label style={{
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: 500,
      color: colors.textSecondary
    }}>
      {label}
    </label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: `1px solid ${colors.border}`,
  borderRadius: '12px',
  fontSize: '15px',
  outline: 'none',
  background: 'rgba(255, 255, 255, 0.6)',
  color: colors.textPrimary,
  transition: 'all 0.3s ease'
};

// 生成的 Persona 卡片
const GeneratedPersonaCard = ({ persona, onStartInterview }: { persona: VietnamPersona; onStartInterview: () => void }) => (
  <div style={{
    background: colors.bgPrimary,
    borderRadius: '16px',
    overflow: 'hidden',
    border: `1px solid ${colors.borderLight}`,
    boxShadow: `0 4px 16px ${colors.shadow}`
  }}>
    <div style={{
      padding: '20px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.borderLight}`
    }}>
      <div style={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary, marginBottom: '4px' }}>
        {persona.id}
      </div>
      <div style={{ fontSize: '14px', color: colors.textSecondary }}>
        {persona.occupation} • {persona.age} tuổi
      </div>
    </div>

    <div style={{ padding: '16px 20px' }}>
      {/* Insurance Experience */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Insurance Experience
        </div>
        <div style={{ fontSize: '14px', color: colors.textPrimary }}>
          {persona.timesOfOverseasTravelInsurance} time(s)
          {persona.purchasedBrand.length > 0 && (
            <span style={{ color: colors.textSecondary }}> • {persona.purchasedBrand.join(', ')}</span>
          )}
        </div>
      </div>

      {/* Background */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Background
        </div>
        <div style={{
          fontSize: '13px',
          color: colors.textSecondary,
          lineHeight: '1.6',
          whiteSpace: 'pre-line'
        }}>
          {persona.personalBackground || 'No background info'}
        </div>
      </div>

      <button
        onClick={onStartInterview}
        style={{
          width: '100%',
          padding: '12px',
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
          border: 'none',
          borderRadius: '10px',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        🎤 Start Interview
      </button>
    </div>
  </div>
);

const HistoryCard = ({ persona, onContinue }: { persona: VietnamPersona; onContinue: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const progress = (() => {
    let completed = 0;
    for (let i = 0; i < persona.currentSectionIndex; i++) {
      completed += VIETNAM_INTERVIEW_SECTIONS[i].questions.length;
    }
    completed += persona.currentQuestionIndex;
    return (completed / getTotalQuestions()) * 100;
  })();

  return (
    <div style={{
      background: colors.bgPrimary,
      borderRadius: '16px',
      overflow: 'hidden',
      border: `1px solid ${colors.borderLight}`,
      boxShadow: `0 4px 16px ${colors.shadow}`
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        background: colors.bgSecondary,
        borderBottom: `1px solid ${colors.borderLight}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary }}>
            {persona.lastName} {persona.gender === 'Male' ? '先生' : '小姐'}
          </div>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '4px' }}>
            {persona.occupation} • {persona.age} tuổi • {persona.timesOfOverseasTravelInsurance} lần mua bảo hiểm
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {persona.isCompleted ? (
            <span style={{
              padding: '6px 14px',
              background: colors.success,
              color: 'white',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500
            }}>
              Completed
            </span>
          ) : (
            <>
              <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                {progress.toFixed(0)}% complete
              </span>
              <button
                onClick={onContinue}
                style={{
                  padding: '8px 16px',
                  background: colors.primary,
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div style={{ height: '4px', background: colors.bgSecondary }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: persona.isCompleted ? colors.success : colors.primary,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Content */}
      <div style={{ padding: '16px 24px' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            padding: '8px 0',
            color: colors.textSecondary,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {expanded ? '▲ Hide Responses' : `▼ Show ${persona.interviewHistory.length} Responses`}
        </button>

        {expanded && persona.interviewHistory.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            {persona.interviewHistory.map((record, idx) => (
              <div key={idx} style={{
                padding: '14px',
                background: colors.bgSecondary,
                borderRadius: '12px',
                borderLeft: `3px solid ${colors.primary}`
              }}>
                <div style={{ fontSize: '13px', color: colors.primary, marginBottom: '6px', fontWeight: 500 }}>
                  Q: {record.question}
                </div>
                <div style={{ fontSize: '14px', color: colors.textPrimary, lineHeight: '1.6' }}>
                  {record.answer}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
