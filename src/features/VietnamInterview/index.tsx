import { useState, useEffect, useRef } from 'react';
import {
  VietnamPersona,
  VietnamInterviewRecord
} from './vietnamPersonaSchema';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
  const [activeTab, setActiveTab] = useState<'home' | 'generate' | 'interview' | 'batch' | 'history' | 'analysis'>('home');
  const [personas, setPersonas] = useState<VietnamPersona[]>([]);
  const [currentPersona, setCurrentPersona] = useState<VietnamPersona | null>(null);
  const [loading, setLoading] = useState(false);

  // AI 生成狀態
  const [targetAudience, setTargetAudience] = useState('');
  const [personaCount, setPersonaCount] = useState(3);
  const [generatedPersonas, setGeneratedPersonas] = useState<VietnamPersona[]>([]);

  // 訪談狀態 - 彈性問答模式
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentTopicTag, setCurrentTopicTag] = useState('');  // 主題標籤
  const [isThinking, setIsThinking] = useState(false);

  // 使用 ref 追蹤最新的 persona ID，避免 async closure 問題
  const currentPersonaIdRef = useRef<string | null>(null);

  // 分析狀態
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [selectedTopicTag, setSelectedTopicTag] = useState<string>('');  // 主題標籤篩選
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // 支援多維度分類（多個圖表）
  const [classificationData, setClassificationData] = useState<{
    dimensions: Array<{
      dimension_name: string;
      categories: Array<{ name: string; count: number; percentage: number; color: string }>;
      details: Array<{ personaId: string; personaName: string; category: string; reason: string }>;
      recommendedChart: 'pie' | 'bar' | 'horizontal_bar';
    }>;
  } | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  // 批量訪談狀態
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [batchQuestion, setBatchQuestion] = useState('');
  const [batchTopicTag, setBatchTopicTag] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{
    personaId: string;
    personaName: string;
    success: boolean;
    response?: string;
    error?: string;
  }>>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [currentProcessingPersona, setCurrentProcessingPersona] = useState<string>('');

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

  // 刪除受訪者
  const deletePersona = async (personaId: string, personaName: string) => {
    if (!window.confirm(`確定要刪除「${personaName}」嗎？\n\n此操作無法復原，該受訪者的所有訪談記錄也會一併刪除。`)) {
      return;
    }
    try {
      const res = await fetch(`http://localhost:8787/api/vietnam_personas/${encodeURIComponent(personaId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // 如果刪除的是當前選中的受訪者，清除選擇
        if (currentPersona?.id === personaId) {
          setCurrentPersona(null);
        }
        // 從批量選擇中移除
        setSelectedPersonaIds(prev => prev.filter(id => id !== personaId));
        loadPersonas();
      } else {
        alert('刪除失敗，請稍後再試');
      }
    } catch (e) {
      console.error('Failed to delete persona:', e);
      alert('刪除失敗，請稍後再試');
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

  const startInterview = (persona: VietnamPersona) => {
    // 如果 AI 正在思考中，警告使用者並詢問是否要切換
    if (isThinking) {
      const confirmSwitch = window.confirm(
        '⚠️ AI 正在生成回答中，切換受訪者將會丟棄目前的回答。\n\n確定要切換嗎？'
      );
      if (!confirmSwitch) {
        return; // 使用者取消切換
      }
      // 使用者確認切換，停止等待並清除狀態
      setIsThinking(false);
      setCurrentAnswer('');
    }

    setCurrentPersona(persona);
    currentPersonaIdRef.current = persona.id;  // 同步更新 ref
    setActiveTab('interview');
  };

  // 彈性問答模式 - AI 模擬回答
  const handleFlexibleAIInterview = async () => {
    if (!currentPersona || !currentQuestion.trim()) return;

    // 記錄發起請求時的 persona ID 和問題，避免 race condition
    const requestPersonaId = currentPersona.id;
    const requestQuestion = currentQuestion;

    setIsThinking(true);

    try {
      const res = await fetch('http://localhost:8787/api/vietnam_interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: currentPersona,
          question: requestQuestion,
          subQuestions: []
        })
      });

      if (res.ok) {
        const data = await res.json();

        // 使用 ref 檢查回來時是否還在同一個 persona
        // ref 會即時反映最新的 persona，避免 closure 過時問題
        if (currentPersonaIdRef.current === requestPersonaId) {
          setCurrentAnswer(data.response);
        } else {
          // 使用者已切換到其他受訪者，顯示提示
          console.log(`⚠️ AI 回答完成，但已切換受訪者。回答屬於: ${requestPersonaId}, 目前: ${currentPersonaIdRef.current}`);
          alert(`AI 已完成回答，但你已切換到其他受訪者。\n\n回答已針對原本的受訪者生成，請回到該受訪者查看或重新發問。`);
        }
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
      timestamp: new Date().toISOString(),
      topicTag: currentTopicTag.trim() || undefined  // 主題標籤
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
    // 保留 topicTag 方便連續問同主題問題
  };

  // 取得所有主題標籤列表
  const getAllTopicTags = (): string[] => {
    const tagSet = new Set<string>();
    personas.forEach(p => {
      p.interviewHistory.forEach(record => {
        if (record.topicTag) {
          tagSet.add(record.topicTag);
        }
      });
    });
    return Array.from(tagSet);
  };

  // 正規化問題文字，讓語義相似的問題能被歸為同一組
  const normalizeQuestion = (question: string): string => {
    return question
      .replace(/？/g, '')  // 移除全形問號
      .replace(/\?/g, '')  // 移除半形問號
      .replace(/的時候/g, '時')  // 統一用詞
      .replace(/是幾歲/g, '幾歲')  // 統一用詞
      .replace(/\s+/g, '')  // 移除空白
      .trim();
  };

  // 取得所有問題列表（從所有受訪者的訪談紀錄中）
  // 如果有選擇主題標籤，則只顯示該主題的問題
  // 會將語義相似的問題合併為同一個選項
  const getAllQuestions = (): string[] => {
    // 用於追蹤正規化後的問題對應到的原始問題
    const normalizedToOriginal: Map<string, string> = new Map();

    personas.forEach(p => {
      p.interviewHistory.forEach(record => {
        if (record.question) {
          // 如果有選擇主題標籤，只顯示該主題的問題
          if (!selectedTopicTag || record.topicTag === selectedTopicTag) {
            const normalized = normalizeQuestion(record.question);
            // 只保留第一個出現的原始問題作為顯示用
            if (!normalizedToOriginal.has(normalized)) {
              normalizedToOriginal.set(normalized, record.question);
            }
          }
        }
      });
    });

    return Array.from(normalizedToOriginal.values());
  };

  // 取得特定問題的所有回答（支援主題標籤篩選）
  // 會自動匹配語義相似的問題
  const getResponsesForQuestion = (question: string) => {
    const responses: Array<{ persona: VietnamPersona; answer: string; topicTag?: string }> = [];
    const targetNormalized = normalizeQuestion(question);

    personas.forEach(persona => {
      persona.interviewHistory.forEach(record => {
        // 比較正規化後的問題
        if (normalizeQuestion(record.question) === targetNormalized) {
          // 如果有選擇主題標籤，只顯示該主題的回答
          if (!selectedTopicTag || record.topicTag === selectedTopicTag) {
            responses.push({
              persona,
              answer: record.answer,
              topicTag: record.topicTag
            });
          }
        }
      });
    });
    return responses;
  };

  // 取得特定主題標籤的所有回答（跨問題）
  const getResponsesForTopicTag = (tag: string) => {
    const responses: Array<{ persona: VietnamPersona; question: string; answer: string }> = [];
    personas.forEach(persona => {
      persona.interviewHistory.forEach(record => {
        if (record.topicTag === tag) {
          responses.push({
            persona,
            question: record.question,
            answer: record.answer
          });
        }
      });
    });
    return responses;
  };

  // 批量訪談處理 - 逐一呼叫以顯示即時進度
  const handleBatchInterview = async () => {
    if (selectedPersonaIds.length === 0 || !batchQuestion.trim()) {
      alert('請選擇至少一位受訪者並輸入問題');
      return;
    }

    setIsBatchProcessing(true);
    setBatchResults([]);
    setBatchProgress(0);

    const total = selectedPersonaIds.length;
    const results: typeof batchResults = [];

    // 建立 persona 對照表
    const personaMap = new Map(personas.map(p => [p.id, p]));

    for (let i = 0; i < selectedPersonaIds.length; i++) {
      const personaId = selectedPersonaIds[i];
      const persona = personaMap.get(personaId);

      // 更新進度
      setBatchProgress(Math.round((i / total) * 100));

      if (!persona) {
        results.push({
          personaId,
          personaName: '未知',
          success: false,
          error: '找不到此受訪者'
        });
        setBatchResults([...results]);
        continue;
      }

      const personaName = `${persona.lastName} ${persona.gender === 'Male' ? '先生' : '小姐'}`;

      // 顯示正在處理的受訪者
      setCurrentProcessingPersona(personaName);

      try {
        // 逐一呼叫單人訪談 API
        const res = await fetch('http://localhost:8787/api/vietnam_interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            persona: persona,
            question: batchQuestion,
            subQuestions: []
          })
        });

        if (res.ok) {
          const data = await res.json();

          // 建立訪談記錄並更新 persona
          const newRecord = {
            sectionId: 'batch',
            questionId: `batch_${Date.now()}_${personaId}`,
            question: batchQuestion,
            answer: data.response,
            timestamp: new Date().toISOString(),
            topicTag: batchTopicTag.trim() || undefined
          };

          const updatedPersona = {
            ...persona,
            interviewHistory: [...persona.interviewHistory, newRecord],
            updatedAt: new Date().toISOString()
          };

          // 儲存更新
          await fetch('http://localhost:8787/api/vietnam_personas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPersona)
          });

          results.push({
            personaId,
            personaName,
            success: true,
            response: data.response
          });
        } else {
          results.push({
            personaId,
            personaName,
            success: false,
            error: '訪談請求失敗'
          });
        }
      } catch (e) {
        console.error(`Interview failed for ${personaId}:`, e);
        results.push({
          personaId,
          personaName,
          success: false,
          error: String(e)
        });
      }

      // 即時更新結果顯示
      setBatchResults([...results]);
    }

    setBatchProgress(100);
    setCurrentProcessingPersona('');
    // 重新載入 personas 以獲取更新的訪談記錄
    loadPersonas();
    setIsBatchProcessing(false);
  };

  // 選擇/取消選擇受訪者
  const togglePersonaSelection = (personaId: string) => {
    setSelectedPersonaIds(prev =>
      prev.includes(personaId)
        ? prev.filter(id => id !== personaId)
        : [...prev, personaId]
    );
  };

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedPersonaIds.length === personas.length) {
      setSelectedPersonaIds([]);
    } else {
      setSelectedPersonaIds(personas.map(p => p.id));
    }
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
    setIsClassifying(true);
    setAnalysisResult('');
    setClassificationData(null);

    const requestBody = {
      question: selectedQuestion,
      responses: responses.map(r => ({
        persona: {
          id: r.persona.id,
          lastName: r.persona.lastName,
          gender: r.persona.gender,
          age: r.persona.age,
          occupation: r.persona.occupation,
          timesOfOverseasTravelInsurance: r.persona.timesOfOverseasTravelInsurance,
          purchasedBrand: r.persona.purchasedBrand
        },
        answer: r.answer
      }))
    };

    // 同時執行分析和多維度分類
    try {
      const [analysisRes, classifyRes] = await Promise.all([
        fetch('http://localhost:8787/api/vietnam_analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }),
        fetch('http://localhost:8787/api/vietnam_classify_multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      ]);

      if (analysisRes.ok) {
        const data = await analysisRes.json();
        setAnalysisResult(data.analysis);
      } else {
        setAnalysisResult('分析失敗，請稍後再試');
      }

      if (classifyRes.ok) {
        const classifyData = await classifyRes.json();
        if (classifyData.dimensions && classifyData.dimensions.length > 0) {
          setClassificationData({
            dimensions: classifyData.dimensions.map((dim: any) => ({
              dimension_name: dim.dimension_name,
              categories: dim.categories || [],
              details: dim.details || [],
              recommendedChart: dim.recommended_chart || 'bar'
            }))
          });
        }
      }
    } catch (e) {
      console.error('Analysis failed:', e);
      setAnalysisResult('分析失敗，請稍後再試');
    } finally {
      setIsAnalyzing(false);
      setIsClassifying(false);
    }
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
          <TabButton label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <TabButton label="AI Generate" isActive={activeTab === 'generate'} onClick={() => setActiveTab('generate')} />
          <TabButton label="Interview" isActive={activeTab === 'interview'} onClick={() => setActiveTab('interview')} disabled={!currentPersona} />
          <TabButton label="Batch" isActive={activeTab === 'batch'} onClick={() => setActiveTab('batch')} disabled={personas.length === 0} />
          <TabButton label="History" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabButton label="Analysis" isActive={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
        </div>
      </div>

      {/* Home Tab - 首頁總覽 */}
      {activeTab === 'home' && (
        <div>
          {/* Hero Section */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
            borderRadius: '16px',
            padding: '40px',
            marginBottom: '24px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>VN</div>
            <h1 style={{ margin: '0 0 12px 0', fontSize: '28px', fontWeight: 700 }}>
              Vietnam Market Research
            </h1>
            <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>
              越南旅遊保險市場調研系統 | AI-Powered Consumer Insights
            </p>
          </div>

          {/* Stats Overview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: colors.bgPrimary,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              border: `1px solid ${colors.borderLight}`,
              boxShadow: `0 2px 8px ${colors.shadow}`
            }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: colors.primary }}>{personas.length}</div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px' }}>受訪者 Personas</div>
            </div>
            <div style={{
              background: colors.bgPrimary,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              border: `1px solid ${colors.borderLight}`,
              boxShadow: `0 2px 8px ${colors.shadow}`
            }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: colors.info }}>
                {personas.reduce((sum, p) => sum + (p.interviewHistory?.length || 0), 0)}
              </div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px' }}>訪談記錄 Responses</div>
            </div>
            <div style={{
              background: colors.bgPrimary,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              border: `1px solid ${colors.borderLight}`,
              boxShadow: `0 2px 8px ${colors.shadow}`
            }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: colors.success }}>
                {new Set(personas.flatMap(p => p.interviewHistory?.map(h => h.question) || [])).size}
              </div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px' }}>問題數 Questions</div>
            </div>
            <div style={{
              background: colors.bgPrimary,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              border: `1px solid ${colors.borderLight}`,
              boxShadow: `0 2px 8px ${colors.shadow}`
            }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: colors.warning }}>
                {personas.filter(p => (p.interviewHistory?.length || 0) > 0).length}
              </div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px' }}>已訪談 Interviewed</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: colors.bgPrimary,
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
            border: `1px solid ${colors.borderLight}`,
            boxShadow: `0 4px 16px ${colors.shadow}`
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600, color: colors.textPrimary }}>
              Quick Actions / 快速操作
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <button
                onClick={() => setActiveTab('generate')}
                style={{
                  padding: '20px',
                  background: `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}05)`,
                  border: `1px solid ${colors.primary}30`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 600, color: colors.primary }}>AI</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>AI Generate</div>
                <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>生成模擬受訪者</div>
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                disabled={personas.length === 0}
                style={{
                  padding: '20px',
                  background: personas.length === 0 ? colors.bgSecondary : `linear-gradient(135deg, ${colors.info}15, ${colors.info}05)`,
                  border: `1px solid ${personas.length === 0 ? colors.borderLight : colors.info + '30'}`,
                  borderRadius: '12px',
                  cursor: personas.length === 0 ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  opacity: personas.length === 0 ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 600, color: colors.info }}>BTH</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>Batch Interview</div>
                <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>批量訪談多位受訪者</div>
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                style={{
                  padding: '20px',
                  background: `linear-gradient(135deg, ${colors.warning}15, ${colors.warning}05)`,
                  border: `1px solid ${colors.warning}30`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 600, color: colors.warning }}>RPT</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>Analysis</div>
                <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>分析回答並產生報告</div>
              </button>
            </div>
          </div>

          {/* Workflow Guide */}
          <div style={{
            background: colors.bgPrimary,
            borderRadius: '16px',
            padding: '28px',
            border: `1px solid ${colors.borderLight}`,
            boxShadow: `0 4px 16px ${colors.shadow}`
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600, color: colors.textPrimary }}>
              Workflow Guide / 使用流程
            </h2>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[
                { step: 1, icon: '1', title: 'Generate', desc: 'AI 生成受訪者 Personas' },
                { step: 2, icon: '2', title: 'Batch Interview', desc: '批量發送問題給多位受訪者' },
                { step: 3, icon: '3', title: 'Analyze', desc: 'AI 分析回答並產生圖表報告' },
                { step: 4, icon: '4', title: 'Export', desc: '匯出 PDF 研究報告' }
              ].map((item, idx) => (
                <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: colors.primary,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    fontSize: '16px',
                    fontWeight: 700
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary, marginBottom: '4px' }}>
                    Step {item.step}: {item.title}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.textMuted }}>
                    {item.desc}
                  </div>
                  {idx < 3 && (
                    <div style={{
                      position: 'absolute',
                      right: '-20px',
                      top: '24px',
                      color: colors.textMuted,
                      fontSize: '16px'
                    }}>
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              Generate Vietnamese Interviewees / AI 生成越南受訪者
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
                {loading ? 'Generating...' : 'Generate'}
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
                  {currentPersona.lastName} {currentPersona.gender === 'Male' ? '先生' : '小姐'}
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
              Ask Any Question / 輸入任何問題
            </h3>

            {/* Topic Tag Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary
              }}>
                主題標籤 / Topic Tag <span style={{ fontWeight: 400, color: colors.textMuted }}>(同標籤的問題會被分組分析)</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={currentTopicTag}
                  onChange={(e) => setCurrentTopicTag(e.target.value)}
                  placeholder="例如：購買決策、品牌認知、通路偏好..."
                  disabled={isThinking}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '10px 14px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    color: colors.textPrimary,
                    background: 'rgba(255, 255, 255, 0.6)'
                  }}
                />
                {/* Quick tag buttons from existing tags */}
                {getAllTopicTags().slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setCurrentTopicTag(tag)}
                    style={{
                      padding: '6px 12px',
                      background: currentTopicTag === tag ? colors.primary : colors.bgSecondary,
                      border: `1px solid ${currentTopicTag === tag ? colors.primary : colors.border}`,
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: currentTopicTag === tag ? 'white' : colors.textSecondary,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

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
                placeholder={isThinking ? 'AI 正在思考中...' : '點擊「AI 模擬回答」讓 AI 回答，或手動輸入回覆...'}
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
                {isThinking ? 'Thinking...' : 'AI Simulate Response'}
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
                  Save & Continue
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
                Previous Responses ({currentPersona.interviewHistory.length})
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

      {/* Batch Interview Tab - 批量訪談 */}
      {activeTab === 'batch' && (
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
              批量訪談 / Batch Interview
            </h2>
            <p style={{ margin: '0 0 20px 0', color: colors.textSecondary, fontSize: '14px' }}>
              選擇多位受訪者，讓他們同時回答同一個問題。回答會自動儲存到每位受訪者的訪談記錄中。
            </p>

            {/* 受訪者選擇區 */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '15px', fontWeight: 500, color: colors.textPrimary }}>
                  選擇受訪者 ({selectedPersonaIds.length}/{personas.length} 已選)
                </label>
                <button
                  onClick={toggleSelectAll}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: colors.textSecondary,
                    cursor: 'pointer'
                  }}
                >
                  {selectedPersonaIds.length === personas.length ? '取消全選' : '全選'}
                </button>
              </div>

              {personas.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  color: colors.textMuted
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '12px', opacity: 0.5, fontWeight: 600 }}>No Personas</div>
                  <div>尚無受訪者，請先在「AI Generate」生成受訪者</div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {personas.map((persona) => {
                    const isSelected = selectedPersonaIds.includes(persona.id);
                    return (
                      <div
                        key={persona.id}
                        onClick={() => !isBatchProcessing && togglePersonaSelection(persona.id)}
                        style={{
                          padding: '14px',
                          background: isSelected ? `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.primaryLight}20 100%)` : colors.bgSecondary,
                          border: `2px solid ${isSelected ? colors.primary : 'transparent'}`,
                          borderRadius: '12px',
                          cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: isBatchProcessing ? 0.6 : 1
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                            background: isSelected ? colors.primary : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            flexShrink: 0
                          }}>
                            {isSelected && '✓'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: colors.textPrimary, fontSize: '14px' }}>
                              {persona.lastName} {persona.gender === 'Male' ? '先生' : '小姐'}
                            </div>
                            <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '2px' }}>
                              {persona.occupation} • {persona.age} tuổi
                            </div>
                          </div>
                          {/* 刪除按鈕 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // 防止觸發選擇
                              const personaName = `${persona.lastName} ${persona.gender === 'Male' ? '先生' : '小姐'}`;
                              deletePersona(persona.id, personaName);
                            }}
                            disabled={isBatchProcessing}
                            title="刪除此受訪者"
                            style={{
                              width: '24px',
                              height: '24px',
                              padding: 0,
                              border: 'none',
                              borderRadius: '6px',
                              background: 'transparent',
                              color: colors.textMuted,
                              fontSize: '14px',
                              cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
                              opacity: 0.5,
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                              if (!isBatchProcessing) {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.color = '#dc3545';
                                e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.5';
                              e.currentTarget.style.color = colors.textMuted;
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 主題標籤 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary
              }}>
                主題標籤 / Topic Tag
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={batchTopicTag}
                  onChange={(e) => setBatchTopicTag(e.target.value)}
                  placeholder="例如：購買決策、品牌認知..."
                  disabled={isBatchProcessing}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '10px 14px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    color: colors.textPrimary,
                    background: 'rgba(255, 255, 255, 0.6)'
                  }}
                />
                {getAllTopicTags().slice(0, 3).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setBatchTopicTag(tag)}
                    disabled={isBatchProcessing}
                    style={{
                      padding: '6px 12px',
                      background: batchTopicTag === tag ? colors.primary : colors.bgSecondary,
                      border: `1px solid ${batchTopicTag === tag ? colors.primary : colors.border}`,
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: batchTopicTag === tag ? 'white' : colors.textSecondary,
                      cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 問題輸入 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary
              }}>
                訪談問題 / Question
              </label>
              <textarea
                value={batchQuestion}
                onChange={(e) => setBatchQuestion(e.target.value)}
                placeholder="輸入要讓所有受訪者回答的問題..."
                disabled={isBatchProcessing}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '14px',
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

            {/* 執行按鈕 */}
            <button
              onClick={handleBatchInterview}
              disabled={isBatchProcessing || selectedPersonaIds.length === 0 || !batchQuestion.trim()}
              style={{
                padding: '14px 32px',
                background: isBatchProcessing || selectedPersonaIds.length === 0 || !batchQuestion.trim()
                  ? colors.textMuted
                  : `linear-gradient(135deg, ${colors.accent} 0%, #b89960 100%)`,
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 500,
                cursor: isBatchProcessing || selectedPersonaIds.length === 0 || !batchQuestion.trim() ? 'not-allowed' : 'pointer',
                boxShadow: `0 4px 12px ${colors.shadow}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isBatchProcessing ? (
                <>Processing {batchProgress}% - {currentProcessingPersona || 'Preparing...'}</>
              ) : (
                <>Start Batch Interview ({selectedPersonaIds.length} personas)</>
              )}
            </button>
          </div>

          {/* 批量訪談結果 */}
          {batchResults.length > 0 && (
            <div style={{
              background: colors.bgPrimary,
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '32px',
              border: `1px solid ${colors.borderLight}`,
              boxShadow: `0 4px 16px ${colors.shadow}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: colors.textPrimary }}>
                  Batch Results ({batchResults.filter(r => r.success).length}/{batchResults.length} success)
                </h3>
                <button
                  onClick={() => {
                    setBatchResults([]);
                    setBatchQuestion('');
                    setSelectedPersonaIds([]);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: colors.textSecondary,
                    cursor: 'pointer'
                  }}
                >
                  清除結果
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto' }}>
                {batchResults.map((result, idx) => (
                  <div key={idx} style={{
                    padding: '18px',
                    background: result.success ? colors.bgSecondary : `${colors.danger}10`,
                    borderRadius: '12px',
                    borderLeft: `4px solid ${result.success ? colors.primary : colors.danger}`
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <span style={{ fontWeight: 600, color: colors.textPrimary, fontSize: '15px' }}>
                        {result.success ? '✓' : '✗'} {result.personaName}
                      </span>
                      {!result.success && (
                        <span style={{ fontSize: '12px', color: colors.danger }}>
                          {result.error}
                        </span>
                      )}
                    </div>
                    {result.success && result.response && (
                      <div style={{
                        fontSize: '14px',
                        color: colors.textPrimary,
                        lineHeight: '1.7',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {result.response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab - 重新設計：雙視圖模式 */}
      {activeTab === 'history' && (
        <HistoryTabContent
          personas={personas}
          onContinueInterview={startInterview}
          onDeletePersona={deletePersona}
        />
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
              Summary Report / 總結報告
            </h2>

            {getAllQuestions().length === 0 && getAllTopicTags().length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: colors.textMuted
              }}>
                <div style={{ fontSize: '16px', marginBottom: '16px', opacity: 0.5, fontWeight: 600 }}>No Data</div>
                <div style={{ fontSize: '15px' }}>尚無訪談紀錄可分析。請先完成一些訪談。</div>
              </div>
            ) : (
              <>
                {/* Topic Tag Filter */}
                {getAllTopicTags().length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '10px',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: colors.textPrimary
                    }}>
                      按主題篩選 / Filter by Topic Tag
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setSelectedTopicTag('');
                          setSelectedQuestion('');
                          setAnalysisResult('');
                        }}
                        style={{
                          padding: '8px 16px',
                          background: !selectedTopicTag ? colors.primary : 'transparent',
                          border: `1px solid ${!selectedTopicTag ? colors.primary : colors.border}`,
                          borderRadius: '20px',
                          fontSize: '13px',
                          color: !selectedTopicTag ? 'white' : colors.textSecondary,
                          cursor: 'pointer',
                          fontWeight: !selectedTopicTag ? 600 : 400
                        }}
                      >
                        全部
                      </button>
                      {getAllTopicTags().map((tag) => {
                        const tagCount = getResponsesForTopicTag(tag).length;
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              setSelectedTopicTag(tag);
                              setSelectedQuestion('');
                              setAnalysisResult('');
                            }}
                            style={{
                              padding: '8px 16px',
                              background: selectedTopicTag === tag ? colors.primary : 'transparent',
                              border: `1px solid ${selectedTopicTag === tag ? colors.primary : colors.border}`,
                              borderRadius: '20px',
                              fontSize: '13px',
                              color: selectedTopicTag === tag ? 'white' : colors.textSecondary,
                              cursor: 'pointer',
                              fontWeight: selectedTopicTag === tag ? 600 : 400
                            }}
                          >
                            {tag} ({tagCount})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                    {selectedTopicTag && <span style={{ fontWeight: 400, color: colors.textMuted }}> (已篩選: {selectedTopicTag})</span>}
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
                      Response Preview ({getResponsesForQuestion(selectedQuestion).length} respondents)
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
                  {isAnalyzing ? 'Generating...' : 'AI Generate Summary'}
                </button>

                {selectedQuestion && getResponsesForQuestion(selectedQuestion).length < 2 && (
                  <p style={{ marginTop: '12px', fontSize: '13px', color: colors.warning }}>
                    需要至少 2 位受訪者的回答才能進行分析
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: colors.textPrimary }}>
                  Summary Report / 總結報告
                </h3>
                {/* Export Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(analysisResult);
                      alert('已複製到剪貼簿！');
                    }}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.textSecondary,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={async () => {
                      const responses = getResponsesForQuestion(selectedQuestion);
                      const timestamp = new Date().toISOString().split('T')[0];
                      const formattedDate = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

                      // 截取圖表區域 (如果存在) - 逐個截取每個維度的圖表
                      let chartsImageHtml = '';
                      const chartsContainer = document.getElementById('charts-container');
                      if (chartsContainer && classificationData && classificationData.dimensions.length > 0) {
                        try {
                          const html2canvas = (await import('html2canvas')).default;
                          const chartCards = chartsContainer.querySelectorAll(':scope > div');
                          const chartImages: string[] = [];

                          for (const card of chartCards) {
                            try {
                              // 隱藏 details 元素（各受訪者分類結果）以避免截圖時被截斷
                              const detailsElements = card.querySelectorAll('details');
                              detailsElements.forEach(el => {
                                (el as HTMLElement).style.display = 'none';
                              });

                              const canvas = await html2canvas(card as HTMLElement, {
                                scale: 2,
                                useCORS: true,
                                backgroundColor: '#ffffff',
                                logging: false
                              });
                              chartImages.push(canvas.toDataURL('image/png'));

                              // 恢復 details 元素顯示
                              detailsElements.forEach(el => {
                                (el as HTMLElement).style.display = '';
                              });
                            } catch (err) {
                              console.error('Failed to capture chart card:', err);
                            }
                          }

                          if (chartImages.length > 0) {
                            chartsImageHtml = `
                              <h2 style="color: #1e3a5f; font-size: 13pt; margin-top: 30px; border-left: 4px solid #1e3a5f; padding-left: 12px;">
                                圖表分析 | Data Visualization
                              </h2>
                              ${chartImages.map((img, idx) => `
                                <div style="margin: 15px 0; page-break-inside: avoid;">
                                  <img src="${img}" style="width: 100%; max-width: 550px; border: 1px solid #e2e8f0; border-radius: 8px; display: block; margin: 10px auto;" />
                                </div>
                              `).join('')}
                            `;
                          }
                        } catch (e) {
                          console.error('Failed to capture charts:', e);
                        }
                      }

                      // Create HTML content for PDF
                      const pdfContent = document.createElement('div');
                      pdfContent.innerHTML = `
<div style="font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; padding: 20px; color: #1f2937;">
  <h1 style="color: #1e3a5f; font-size: 20pt; text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 8px;">
    越南消費者旅遊保險市場調研報告
  </h1>
  <p style="text-align: center; color: #64748b; font-size: 11pt; margin-bottom: 25px;">
    Vietnam Consumer Travel Insurance Market Research Report
  </p>

  <h2 style="color: #1e3a5f; font-size: 13pt; margin-top: 30px; border-left: 4px solid #1e3a5f; padding-left: 12px;">
    一、報告資訊 | Report Information
  </h2>
  <table style="width: 100%; border-collapse: collapse; margin: 15px 0 25px 0;">
    <tr>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; width: 100px; font-weight: 600; background: #1e3a5f; color: white; font-size: 11px;">報告日期</td>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-size: 12px;">${formattedDate}</td>
    </tr>
    <tr>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; background: #1e3a5f; color: white; font-size: 11px;">研究主題</td>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-size: 12px;">越南消費者旅遊保險認知與購買行為研究</td>
    </tr>
    <tr>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; background: #1e3a5f; color: white; font-size: 11px;">訪談問題</td>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-size: 12px;">${selectedQuestion}</td>
    </tr>
    <tr>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; background: #1e3a5f; color: white; font-size: 11px;">樣本數量</td>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-size: 12px;">${responses.length} 位受訪者</td>
    </tr>
    <tr>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; background: #1e3a5f; color: white; font-size: 11px;">研究方法</td>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-size: 12px;">AI 模擬深度訪談法</td>
    </tr>
  </table>

  <h2 style="color: #1e3a5f; font-size: 13pt; margin-top: 30px; border-left: 4px solid #1e3a5f; padding-left: 12px;">
    二、分析摘要 | Executive Summary
  </h2>
  <div style="margin: 15px 0;">
    ${formatAnalysisForExport(analysisResult)}
  </div>

  ${chartsImageHtml}

  <h2 style="color: #1e3a5f; font-size: 13pt; margin-top: 30px; border-left: 4px solid #1e3a5f; padding-left: 12px;">
    三、受訪者基本資料 | Respondent Profiles
  </h2>
  <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
    <tr style="background: #1e3a5f; color: white;">
      <th style="padding: 10px; border: 1px solid #1e3a5f; text-align: left; font-size: 11px;">#</th>
      <th style="padding: 10px; border: 1px solid #1e3a5f; text-align: left; font-size: 11px;">姓名</th>
      <th style="padding: 10px; border: 1px solid #1e3a5f; text-align: left; font-size: 11px;">性別</th>
      <th style="padding: 10px; border: 1px solid #1e3a5f; text-align: left; font-size: 11px;">年齡</th>
      <th style="padding: 10px; border: 1px solid #1e3a5f; text-align: left; font-size: 11px;">職業</th>
      <th style="padding: 10px; border: 1px solid #1e3a5f; text-align: left; font-size: 11px;">保險購買次數</th>
    </tr>
    ${responses.map((r, i) => `
    <tr style="background: ${i % 2 === 0 ? '#f8fafc' : 'white'};">
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${i + 1}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${r.persona.lastName} ${r.persona.gender === 'Male' ? '先生' : '小姐'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${r.persona.gender === 'Male' ? '男' : '女'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${r.persona.age} 歲</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${r.persona.occupation}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${r.persona.timesOfOverseasTravelInsurance} 次</td>
    </tr>
    `).join('')}
  </table>

  <h2 style="color: #1e3a5f; font-size: 14pt; margin-top: 35px; border-left: 4px solid #1e3a5f; padding-left: 12px;">
    四、訪談紀錄詳情 | Interview Details
  </h2>
  ${responses.map((r, i) => `
  <div style="border: 1px solid #e2e8f0; border-radius: 6px; margin: 15px 0; overflow: hidden; page-break-inside: avoid; break-inside: avoid;">
    <div style="background: #1e3a5f; padding: 12px 16px; font-weight: 600; color: white; font-size: 13px;">
      受訪者 ${i + 1}：${r.persona.lastName} ${r.persona.gender === 'Male' ? '先生' : '小姐'}
    </div>
    <div style="padding: 10px 16px; background: #f1f5f9; font-size: 11px; color: #64748b; border-bottom: 1px solid #e2e8f0;">
      年齡：${r.persona.age} 歲 | 職業：${r.persona.occupation} | 保險經驗：${r.persona.timesOfOverseasTravelInsurance} 次
    </div>
    <div style="padding: 16px; background: #ffffff; border-left: 3px solid #3b82f6; line-height: 1.8; font-size: 12px; color: #374151;">
      ${r.answer}
    </div>
  </div>
  `).join('')}

  ${classificationData && classificationData.dimensions && classificationData.dimensions.length > 0 ? `
  <div style="page-break-before: always;">
    <div style="padding-top: 30px;">
      <h2 style="color: #1e3a5f; font-size: 13pt; border-left: 4px solid #1e3a5f; padding-left: 12px; margin-bottom: 15px; margin-top: 0;">
        附錄一、各受訪者分類結果 | Respondent Classification Details
      </h2>
    </div>
    <p style="color: #64748b; font-size: 10px; margin-bottom: 15px;">
      以下表格詳列每位受訪者在各分析維度的分類結果，供進一步研究參考。分類依據為 AI 根據受訪者回答內容進行的語意分析。
    </p>
    ${classificationData.dimensions.map((dim: { dimension_name: string; details: Array<{ personaName: string; category: string; reason: string }> }) => `
    <div style="margin-bottom: 25px; page-break-inside: avoid;">
      <h3 style="color: #475569; font-size: 11pt; margin-bottom: 10px; padding: 8px 12px; background: #f1f5f9; border-radius: 4px;">
        ${dim.dimension_name}
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <tr style="background: #1e3a5f; color: white;">
          <th style="padding: 8px 10px; border: 1px solid #1e3a5f; text-align: left; width: 30%;">受訪者</th>
          <th style="padding: 8px 10px; border: 1px solid #1e3a5f; text-align: left; width: 25%;">分類結果</th>
          <th style="padding: 8px 10px; border: 1px solid #1e3a5f; text-align: left; width: 45%;">分類依據</th>
        </tr>
        ${dim.details.map((detail: { personaName: string; category: string; reason: string }, idx: number) => `
        <tr style="background: ${idx % 2 === 0 ? '#f8fafc' : 'white'};">
          <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${detail.personaName}</td>
          <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 500;">${detail.category}</td>
          <td style="padding: 6px 10px; border: 1px solid #e2e8f0; color: #64748b;">${detail.reason || '-'}</td>
        </tr>
        `).join('')}
      </table>
    </div>
    `).join('')}
  </div>
  ` : ''}

  <div style="margin-top: 35px; padding: 16px; background: #f8fafc; border-radius: 6px; page-break-inside: avoid; break-inside: avoid;">
    <h3 style="color: #1e3a5f; font-size: 11pt; margin: 0 0 10px 0;">附錄${classificationData && classificationData.dimensions && classificationData.dimensions.length > 0 ? '二' : ''}：研究方法說明</h3>
    <p style="color: #64748b; font-size: 10px; line-height: 1.7; margin: 0 0 8px 0;">
      本研究採用半結構式深度訪談法，透過 AI 模擬技術生成具代表性的越南消費者 Persona，針對旅遊保險相關議題進行訪談，並以 AI 輔助分析技術彙整質性資料。
    </p>
    <p style="color: #64748b; font-size: 10px; line-height: 1.7; margin: 0;">
      <strong>報告聲明：</strong>本報告由 Vietnam Interview AI System 自動生成，資料來源為模擬訪談結果，僅供市場研究參考使用。
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
    <p style="margin: 0;">Report Generated by Vietnam Interview AI System</p>
    <p style="margin: 4px 0 0 0;">${timestamp}</p>
  </div>
</div>`;

                      // Dynamic import html2pdf
                      const html2pdf = (await import('html2pdf.js')).default;

                      const opt = {
                        margin: 10,
                        filename: `越南旅遊保險調研報告_${timestamp}.pdf`,
                        image: { type: 'jpeg' as const, quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
                      };

                      html2pdf().set(opt).from(pdfContent).save();
                    }}
                    style={{
                      padding: '8px 16px',
                      background: colors.danger,
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    匯出 PDF
                  </button>
                </div>
              </div>

              {/* 多維度圖表視覺化 */}
              {classificationData && classificationData.dimensions.length > 0 && (
                <div id="charts-container">
                  {classificationData.dimensions.map((dimension, dimIdx) => (
                    <div key={dimIdx} style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '20px',
                      border: `1px solid ${colors.borderLight}`,
                      boxShadow: `0 2px 8px ${colors.shadow}`
                    }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: colors.textPrimary,
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {dimension.dimension_name}
                        <span style={{
                          fontSize: '11px',
                          color: colors.textMuted,
                          fontWeight: 400,
                          marginLeft: 'auto',
                          padding: '2px 8px',
                          background: colors.bgSecondary,
                          borderRadius: '4px'
                        }}>
                          {dimension.recommendedChart === 'pie' ? '圓餅圖' :
                           dimension.recommendedChart === 'bar' ? '長條圖' : '橫條圖'}
                        </span>
                      </div>

                      {/* 圓餅圖 */}
                      {dimension.recommendedChart === 'pie' && (
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                          <div style={{ width: '200px', height: '200px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={dimension.categories}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={80}
                                  paddingAngle={2}
                                  dataKey="count"
                                  nameKey="name"
                                >
                                  {dimension.categories.map((entry: { color: string }, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value) => [`${value} 人`]}
                                  contentStyle={{
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    fontSize: '12px'
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          {/* 圖例說明 */}
                          <div style={{ flex: 1 }}>
                            {dimension.categories.map((cat: { name: string; count: number; percentage: number; color: string }, idx: number) => (
                              <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                background: idx % 2 === 0 ? '#f8fafc' : 'white',
                                borderRadius: '6px',
                                marginBottom: '4px'
                              }}>
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '3px',
                                  background: cat.color,
                                  flexShrink: 0
                                }} />
                                <span style={{ flex: 1, fontSize: '13px', color: colors.textPrimary }}>
                                  {cat.name}
                                </span>
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: colors.textPrimary
                                }}>
                                  {cat.count} 人
                                </span>
                                <span style={{
                                  fontSize: '12px',
                                  color: colors.textMuted,
                                  minWidth: '45px',
                                  textAlign: 'right'
                                }}>
                                  ({cat.percentage}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 垂直長條圖 */}
                      {dimension.recommendedChart === 'bar' && (
                        <div style={{ width: '100%', height: '280px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={dimension.categories}
                              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 12, fill: colors.textPrimary }}
                                angle={-30}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis
                                tick={{ fontSize: 12, fill: colors.textMuted }}
                                allowDecimals={false}
                              />
                              <Tooltip
                                formatter={(value) => [`${value} 人`]}
                                contentStyle={{
                                  borderRadius: '8px',
                                  border: 'none',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  fontSize: '12px'
                                }}
                              />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {dimension.categories.map((entry: { color: string }, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* 水平橫條圖 */}
                      {dimension.recommendedChart === 'horizontal_bar' && (
                        <div style={{ width: '100%', height: Math.max(200, dimension.categories.length * 50) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={dimension.categories}
                              layout="vertical"
                              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                type="number"
                                tick={{ fontSize: 12, fill: colors.textMuted }}
                                allowDecimals={false}
                              />
                              <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 12, fill: colors.textPrimary }}
                                width={90}
                              />
                              <Tooltip
                                formatter={(value) => [`${value} 人`]}
                                contentStyle={{
                                  borderRadius: '8px',
                                  border: 'none',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  fontSize: '12px'
                                }}
                              />
                              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {dimension.categories.map((entry: { color: string }, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* 分類詳情 - 可收合 */}
                      {dimension.details.length > 0 && (
                        <details style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${colors.borderLight}` }}>
                          <summary style={{ fontSize: '12px', color: colors.textMuted, cursor: 'pointer', marginBottom: '8px' }}>
                            各受訪者分類結果 ({dimension.details.length} 人)
                          </summary>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                            {dimension.details.map((detail: { personaId: string; personaName: string; category: string; reason: string }, idx: number) => (
                              <span key={idx} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                background: (dimension.categories.find((c: { name: string; color: string }) => c.name === detail.category)?.color || '#ccc') + '20',
                                borderRadius: '12px',
                                fontSize: '11px',
                                color: colors.textPrimary
                              }}>
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: dimension.categories.find((c: { name: string; color: string }) => c.name === detail.category)?.color || '#ccc'
                                }} />
                                {detail.personaName}
                              </span>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 圖表載入中 */}
              {isClassifying && !classificationData && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '20px',
                  border: `1px solid ${colors.borderLight}`,
                  textAlign: 'center',
                  color: colors.textMuted
                }}>
                  <div style={{ fontSize: '13px' }}>Classifying responses and generating charts...</div>
                </div>
              )}

              {/* 專業格式化的分析結果 */}
              <AnalysisResultDisplay content={analysisResult} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 格式化分析結果為專業 HTML（用於 PDF/Word 匯出）- 使用莫蘭迪色系
const formatAnalysisForExport = (content: string): string => {
  const lines = content.split('\n').filter(line => line.trim());
  let html = '';
  let currentSection = '';
  let listIndex = 0;

  // 莫蘭迪色系 + 酒紅重點
  const exportColors = {
    headlineBg: '#6b8065',
    findingBorder: '#8b9e85',
    findingBg: '#f5f8f5',
    actionBorder: '#8b5a5a',     // 莫蘭迪酒紅
    actionBg: '#faf5f5',         // 淺酒紅背景
    text: '#2d3e2d'
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 識別標題（移除 emoji）
    if (trimmed.startsWith('📌') || trimmed.includes('一句話總結')) {
      const text = trimmed.replace(/^📌\s*/, '').replace('一句話總結', '').trim();
      html += `<div style="background: ${exportColors.headlineBg}; color: white; padding: 14px 18px; border-radius: 6px 6px 0 0; font-weight: 600; font-size: 13px; letter-spacing: 0.5px;">SUMMARY</div>`;
      if (text) {
        html += `<div style="background: ${exportColors.findingBg}; padding: 14px 18px; font-size: 13px; line-height: 1.7; color: ${exportColors.text}; border-left: 3px solid ${exportColors.headlineBg};">${text}</div>`;
      }
    } else if (trimmed.startsWith('🔑') || trimmed.includes('關鍵發現')) {
      currentSection = 'findings';
      listIndex = 0;
      html += `<div style="display: flex; align-items: center; gap: 8px; padding: 12px 0 8px 0; margin-top: 16px; border-bottom: 2px solid ${exportColors.findingBorder};"><span style="font-size: 12px; font-weight: 700; color: ${exportColors.findingBorder}; letter-spacing: 1px; text-transform: uppercase;">KEY FINDINGS</span></div>`;
    } else if (trimmed.startsWith('💡') || trimmed.includes('行動建議')) {
      currentSection = 'recommendations';
      listIndex = 0;
      html += `<div style="display: flex; align-items: center; gap: 8px; padding: 12px 0 8px 0; margin-top: 16px; border-bottom: 2px solid ${exportColors.actionBorder};"><span style="font-size: 12px; font-weight: 700; color: ${exportColors.actionBorder}; letter-spacing: 1px; text-transform: uppercase;">RECOMMENDATIONS</span></div>`;
    } else if (/^\d+[\.、]/.test(trimmed)) {
      listIndex++;
      const text = trimmed.replace(/^\d+[\.、]\s*/, '');
      const isAction = currentSection === 'recommendations';
      const bgColor = isAction ? exportColors.actionBg : exportColors.findingBg;
      const borderColor = isAction ? exportColors.actionBorder : exportColors.findingBorder;
      html += `<div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 14px; background: ${bgColor}; border-left: 3px solid ${borderColor}; margin-top: 3px;"><span style="min-width: 20px; height: 20px; border-radius: 4px; background: ${borderColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0;">${listIndex}</span><span style="font-size: 13px; line-height: 1.6; color: ${exportColors.text};">${text}</span></div>`;
    } else if (html.includes('SUMMARY') && !html.includes('KEY FINDINGS')) {
      // Summary 內容
      html += `<div style="background: ${exportColors.findingBg}; padding: 14px 18px; font-size: 13px; line-height: 1.7; color: ${exportColors.text}; border-left: 3px solid ${exportColors.headlineBg};">${trimmed}</div>`;
    } else {
      html += `<div style="padding: 6px 14px; font-size: 13px; line-height: 1.5; color: #5a6d5a;">${trimmed}</div>`;
    }
  }

  return `<div style="display: flex; flex-direction: column; gap: 0;">${html}</div>`;
};

// 專業格式化的分析結果顯示組件
const AnalysisResultDisplay = ({ content }: { content: string }) => {
  // 解析內容，識別不同區塊並標記所屬 section
  const sections = content.split('\n').reduce((acc: Array<{type: string; content: string; section?: string}>, line) => {
    const trimmed = line.trim();
    if (!trimmed) return acc;

    // 取得當前 section
    const lastSection = acc.findLast(s => s.type === 'section-title');
    const currentSection = lastSection?.content || '';

    // 識別標題（移除 emoji 符號）
    if (trimmed.startsWith('📌') || trimmed.includes('一句話總結')) {
      acc.push({ type: 'headline', content: trimmed.replace(/^📌\s*/, '').replace('一句話總結', '').trim() || '核心發現' });
    } else if (trimmed.startsWith('🔑') || trimmed.includes('關鍵發現')) {
      acc.push({ type: 'section-title', content: '關鍵發現' });
    } else if (trimmed.startsWith('💡') || trimmed.includes('行動建議')) {
      acc.push({ type: 'section-title', content: '行動建議' });
    } else if (/^\d+[\.、]/.test(trimmed)) {
      // 數字列表項目，標記所屬 section
      acc.push({ type: 'list-item', content: trimmed.replace(/^\d+[\.、]\s*/, ''), section: currentSection });
    } else if (acc.length > 0 && acc[acc.length - 1].type === 'headline') {
      // 緊跟在 headline 後的是摘要內容
      acc.push({ type: 'summary', content: trimmed });
    } else {
      acc.push({ type: 'text', content: trimmed, section: currentSection });
    }
    return acc;
  }, []);

  // 專業配色 - 莫蘭迪綠色系 + 酒紅重點
  const proColors = {
    headlineBg: '#6b8065',           // 莫蘭迪深綠
    headlineText: '#ffffff',
    sectionTitle: '#5a6d5a',
    findingBg: 'rgba(139, 158, 133, 0.08)',  // 淺莫蘭迪綠背景
    findingBorder: '#8b9e85',        // 莫蘭迪綠
    actionBg: 'rgba(139, 90, 90, 0.06)',     // 淺酒紅背景
    actionBorder: '#8b5a5a',         // 莫蘭迪酒紅
    text: '#2d3e2d',
    textMuted: '#5a6d5a'
  };

  // 計算列表編號
  let findingIndex = 0;
  let actionIndex = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {sections.map((section, idx) => {
        if (section.type === 'headline') {
          return (
            <div key={idx} style={{
              background: proColors.headlineBg,
              color: proColors.headlineText,
              padding: '14px 18px',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              fontSize: '13px',
              letterSpacing: '0.5px'
            }}>
              SUMMARY
            </div>
          );
        }

        if (section.type === 'summary') {
          return (
            <div key={idx} style={{
              background: '#f1f5f9',
              padding: '14px 18px',
              fontSize: '13px',
              lineHeight: '1.7',
              color: proColors.text,
              borderLeft: `3px solid ${proColors.headlineBg}`,
              borderRadius: '0 0 0 0'
            }}>
              {section.content}
            </div>
          );
        }

        if (section.type === 'section-title') {
          const isAction = section.content.includes('建議');
          // 重置計數器
          if (isAction) actionIndex = 0;
          else findingIndex = 0;

          return (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 0 8px 0',
              marginTop: '16px',
              borderBottom: `2px solid ${isAction ? proColors.actionBorder : proColors.findingBorder}`
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: isAction ? proColors.actionBorder : proColors.findingBorder,
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                {isAction ? 'RECOMMENDATIONS' : 'KEY FINDINGS'}
              </span>
            </div>
          );
        }

        if (section.type === 'list-item') {
          const isAction = section.section?.includes('建議');
          const itemNum = isAction ? ++actionIndex : ++findingIndex;

          return (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '10px 14px',
              background: isAction ? proColors.actionBg : proColors.findingBg,
              borderLeft: `3px solid ${isAction ? proColors.actionBorder : proColors.findingBorder}`,
              marginTop: '3px'
            }}>
              <span style={{
                minWidth: '20px',
                height: '20px',
                borderRadius: '4px',
                background: isAction ? proColors.actionBorder : proColors.findingBorder,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                flexShrink: 0
              }}>
                {itemNum}
              </span>
              <span style={{
                fontSize: '13px',
                lineHeight: '1.6',
                color: proColors.text
              }}>
                {section.content}
              </span>
            </div>
          );
        }

        // 一般文字
        return (
          <div key={idx} style={{
            padding: '6px 14px',
            fontSize: '13px',
            lineHeight: '1.5',
            color: proColors.textMuted
          }}>
            {section.content}
          </div>
        );
      })}
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
        Start Interview
      </button>
    </div>
  </div>
);

// History Tab 新設計：支援「按受訪者」和「按問題」兩種視圖
const HistoryTabContent = ({
  personas,
  onContinueInterview,
  onDeletePersona
}: {
  personas: VietnamPersona[];
  onContinueInterview: (persona: VietnamPersona) => void;
  onDeletePersona: (personaId: string, personaName: string) => void;
}) => {
  const [viewMode, setViewMode] = useState<'by-persona' | 'by-question'>('by-question');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  // 正規化問題文字，讓語義相似的問題能被歸為同一組
  const normalizeQuestion = (question: string): string => {
    return question
      .replace(/？/g, '')  // 移除全形問號
      .replace(/\?/g, '')  // 移除半形問號
      .replace(/的時候/g, '時')  // 統一用詞
      .replace(/是幾歲/g, '幾歲')  // 統一用詞
      .replace(/\s+/g, '')  // 移除空白
      .trim();
  };

  // 收集所有問題和對應的回答
  const getQuestionGroups = () => {
    const groups: Map<string, Array<{
      persona: VietnamPersona;
      record: VietnamInterviewRecord;
    }>> = new Map();

    // 用於追蹤正規化後的問題對應到的原始問題（取第一個出現的作為顯示用）
    const normalizedToOriginal: Map<string, string> = new Map();

    personas.forEach(persona => {
      persona.interviewHistory?.forEach(record => {
        const normalized = normalizeQuestion(record.question);

        // 如果這個正規化問題還沒有對應的原始問題，記錄下來
        if (!normalizedToOriginal.has(normalized)) {
          normalizedToOriginal.set(normalized, record.question);
        }

        // 使用原始問題作為 key（保持顯示一致性）
        const displayKey = normalizedToOriginal.get(normalized)!;

        if (!groups.has(displayKey)) {
          groups.set(displayKey, []);
        }
        groups.get(displayKey)!.push({ persona, record });
      });
    });

    return groups;
  };

  const questionGroups = getQuestionGroups();
  const totalResponses = personas.reduce((sum, p) => sum + (p.interviewHistory?.length || 0), 0);

  const toggleQuestion = (question: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(question)) {
        next.delete(question);
      } else {
        next.add(question);
      }
      return next;
    });
  };

  if (personas.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: colors.bgPrimary,
        borderRadius: '16px',
        border: `1px solid ${colors.borderLight}`,
        color: colors.textMuted
      }}>
        <div style={{ fontSize: '16px', marginBottom: '16px', opacity: 0.5, fontWeight: 600 }}>No Records</div>
        <div style={{ fontSize: '15px' }}>尚無訪談記錄。請先生成受訪者並開始訪談。</div>
      </div>
    );
  }

  return (
    <div>
      {/* 頂部控制列 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '16px 20px',
        background: colors.bgPrimary,
        borderRadius: '12px',
        border: `1px solid ${colors.borderLight}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: colors.textSecondary }}>
            {personas.length} personas • {totalResponses} responses • {questionGroups.size} questions
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('by-question')}
            style={{
              padding: '8px 16px',
              background: viewMode === 'by-question' ? colors.primary : 'transparent',
              border: `1px solid ${viewMode === 'by-question' ? colors.primary : colors.border}`,
              borderRadius: '8px',
              fontSize: '13px',
              color: viewMode === 'by-question' ? 'white' : colors.textSecondary,
              cursor: 'pointer'
            }}
          >
            By Question
          </button>
          <button
            onClick={() => setViewMode('by-persona')}
            style={{
              padding: '8px 16px',
              background: viewMode === 'by-persona' ? colors.primary : 'transparent',
              border: `1px solid ${viewMode === 'by-persona' ? colors.primary : colors.border}`,
              borderRadius: '8px',
              fontSize: '13px',
              color: viewMode === 'by-persona' ? 'white' : colors.textSecondary,
              cursor: 'pointer'
            }}
          >
            By Persona
          </button>
        </div>
      </div>

      {/* 按問題分組視圖 */}
      {viewMode === 'by-question' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Array.from(questionGroups.entries()).map(([question, responses]) => {
            const isExpanded = expandedQuestions.has(question);
            const topicTag = responses[0]?.record.topicTag;

            return (
              <div key={question} style={{
                background: colors.bgPrimary,
                borderRadius: '16px',
                overflow: 'hidden',
                border: `1px solid ${colors.borderLight}`,
                boxShadow: `0 4px 16px ${colors.shadow}`
              }}>
                {/* 問題標題 */}
                <div
                  onClick={() => toggleQuestion(question)}
                  style={{
                    padding: '18px 24px',
                    background: colors.bgSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: colors.textPrimary,
                      lineHeight: '1.5'
                    }}>
                      Q: {question.length > 100 ? question.slice(0, 100) + '...' : question}
                    </div>
                    {topicTag && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        padding: '4px 10px',
                        background: `${colors.accent}20`,
                        color: colors.accent,
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {topicTag}
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexShrink: 0
                  }}>
                    <span style={{
                      padding: '6px 12px',
                      background: colors.primary,
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 500
                    }}>
                      {responses.length} 人回答
                    </span>
                    <span style={{
                      fontSize: '18px',
                      color: colors.textMuted,
                      transition: 'transform 0.2s'
                    }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* 回答列表 */}
                {isExpanded && (
                  <div style={{ padding: '16px 24px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                      gap: '16px'
                    }}>
                      {responses.map(({ persona, record }, idx) => (
                        <div key={idx} style={{
                          padding: '16px',
                          background: colors.bgSecondary,
                          borderRadius: '12px',
                          borderLeft: `4px solid ${colors.primary}`
                        }}>
                          {/* 受訪者資訊 */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '12px',
                            paddingBottom: '10px',
                            borderBottom: `1px solid ${colors.borderLight}`
                          }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 600
                            }}>
                              {persona.lastName.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: colors.textPrimary }}>
                                {persona.lastName} {persona.gender === 'Male' ? '先生' : '小姐'}
                              </div>
                              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                                {persona.occupation} • {persona.age} tuổi
                              </div>
                            </div>
                          </div>
                          {/* 回答內容 */}
                          <div style={{
                            fontSize: '14px',
                            color: colors.textPrimary,
                            lineHeight: '1.7',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {record.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 按受訪者分組視圖 */}
      {viewMode === 'by-persona' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {personas.map((persona, idx) => (
            <HistoryCard
              key={idx}
              persona={persona}
              onContinue={() => onContinueInterview(persona)}
              onDelete={() => onDeletePersona(persona.id, `${persona.lastName} ${persona.gender === 'Male' ? '先生' : '小姐'}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HistoryCard = ({ persona, onContinue, onDelete }: { persona: VietnamPersona; onContinue: () => void; onDelete: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const responseCount = persona.interviewHistory?.length || 0;

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
                {responseCount} responses
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
          {/* 刪除按鈕 */}
          <button
            onClick={onDelete}
            title="刪除此受訪者"
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              border: 'none',
              borderRadius: '8px',
              background: 'transparent',
              color: colors.textMuted,
              fontSize: '16px',
              cursor: 'pointer',
              opacity: 0.5,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.color = '#dc3545';
              e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.5';
              e.currentTarget.style.color = colors.textMuted;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Response indicator */}
      <div style={{ height: '4px', background: colors.bgSecondary }}>
        <div style={{
          height: '100%',
          width: responseCount > 0 ? '100%' : '0%',
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
