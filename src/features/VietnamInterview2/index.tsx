import { useState, useEffect, useRef } from 'react';
import {
  Card, Button, Input, Select, Tabs, Space, Typography, Tag, Spin, Empty,
  Progress, Statistic, Row, Col, Collapse, Checkbox, Alert, Badge, Tooltip, Divider, message, Avatar,
} from 'antd';
import {
  TeamOutlined, UserOutlined, RobotOutlined, SendOutlined, SaveOutlined,
  DeleteOutlined, BarChartOutlined, FileTextOutlined, DownloadOutlined,
  CopyOutlined, CheckCircleFilled, CloseCircleFilled,
  QuestionCircleOutlined, HistoryOutlined,
  ExperimentOutlined, PlayCircleOutlined, HomeOutlined, EyeOutlined,
} from '@ant-design/icons';
import {
  VietnamPersona,
  VietnamInterviewRecord
} from './vietnamPersonaSchema';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Morandy color palette
const colors = {
  primary: '#8b9e85',
  primaryDark: '#6b8065',
  primaryLight: '#a8b9a3',
  accent: '#c4a877',
  success: '#6b9d8f',
  warning: '#c4a877',
  danger: '#c17f7f',
  info: '#7a95c4',
};

export const VietnamInterview2 = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [personas, setPersonas] = useState<VietnamPersona[]>([]);
  const [currentPersona, setCurrentPersona] = useState<VietnamPersona | null>(null);
  const [loading, setLoading] = useState(false);

  // AI generation state
  const [targetAudience, setTargetAudience] = useState('');
  const [personaCount, setPersonaCount] = useState(3);
  const [generatedPersonas, setGeneratedPersonas] = useState<VietnamPersona[]>([]);

  // Interview state
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentTopicTag, setCurrentTopicTag] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const currentPersonaIdRef = useRef<string | null>(null);

  // Analysis state
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [selectedTopicTag, setSelectedTopicTag] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classificationData, setClassificationData] = useState<{
    dimensions: Array<{
      dimension_name: string;
      categories: Array<{ name: string; count: number; percentage: number; color: string }>;
      details: Array<{ personaId: string; personaName: string; category: string; reason: string }>;
      recommendedChart: 'pie' | 'bar' | 'horizontal_bar';
    }>;
  } | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);

  // Batch interview state
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

  // Semantic grouping state
  const [semanticMapping, setSemanticMapping] = useState<{
    questionToCanonical: Record<string, string>;
    canonicalQuestions: string[];
  }>({ questionToCanonical: {}, canonicalQuestions: [] });
  const [isLoadingSemanticGroups, setIsLoadingSemanticGroups] = useState(false);

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const res = await fetch('http://localhost:8787/api/vietnam2_personas');
      if (res.ok) {
        const data = await res.json();
        setPersonas(data);
      }
    } catch (e) {
      console.error('Failed to load personas:', e);
    }
  };

  const loadSemanticGroups = async (allQuestions: string[]) => {
    if (allQuestions.length === 0) {
      setSemanticMapping({ questionToCanonical: {}, canonicalQuestions: [] });
      return;
    }

    setIsLoadingSemanticGroups(true);
    try {
      const res = await fetch('http://localhost:8787/api/vietnam2_semantic_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: allQuestions, threshold: 0.72 })
      });

      if (res.ok) {
        const data = await res.json();
        const canonicals = Object.keys(data.groups || {});
        setSemanticMapping({
          questionToCanonical: data.mapping || {},
          canonicalQuestions: canonicals
        });
        console.log(`🔍 [Semantic] Grouped ${allQuestions.length} questions into ${canonicals.length} groups`);
      } else {
        const fallbackMapping: Record<string, string> = {};
        allQuestions.forEach(q => { fallbackMapping[q] = q; });
        setSemanticMapping({
          questionToCanonical: fallbackMapping,
          canonicalQuestions: allQuestions
        });
      }
    } catch (e) {
      const fallbackMapping: Record<string, string> = {};
      allQuestions.forEach(q => { fallbackMapping[q] = q; });
      setSemanticMapping({
        questionToCanonical: fallbackMapping,
        canonicalQuestions: allQuestions
      });
    } finally {
      setIsLoadingSemanticGroups(false);
    }
  };

  useEffect(() => {
    const allQuestions: string[] = [];
    const seen = new Set<string>();
    personas.forEach(p => {
      p.interviewHistory?.forEach(record => {
        if (record.question && !seen.has(record.question)) {
          seen.add(record.question);
          allQuestions.push(record.question);
        }
      });
    });

    if (allQuestions.length > 0) {
      loadSemanticGroups(allQuestions);
    }
  }, [personas]);

  const savePersona = async (persona: VietnamPersona) => {
    try {
      await fetch('http://localhost:8787/api/vietnam2_personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona)
      });
      loadPersonas();
    } catch (e) {
      console.error('Failed to save persona:', e);
    }
  };

  const deletePersona = async (personaId: string, personaName: string) => {
    if (!window.confirm(`確定要刪除「${personaName}」嗎？\n\n此操作無法復原，該受訪者的所有訪談記錄也會一併刪除。`)) {
      return;
    }
    try {
      const res = await fetch(`http://localhost:8787/api/vietnam2_personas/${encodeURIComponent(personaId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (currentPersona?.id === personaId) {
          setCurrentPersona(null);
        }
        setSelectedPersonaIds(prev => prev.filter(id => id !== personaId));
        loadPersonas();
        message.success('已刪除受訪者');
      } else {
        message.error('刪除失敗，請稍後再試');
      }
    } catch (e) {
      console.error('Failed to delete persona:', e);
      message.error('刪除失敗，請稍後再試');
    }
  };

  const normalizeQuestion = (question: string): string => {
    return question
      .replace(/^["「『"]+|["」』"]+$/g, '')
      .replace(/["「『"」』"]/g, '')
      .replace(/？/g, '')
      .replace(/\?/g, '')
      .replace(/的時候/g, '時')
      .replace(/是幾歲/g, '幾歲')
      .replace(/\s+/g, '')
      .trim();
  };

  const deleteQuestion = async (question: string, responseCount: number) => {
    if (!window.confirm(`確定要刪除此問題的 ${responseCount} 筆回答嗎？\n\n問題：「${question.slice(0, 50)}${question.length > 50 ? '...' : ''}」\n\n此操作無法復原。`)) {
      return;
    }

    const normalizedTarget = normalizeQuestion(question);

    try {
      for (const persona of personas) {
        const originalLength = persona.interviewHistory?.length || 0;
        const filteredHistory = persona.interviewHistory?.filter(
          record => normalizeQuestion(record.question) !== normalizedTarget
        ) || [];

        if (filteredHistory.length < originalLength) {
          const updatedPersona = {
            ...persona,
            interviewHistory: filteredHistory,
            updatedAt: new Date().toISOString()
          };
          await savePersona(updatedPersona);
        }
      }

      loadPersonas();
      message.success('已刪除問題的所有回答');
    } catch (e) {
      console.error('Failed to delete question:', e);
      message.error('刪除失敗，請稍後再試');
    }
  };

  const handleGeneratePersonas = async () => {
    if (!targetAudience.trim()) {
      message.warning('Please enter target audience description');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8787/api/generate_vietnam2_personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hint: targetAudience,
          count: personaCount
        })
      });

      if (res.ok) {
        const data = await res.json();
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
        loadPersonas();
        message.success(`成功生成 ${fullPersonas.length} 位受訪者`);
      } else {
        message.error('Generation failed');
      }
    } catch (e) {
      console.error('Generation failed:', e);
      message.error('Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const startInterview = (persona: VietnamPersona) => {
    if (isThinking) {
      const confirmSwitch = window.confirm(
        '⚠️ AI 正在生成回答中，切換受訪者將會丟棄目前的回答。\n\n確定要切換嗎？'
      );
      if (!confirmSwitch) {
        return;
      }
      setIsThinking(false);
      setCurrentAnswer('');
    }

    setCurrentPersona(persona);
    currentPersonaIdRef.current = persona.id;
    setActiveTab('interview');
  };

  const handleGenerateObserverNotes = async () => {
    if (!currentPersona || !currentQuestion.trim()) return;
    if (isThinking) return;

    const requestPersonaId = currentPersona.id;

    setIsThinking(true);

    try {
      const res = await fetch('http://localhost:8787/api/vietnam2_interview', {
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

        if (currentPersonaIdRef.current === requestPersonaId) {
          setCurrentAnswer(data.response);
        } else {
          console.log(`⚠️ AI 回答完成，但已切換受訪者。回答屬於: ${requestPersonaId}, 目前: ${currentPersonaIdRef.current}`);
          message.warning('AI 已完成回答，但你已切換到其他受訪者。');
        }
      }
    } catch (e) {
      console.error('AI generate failed:', e);
      message.error('AI 生成失敗');
    } finally {
      setIsThinking(false);
    }
  };

  const handleSaveFlexibleAnswer = async () => {
    if (!currentPersona || !currentQuestion.trim() || !currentAnswer.trim()) return;

    const newRecord: VietnamInterviewRecord = {
      sectionId: 'flexible',
      questionId: `q_${Date.now()}`,
      question: currentQuestion,
      answer: currentAnswer,
      timestamp: new Date().toISOString(),
      topicTag: currentTopicTag.trim() || undefined
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
    message.success('記錄已儲存');
  };

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

  const getAllQuestions = (): string[] => {
    if (semanticMapping.canonicalQuestions.length > 0) {
      if (selectedTopicTag) {
        const relevantCanonicals = new Set<string>();
        personas.forEach(p => {
          p.interviewHistory.forEach(record => {
            if (record.question && record.topicTag === selectedTopicTag) {
              const canonical = semanticMapping.questionToCanonical[record.question];
              if (canonical) {
                relevantCanonicals.add(canonical);
              }
            }
          });
        });
        return Array.from(relevantCanonicals);
      }
      return semanticMapping.canonicalQuestions;
    }

    const normalizedToOriginal: Map<string, string> = new Map();

    personas.forEach(p => {
      p.interviewHistory.forEach(record => {
        if (record.question) {
          if (!selectedTopicTag || record.topicTag === selectedTopicTag) {
            const normalized = normalizeQuestion(record.question);
            if (!normalizedToOriginal.has(normalized)) {
              normalizedToOriginal.set(normalized, record.question);
            }
          }
        }
      });
    });

    return Array.from(normalizedToOriginal.values());
  };

  const getResponsesForQuestion = (question: string) => {
    const responses: Array<{ persona: VietnamPersona; answer: string; topicTag?: string }> = [];

    if (Object.keys(semanticMapping.questionToCanonical).length > 0) {
      const targetCanonical = semanticMapping.questionToCanonical[question] || question;

      personas.forEach(persona => {
        persona.interviewHistory.forEach(record => {
          const recordCanonical = semanticMapping.questionToCanonical[record.question];
          if (recordCanonical === targetCanonical || record.question === targetCanonical) {
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
    }

    const targetNormalized = normalizeQuestion(question);

    personas.forEach(persona => {
      persona.interviewHistory.forEach(record => {
        if (normalizeQuestion(record.question) === targetNormalized) {
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

  const handleBatchInterview = async () => {
    if (selectedPersonaIds.length === 0 || !batchQuestion.trim()) {
      message.warning('請選擇至少一位受訪者並輸入問題');
      return;
    }

    setIsBatchProcessing(true);
    setBatchResults([]);
    setBatchProgress(0);

    const total = selectedPersonaIds.length;
    const results: typeof batchResults = [];
    const personaMap = new Map(personas.map(p => [p.id, p]));

    for (let i = 0; i < selectedPersonaIds.length; i++) {
      const personaId = selectedPersonaIds[i];
      const persona = personaMap.get(personaId);

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
      setCurrentProcessingPersona(personaName);

      try {
        const res = await fetch('http://localhost:8787/api/vietnam2_interview', {
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

          await fetch('http://localhost:8787/api/vietnam2_personas', {
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
            error: '儲存失敗'
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

      setBatchResults([...results]);
    }

    setBatchProgress(100);
    setCurrentProcessingPersona('');
    loadPersonas();
    setIsBatchProcessing(false);
    message.success(`批量記錄完成：${results.filter(r => r.success).length}/${results.length} 成功`);
  };

  const togglePersonaSelection = (personaId: string) => {
    setSelectedPersonaIds(prev =>
      prev.includes(personaId)
        ? prev.filter(id => id !== personaId)
        : [...prev, personaId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPersonaIds.length === personas.length) {
      setSelectedPersonaIds([]);
    } else {
      setSelectedPersonaIds(personas.map(p => p.id));
    }
  };

  const handleAnalyze = async () => {
    if (!selectedQuestion) return;

    const responses = getResponsesForQuestion(selectedQuestion);
    if (responses.length < 2) {
      message.warning('需要至少 2 位受訪者的回答才能進行分析');
      return;
    }

    setIsAnalyzing(true);
    setIsClassifying(true);
    setAnalysisResult('');
    setClassificationData(null);
    setClassificationError(null);

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

    try {
      const [analysisRes, classifyRes] = await Promise.all([
        fetch('http://localhost:8787/api/vietnam2_analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }),
        fetch('http://localhost:8787/api/vietnam2_classify_multi', {
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

        if (classifyData.error) {
          setClassificationError(classifyData.error);
        } else if (classifyData.dimensions && classifyData.dimensions.length > 0) {
          setClassificationData({
            dimensions: classifyData.dimensions.map((dim: any) => ({
              dimension_name: dim.dimension_name,
              categories: dim.categories || [],
              details: dim.details || [],
              recommendedChart: dim.recommended_chart || 'bar'
            }))
          });
        } else {
          setClassificationError('分類 API 未返回有效維度資料');
        }
      } else {
        setClassificationError(`圖表分類失敗 (${classifyRes.status})`);
      }
    } catch (e) {
      console.error('Analysis failed:', e);
      setAnalysisResult('分析失敗，請稍後再試');
    } finally {
      setIsAnalyzing(false);
      setIsClassifying(false);
    }
  };

  const totalResponses = personas.reduce((sum, p) => sum + (p.interviewHistory?.length || 0), 0);
  const totalQuestions = new Set(personas.flatMap(p => p.interviewHistory?.map(h => h.question) || [])).size;
  const interviewedCount = personas.filter(p => (p.interviewHistory?.length || 0) > 0).length;

  const tabItems = [
    {
      key: 'home',
      label: <span><HomeOutlined /> Home</span>,
      children: (
        <div>
          {/* Hero Section */}
          <Card
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
              border: 'none',
              marginBottom: 24,
            }}
            styles={{ body: { textAlign: 'center', padding: '40px 24px' } }}
          >
            <Title level={1} style={{ fontSize: 28, marginBottom: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0 }}>VN</Title>
            <Title level={2} style={{ margin: '0 0 12px 0', color: 'white' }}>
              Observer Notes
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15 }}>
              第三方觀察者記錄系統 | Third-Party Observation Records
            </Text>
          </Card>

          {/* Stats Overview */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="受訪者 Personas"
                  value={personas.length}
                  valueStyle={{ color: colors.primary }}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="觀察記錄 Records"
                  value={totalResponses}
                  valueStyle={{ color: colors.info }}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="問題數 Questions"
                  value={totalQuestions}
                  valueStyle={{ color: colors.success }}
                  prefix={<QuestionCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已記錄 Recorded"
                  value={interviewedCount}
                  valueStyle={{ color: colors.warning }}
                  prefix={<CheckCircleFilled />}
                />
              </Card>
            </Col>
          </Row>

          {/* Quick Actions */}
          <Card title="Quick Actions / 快速操作" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Card
                  hoverable
                  onClick={() => setActiveTab('generate')}
                  style={{ textAlign: 'left', background: `${colors.primary}08`, borderColor: `${colors.primary}30` }}
                >
                  <Tag color={colors.primary} style={{ marginBottom: 8 }}>AI</Tag>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>AI Generate</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>生成模擬受訪者</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card
                  hoverable
                  onClick={() => personas.length > 0 && setActiveTab('batch')}
                  style={{
                    textAlign: 'left',
                    background: personas.length === 0 ? undefined : `${colors.info}08`,
                    borderColor: personas.length === 0 ? undefined : `${colors.info}30`,
                    opacity: personas.length === 0 ? 0.5 : 1,
                    cursor: personas.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Tag color={colors.info} style={{ marginBottom: 8 }}>OBS</Tag>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>Batch Notes</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>批量生成觀察記錄</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card
                  hoverable
                  onClick={() => setActiveTab('analysis')}
                  style={{ textAlign: 'left', background: `${colors.warning}08`, borderColor: `${colors.warning}30` }}
                >
                  <Tag color={colors.warning} style={{ marginBottom: 8 }}>RPT</Tag>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>Analysis</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>分析記錄並產生報告</Text>
                </Card>
              </Col>
            </Row>
          </Card>

          {/* Workflow Guide */}
          <Card title="Workflow Guide / 使用流程">
            <Row gutter={24}>
              {[
                { step: 1, title: 'Generate', desc: 'AI 生成受訪者 Personas' },
                { step: 2, title: 'Batch Notes', desc: '批量生成觀察記錄' },
                { step: 3, title: 'Analyze', desc: 'AI 分析記錄並產生報告' },
                { step: 4, title: 'Export', desc: '匯出 PDF 研究報告' }
              ].map((item, idx) => (
                <Col span={6} key={idx} style={{ textAlign: 'center' }}>
                  <Avatar
                    size={48}
                    style={{
                      background: colors.primary,
                      color: 'white',
                      marginBottom: 12,
                      fontSize: 16,
                      fontWeight: 700
                    }}
                  >
                    {item.step}
                  </Avatar>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>Step {item.step}: {item.title}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                </Col>
              ))}
            </Row>
          </Card>
        </div>
      ),
    },
    {
      key: 'generate',
      label: <span><ExperimentOutlined /> AI Generate</span>,
      children: (
        <div>
          <Card title="Generate Vietnamese Interviewees / AI 生成越南受訪者" style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Target Audience / 目標客群描述</Text>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., 越南上班族，有出國旅遊經驗 / Vietnamese office workers with travel experience"
                  size="large"
                />
              </div>

              <Space>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Number of Personas / 人數</Text>
                  <Select
                    value={personaCount}
                    onChange={setPersonaCount}
                    style={{ width: 100 }}
                    options={[3, 5, 8, 10].map(n => ({ value: n, label: n }))}
                    size="large"
                  />
                </div>

                <Button
                  type="primary"
                  size="large"
                  loading={loading}
                  onClick={handleGeneratePersonas}
                  icon={<RobotOutlined />}
                  style={{ background: colors.primary, borderColor: colors.primary, marginTop: 24 }}
                >
                  Generate
                </Button>
              </Space>
            </Space>
          </Card>

          {generatedPersonas.length > 0 && (
            <div>
              <Title level={4}>Generated Personas ({generatedPersonas.length})</Title>
              <Row gutter={[16, 16]}>
                {generatedPersonas.map((persona, idx) => (
                  <Col span={8} key={idx}>
                    <Card
                      title={
                        <Space>
                          <UserOutlined />
                          <span>{persona.id}</span>
                        </Space>
                      }
                      extra={<Text type="secondary">{persona.occupation} • {persona.age} tuổi</Text>}
                      actions={[
                        <Button
                          key="interview"
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          onClick={() => startInterview(persona)}
                          style={{ background: colors.primary, borderColor: colors.primary }}
                        >
                          Start Recording
                        </Button>
                      ]}
                    >
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>Insurance Experience</Text>
                        <div>
                          {persona.timesOfOverseasTravelInsurance} time(s)
                          {persona.purchasedBrand.length > 0 && (
                            <Text type="secondary"> • {persona.purchasedBrand.join(', ')}</Text>
                          )}
                        </div>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>Background</Text>
                        <Paragraph ellipsis={{ rows: 3 }} style={{ marginBottom: 0 }}>
                          {persona.personalBackground || 'No background info'}
                        </Paragraph>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'interview',
      label: <span><EyeOutlined /> Record</span>,
      disabled: !currentPersona,
      children: currentPersona && (
        <div>
          {/* Persona Info Header */}
          <Card style={{ marginBottom: 20 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Title level={4} style={{ margin: 0 }}>
                    {currentPersona.lastName} {currentPersona.gender === 'Male' ? '先生' : '小姐'}
                  </Title>
                  <Text type="secondary">{currentPersona.occupation}, {currentPersona.age} tuổi</Text>
                </Space>
              </Col>
              <Col>
                <Text type="secondary">{currentPersona.interviewHistory.length} records</Text>
              </Col>
            </Row>
            <div style={{ marginTop: 12, padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
              <Text strong>Background:</Text> {currentPersona.personalBackground || 'No background info'}
              {currentPersona.purchasedBrand.length > 0 && (
                <span> • <Text strong>Brands:</Text> {currentPersona.purchasedBrand.join(', ')}</span>
              )}
              {currentPersona.timesOfOverseasTravelInsurance > 0 && (
                <span> • <Text strong>Insurance exp:</Text> {currentPersona.timesOfOverseasTravelInsurance} times</span>
              )}
            </div>
          </Card>

          {/* Observer Notes Panel */}
          <Card title={<><EyeOutlined /> Observer Notes / 觀察者記錄</>}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Topic Tag Input */}
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  主題標籤 / Topic Tag <Text type="secondary">(同標籤的問題會被分組分析)</Text>
                </Text>
                <Space wrap>
                  <Input
                    value={currentTopicTag}
                    onChange={(e) => setCurrentTopicTag(e.target.value)}
                    placeholder="例如：購買決策、品牌認知、通路偏好..."
                    disabled={isThinking}
                    style={{ width: 300 }}
                  />
                  {getAllTopicTags().slice(0, 4).map((tag) => (
                    <Tag
                      key={tag}
                      color={currentTopicTag === tag ? colors.primary : undefined}
                      onClick={() => setCurrentTopicTag(tag)}
                      style={{ cursor: 'pointer' }}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>

              {/* Question Input */}
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  觀察主題 / Observation Topic (可包含 URL，AI 會自動抓取網頁內容)
                </Text>
                <TextArea
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  placeholder="輸入觀察主題... 例如：&#10;- 請參考 https://example.com 這個網站，觀察此人的反應&#10;- 此人購買旅遊險時的決策過程&#10;- 此人對不同保障方案的態度"
                  disabled={isThinking}
                  rows={4}
                />
              </div>

              {/* AI Response Area */}
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Observer Notes / 觀察記錄</Text>
                <TextArea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder={isThinking ? 'AI 正在生成觀察記錄...' : '點擊「AI 生成記錄」讓 AI 生成第三方觀察者視角的記錄，或手動輸入...'}
                  disabled={isThinking}
                  rows={6}
                />
              </div>

              {/* Action Buttons */}
              <Row justify="space-between">
                <Col>
                  <Button
                    type="primary"
                    icon={<RobotOutlined />}
                    onClick={handleGenerateObserverNotes}
                    disabled={isThinking || !currentQuestion.trim()}
                    loading={isThinking}
                    style={{ background: colors.info, borderColor: colors.info }}
                  >
                    {isThinking ? 'Generating...' : 'AI Generate Notes'}
                  </Button>
                </Col>
                <Col>
                  <Space>
                    <Button
                      onClick={() => {
                        setCurrentQuestion('');
                        setCurrentAnswer('');
                      }}
                    >
                      Clear All
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveFlexibleAnswer}
                      disabled={!currentQuestion.trim() || !currentAnswer.trim() || isThinking}
                      style={{ background: colors.primary, borderColor: colors.primary }}
                    >
                      Save & Continue
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Space>
          </Card>

          {/* Previous Records */}
          {currentPersona.interviewHistory.length > 0 && (
            <Card title={`Previous Records (${currentPersona.interviewHistory.length})`} style={{ marginTop: 24 }}>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {[...currentPersona.interviewHistory].reverse().map((record, idx) => (
                    <Card key={idx} size="small" style={{ borderLeft: `3px solid ${colors.primary}` }}>
                      <Text strong style={{ color: colors.primary }}>Topic: {record.question}</Text>
                      <Paragraph style={{ marginTop: 8, marginBottom: 4, whiteSpace: 'pre-wrap' }}>
                        {record.answer}
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(record.timestamp).toLocaleString()}
                      </Text>
                    </Card>
                  ))}
                </Space>
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'batch',
      label: <span><TeamOutlined /> Batch Notes</span>,
      disabled: personas.length === 0,
      children: (
        <div>
          <Card title="批量觀察記錄 / Batch Observer Notes" style={{ marginBottom: 24 }}>
            <Paragraph type="secondary">
              選擇多位受訪者，AI 會為每位生成第三方觀察者視角的記錄。記錄會自動儲存到每位受訪者的訪談記錄中。
            </Paragraph>

            {/* Persona Selection */}
            <div style={{ marginBottom: 24 }}>
              <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                <Col>
                  <Text strong>選擇受訪者 ({selectedPersonaIds.length}/{personas.length} 已選)</Text>
                </Col>
                <Col>
                  <Button onClick={toggleSelectAll}>
                    {selectedPersonaIds.length === personas.length ? '取消全選' : '全選'}
                  </Button>
                </Col>
              </Row>

              {personas.length === 0 ? (
                <Empty description="尚無受訪者，請先在「AI Generate」生成受訪者" />
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <Row gutter={[12, 12]}>
                    {personas.map((persona) => {
                      const isSelected = selectedPersonaIds.includes(persona.id);
                      return (
                        <Col span={8} key={persona.id}>
                          <Card
                            size="small"
                            onClick={() => !isBatchProcessing && togglePersonaSelection(persona.id)}
                            style={{
                              cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
                              borderColor: isSelected ? colors.primary : undefined,
                              background: isSelected ? `${colors.primary}08` : undefined,
                              opacity: isBatchProcessing ? 0.6 : 1
                            }}
                          >
                            <Space>
                              <Checkbox checked={isSelected} disabled={isBatchProcessing} />
                              <div>
                                <div style={{ fontWeight: 600 }}>
                                  {persona.lastName} {persona.gender === 'Male' ? '先生' : '小姐'}
                                </div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {persona.occupation} • {persona.age} tuổi
                                </Text>
                              </div>
                            </Space>
                            <Tooltip title="刪除此受訪者">
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const personaName = `${persona.lastName} ${persona.gender === 'Male' ? '先生' : '小姐'}`;
                                  deletePersona(persona.id, personaName);
                                }}
                                disabled={isBatchProcessing}
                                style={{ position: 'absolute', top: 8, right: 8 }}
                              />
                            </Tooltip>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              )}
            </div>

            {/* Topic Tag */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>主題標籤 / Topic Tag</Text>
              <Space wrap>
                <Input
                  value={batchTopicTag}
                  onChange={(e) => setBatchTopicTag(e.target.value)}
                  placeholder="例如：購買決策、品牌認知..."
                  disabled={isBatchProcessing}
                  style={{ width: 300 }}
                />
                {getAllTopicTags().slice(0, 3).map((tag) => (
                  <Tag
                    key={tag}
                    color={batchTopicTag === tag ? colors.primary : undefined}
                    onClick={() => !isBatchProcessing && setBatchTopicTag(tag)}
                    style={{ cursor: isBatchProcessing ? 'not-allowed' : 'pointer' }}
                  >
                    {tag}
                  </Tag>
                ))}
              </Space>
            </div>

            {/* Question Input */}
            <div style={{ marginBottom: 20 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>觀察主題 / Observation Topic</Text>
              <TextArea
                value={batchQuestion}
                onChange={(e) => setBatchQuestion(e.target.value)}
                placeholder="輸入要觀察的主題，AI 會為每位受訪者生成第三方觀察者視角的記錄..."
                disabled={isBatchProcessing}
                rows={4}
              />
            </div>

            {/* Execute Button */}
            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              onClick={handleBatchInterview}
              disabled={isBatchProcessing || selectedPersonaIds.length === 0 || !batchQuestion.trim()}
              loading={isBatchProcessing}
              style={{ background: colors.accent, borderColor: colors.accent }}
            >
              {isBatchProcessing ? (
                <>Processing {batchProgress}% - {currentProcessingPersona || 'Preparing...'}</>
              ) : (
                <>Start Batch Notes ({selectedPersonaIds.length} personas)</>
              )}
            </Button>

            {isBatchProcessing && (
              <Progress percent={batchProgress} status="active" style={{ marginTop: 16 }} />
            )}
          </Card>

          {/* Batch Results */}
          {batchResults.length > 0 && (
            <Card
              title={`Batch Results (${batchResults.filter(r => r.success).length}/${batchResults.length} success)`}
              extra={
                <Button
                  onClick={() => {
                    setBatchResults([]);
                    setBatchQuestion('');
                    setSelectedPersonaIds([]);
                  }}
                >
                  清除結果
                </Button>
              }
            >
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {batchResults.map((result, idx) => (
                    <Card
                      key={idx}
                      size="small"
                      style={{
                        borderLeft: `4px solid ${result.success ? colors.primary : colors.danger}`,
                        background: result.success ? undefined : `${colors.danger}08`
                      }}
                    >
                      <Row justify="space-between" align="middle" style={{ marginBottom: result.success ? 8 : 0 }}>
                        <Col>
                          <Space>
                            {result.success ? (
                              <CheckCircleFilled style={{ color: colors.success }} />
                            ) : (
                              <CloseCircleFilled style={{ color: colors.danger }} />
                            )}
                            <Text strong>{result.personaName}</Text>
                          </Space>
                        </Col>
                        {!result.success && (
                          <Col>
                            <Text type="danger" style={{ fontSize: 12 }}>{result.error}</Text>
                          </Col>
                        )}
                      </Row>
                      {result.success && result.response && (
                        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                          {result.response}
                        </Paragraph>
                      )}
                    </Card>
                  ))}
                </Space>
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: <span><HistoryOutlined /> History</span>,
      children: (
        <HistoryTabContent
          personas={personas}
          onContinueInterview={startInterview}
          onDeletePersona={deletePersona}
          onDeleteQuestion={deleteQuestion}
        />
      ),
    },
    {
      key: 'analysis',
      label: <span><BarChartOutlined /> Analysis</span>,
      children: (
        <div>
          <Card title="Summary Report / 總結報告" style={{ marginBottom: 24 }}>
            {getAllQuestions().length === 0 && getAllTopicTags().length === 0 ? (
              <Empty description="尚無觀察紀錄可分析。請先完成一些觀察記錄。" />
            ) : (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Topic Tag Filter */}
                {getAllTopicTags().length > 0 && (
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 10 }}>按主題篩選 / Filter by Topic Tag</Text>
                    <Space wrap>
                      <Tag
                        color={!selectedTopicTag ? colors.primary : undefined}
                        onClick={() => {
                          setSelectedTopicTag('');
                          setSelectedQuestion('');
                          setAnalysisResult('');
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        全部
                      </Tag>
                      {getAllTopicTags().map((tag) => {
                        const tagCount = getResponsesForTopicTag(tag).length;
                        return (
                          <Tag
                            key={tag}
                            color={selectedTopicTag === tag ? colors.primary : undefined}
                            onClick={() => {
                              setSelectedTopicTag(tag);
                              setSelectedQuestion('');
                              setAnalysisResult('');
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {tag} ({tagCount})
                          </Tag>
                        );
                      })}
                    </Space>
                  </div>
                )}

                {/* Question Selector */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 10 }}>
                    選擇要分析的主題 / Select Topic to Analyze
                    {selectedTopicTag && <Text type="secondary"> (已篩選: {selectedTopicTag})</Text>}
                    {isLoadingSemanticGroups && <Text type="secondary" style={{ marginLeft: 8 }}>🔍 語義分析中...</Text>}
                  </Text>
                  <Select
                    value={selectedQuestion}
                    onChange={(value) => {
                      setSelectedQuestion(value);
                      setAnalysisResult('');
                    }}
                    disabled={isLoadingSemanticGroups}
                    placeholder={isLoadingSemanticGroups ? '-- 載入語義分組中... --' : '-- 選擇主題 --'}
                    style={{ width: '100%' }}
                    size="large"
                  >
                    {getAllQuestions().map((q, idx) => {
                      const responseCount = getResponsesForQuestion(q).length;
                      return (
                        <Select.Option key={idx} value={q}>
                          {q.length > 60 ? q.substring(0, 60) + '...' : q} ({responseCount} records)
                        </Select.Option>
                      );
                    })}
                  </Select>
                </div>

                {/* Response Preview */}
                {selectedQuestion && (
                  <div>
                    <Text strong>Records Preview ({getResponsesForQuestion(selectedQuestion).length} records)</Text>
                    <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 12 }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {getResponsesForQuestion(selectedQuestion).map((resp, idx) => (
                          <Card key={idx} size="small" style={{ borderLeft: `3px solid ${colors.primary}` }}>
                            <Text strong style={{ color: colors.primary }}>
                              {resp.persona.lastName} {resp.persona.gender === 'Male' ? '先生' : '小姐'}
                              <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8 }}>
                                {resp.persona.age} tuổi • {resp.persona.occupation}
                              </Text>
                            </Text>
                            <Paragraph ellipsis={{ rows: 3 }} style={{ marginTop: 8, marginBottom: 0 }}>
                              {resp.answer}
                            </Paragraph>
                          </Card>
                        ))}
                      </Space>
                    </div>
                  </div>
                )}

                {/* Analyze Button */}
                <Button
                  type="primary"
                  size="large"
                  icon={<BarChartOutlined />}
                  onClick={handleAnalyze}
                  disabled={!selectedQuestion || isAnalyzing || getResponsesForQuestion(selectedQuestion).length < 2}
                  loading={isAnalyzing}
                  style={{ background: colors.info, borderColor: colors.info }}
                >
                  {isAnalyzing ? 'Generating...' : 'AI Generate Summary'}
                </Button>

                {selectedQuestion && getResponsesForQuestion(selectedQuestion).length < 2 && (
                  <Alert message="需要至少 2 筆觀察記錄才能進行分析" type="warning" showIcon />
                )}
              </Space>
            )}
          </Card>

          {/* Analysis Result */}
          {analysisResult && (
            <Card
              title="Summary Report / 總結報告"
              extra={
                <Space>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(analysisResult);
                      message.success('已複製到剪貼簿！');
                    }}
                  >
                    Copy
                  </Button>
                  <Button
                    type="primary"
                    danger
                    icon={<DownloadOutlined />}
                    onClick={async () => {
                      const responses = getResponsesForQuestion(selectedQuestion);
                      const timestamp = new Date().toISOString().split('T')[0];
                      const formattedDate = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

                      const pdfContent = document.createElement('div');
                      pdfContent.innerHTML = createPDFContent(selectedQuestion, responses, analysisResult, classificationData, timestamp, formattedDate);

                      const html2pdf = (await import('html2pdf.js')).default;
                      const opt = {
                        margin: 10,
                        filename: `觀察者記錄分析報告_${timestamp}.pdf`,
                        image: { type: 'jpeg' as const, quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
                      };

                      html2pdf().set(opt).from(pdfContent).save();
                      message.success('PDF 匯出中...');
                    }}
                  >
                    匯出 PDF
                  </Button>
                </Space>
              }
            >
              {/* Multi-dimensional charts */}
              {classificationData && classificationData.dimensions.length > 0 && (
                <div id="charts-container" style={{ marginBottom: 24 }}>
                  {classificationData.dimensions.map((dimension, dimIdx) => (
                    <Card
                      key={dimIdx}
                      size="small"
                      title={
                        <Space>
                          {dimension.dimension_name}
                          <Tag>
                            {dimension.recommendedChart === 'pie' ? '圓餅圖' :
                             dimension.recommendedChart === 'bar' ? '長條圖' : '橫條圖'}
                          </Tag>
                        </Space>
                      }
                      style={{ marginBottom: 16 }}
                    >
                      {/* Pie Chart */}
                      {dimension.recommendedChart === 'pie' && (
                        <Row gutter={24} align="middle">
                          <Col span={10}>
                            <div style={{ width: '100%', height: 200 }}>
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
                                    {dimension.categories.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip formatter={(value) => [`${value} 筆`]} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </Col>
                          <Col span={14}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                              {dimension.categories.map((cat, idx) => (
                                <Row key={idx} align="middle" style={{ background: idx % 2 === 0 ? '#f8f8f8' : 'white', padding: '8px 12px', borderRadius: 4 }}>
                                  <Col flex="none">
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: cat.color, marginRight: 10 }} />
                                  </Col>
                                  <Col flex="auto">{cat.name}</Col>
                                  <Col flex="none">
                                    <Text strong>{cat.count} 筆</Text>
                                    <Text type="secondary" style={{ marginLeft: 8 }}>({cat.percentage}%)</Text>
                                  </Col>
                                </Row>
                              ))}
                            </Space>
                          </Col>
                        </Row>
                      )}

                      {/* Bar Chart */}
                      {dimension.recommendedChart === 'bar' && (
                        <div style={{ width: '100%', height: 280 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dimension.categories} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
                              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                              <RechartsTooltip formatter={(value) => [`${value} 筆`]} />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {dimension.categories.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Horizontal Bar Chart */}
                      {dimension.recommendedChart === 'horizontal_bar' && (
                        <div style={{ width: '100%', height: Math.max(200, dimension.categories.length * 50) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dimension.categories} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                              <RechartsTooltip formatter={(value) => [`${value} 筆`]} />
                              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {dimension.categories.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Classification Details */}
                      {dimension.details.length > 0 && (
                        <Collapse ghost style={{ marginTop: 16 }}>
                          <Panel header={`各受訪者分類結果 (${dimension.details.length} 筆)`} key="1">
                            <Space wrap>
                              {dimension.details.map((detail, idx) => (
                                <Tag
                                  key={idx}
                                  color={dimension.categories.find(c => c.name === detail.category)?.color}
                                >
                                  {detail.personaName}
                                </Tag>
                              ))}
                            </Space>
                          </Panel>
                        </Collapse>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Loading state */}
              {isClassifying && !classificationData && (
                <Card style={{ textAlign: 'center', marginBottom: 20 }}>
                  <Spin tip="Classifying records and generating charts..." />
                </Card>
              )}

              {/* Classification error */}
              {classificationError && !classificationData && !isClassifying && (
                <Alert
                  message="圖表生成失敗"
                  description={`${classificationError}（文字摘要仍可正常使用）`}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 20 }}
                />
              )}

              {/* Analysis Result Display */}
              <AnalysisResultDisplay content={analysisResult} />
            </Card>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="card"
        size="large"
      />
    </div>
  );
};

// Helper function to create PDF content
const createPDFContent = (
  selectedQuestion: string,
  responses: Array<{ persona: VietnamPersona; answer: string }>,
  analysisResult: string,
  classificationData: any,
  timestamp: string,
  formattedDate: string
) => {
  return `
<div style="font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; padding: 20px; color: #1f2937;">
  <h1 style="color: #1e3a5f; font-size: 20pt; text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 8px;">
    第三方觀察者記錄分析報告
  </h1>
  <p style="text-align: center; color: #64748b; font-size: 11pt; margin-bottom: 25px;">
    Third-Party Observer Notes Analysis Report
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
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; background: #1e3a5f; color: white; font-size: 11px;">觀察主題</td>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-size: 12px;">${selectedQuestion}</td>
    </tr>
    <tr>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; background: #1e3a5f; color: white; font-size: 11px;">記錄數量</td>
      <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-size: 12px;">${responses.length} 筆觀察記錄</td>
    </tr>
  </table>

  <h2 style="color: #1e3a5f; font-size: 13pt; margin-top: 30px; border-left: 4px solid #1e3a5f; padding-left: 12px;">
    二、分析摘要 | Executive Summary
  </h2>
  <div style="margin: 15px 0; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 12px; line-height: 1.8;">
    ${analysisResult.replace(/\n/g, '<br>')}
  </div>

  <h2 style="color: #1e3a5f; font-size: 13pt; margin-top: 30px; border-left: 4px solid #1e3a5f; padding-left: 12px;">
    三、觀察紀錄詳情 | Observation Details
  </h2>
  ${responses.map((r, i) => `
  <div style="border: 1px solid #e2e8f0; border-radius: 6px; margin: 15px 0; overflow: hidden; page-break-inside: avoid;">
    <div style="background: #1e3a5f; padding: 12px 16px; font-weight: 600; color: white; font-size: 13px;">
      受訪者 ${i + 1}：${r.persona.lastName} ${r.persona.gender === 'Male' ? '先生' : '小姐'}
    </div>
    <div style="padding: 10px 16px; background: #f1f5f9; font-size: 11px; color: #64748b; border-bottom: 1px solid #e2e8f0;">
      年齡：${r.persona.age} 歲 | 職業：${r.persona.occupation}
    </div>
    <div style="padding: 16px; background: #ffffff; border-left: 3px solid #3b82f6; line-height: 1.8; font-size: 12px; color: #374151;">
      ${r.answer}
    </div>
  </div>
  `).join('')}

  <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
    <p style="margin: 0;">Report Generated by Observer Notes AI System</p>
    <p style="margin: 4px 0 0 0;">${timestamp}</p>
  </div>
</div>`;
};

// Analysis Result Display Component
const AnalysisResultDisplay = ({ content }: { content: string }) => {
  const sections = content.split('\n').reduce((acc: Array<{type: string; content: string; section?: string}>, line) => {
    const trimmed = line.trim();
    if (!trimmed) return acc;

    const lastSection = acc.findLast(s => s.type === 'section-title');
    const currentSection = lastSection?.content || '';

    if (trimmed.startsWith('📌') || trimmed.includes('一句話總結')) {
      acc.push({ type: 'headline', content: trimmed.replace(/^📌\s*/, '').replace('一句話總結', '').trim() || '核心發現' });
    } else if (trimmed.startsWith('🔑') || trimmed.includes('關鍵發現')) {
      acc.push({ type: 'section-title', content: '關鍵發現' });
    } else if (trimmed.startsWith('💡') || trimmed.includes('行動建議')) {
      acc.push({ type: 'section-title', content: '行動建議' });
    } else if (/^\d+[\.、]/.test(trimmed)) {
      acc.push({ type: 'list-item', content: trimmed.replace(/^\d+[\.、]\s*/, ''), section: currentSection });
    } else if (acc.length > 0 && acc[acc.length - 1].type === 'headline') {
      acc.push({ type: 'summary', content: trimmed });
    } else {
      acc.push({ type: 'text', content: trimmed, section: currentSection });
    }
    return acc;
  }, []);

  let findingIndex = 0;
  let actionIndex = 0;

  return (
    <div>
      {sections.map((section, idx) => {
        if (section.type === 'headline') {
          return (
            <div
              key={idx}
              style={{
                background: colors.primaryDark,
                color: 'white',
                padding: '14px 18px',
                borderRadius: '6px 6px 0 0',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              SUMMARY
            </div>
          );
        }

        if (section.type === 'summary') {
          return (
            <div
              key={idx}
              style={{
                background: '#f1f5f9',
                padding: '14px 18px',
                fontSize: 13,
                lineHeight: 1.7,
                borderLeft: `3px solid ${colors.primaryDark}`,
              }}
            >
              {section.content}
            </div>
          );
        }

        if (section.type === 'section-title') {
          const isAction = section.content.includes('建議');
          if (isAction) actionIndex = 0;
          else findingIndex = 0;

          return (
            <Divider key={idx} orientation="left" style={{ color: isAction ? colors.danger : colors.primary, borderColor: isAction ? colors.danger : colors.primary }}>
              {isAction ? 'RECOMMENDATIONS' : 'KEY FINDINGS'}
            </Divider>
          );
        }

        if (section.type === 'list-item') {
          const isAction = section.section?.includes('建議');
          const itemNum = isAction ? ++actionIndex : ++findingIndex;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '10px 14px',
                background: isAction ? `${colors.danger}08` : `${colors.primary}08`,
                borderLeft: `3px solid ${isAction ? colors.danger : colors.primary}`,
                marginTop: 3,
              }}
            >
              <Badge count={itemNum} style={{ backgroundColor: isAction ? colors.danger : colors.primary }} />
              <Text>{section.content}</Text>
            </div>
          );
        }

        return (
          <Paragraph key={idx} type="secondary" style={{ padding: '6px 14px', marginBottom: 0 }}>
            {section.content}
          </Paragraph>
        );
      })}
    </div>
  );
};

// History Tab Content Component
const HistoryTabContent = ({
  personas,
  onContinueInterview,
  onDeletePersona,
  onDeleteQuestion
}: {
  personas: VietnamPersona[];
  onContinueInterview: (persona: VietnamPersona) => void;
  onDeletePersona: (personaId: string, personaName: string) => void;
  onDeleteQuestion: (question: string, responseCount: number) => void;
}) => {
  const [viewMode, setViewMode] = useState<'by-persona' | 'by-question'>('by-question');
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);

  const normalizeQuestion = (question: string): string => {
    return question
      .replace(/^["「『"]+|["」』"]+$/g, '')
      .replace(/["「『"」』"]/g, '')
      .replace(/？/g, '')
      .replace(/\?/g, '')
      .replace(/的時候/g, '時')
      .replace(/是幾歲/g, '幾歲')
      .replace(/\s+/g, '')
      .trim();
  };

  const getQuestionGroups = () => {
    const groups: Map<string, Array<{ persona: VietnamPersona; record: VietnamInterviewRecord }>> = new Map();
    const normalizedToOriginal: Map<string, string> = new Map();

    personas.forEach(persona => {
      persona.interviewHistory?.forEach(record => {
        const normalized = normalizeQuestion(record.question);
        if (!normalizedToOriginal.has(normalized)) {
          normalizedToOriginal.set(normalized, record.question);
        }
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

  if (personas.length === 0) {
    return <Empty description="尚無觀察記錄。請先生成受訪者並開始記錄。" />;
  }

  return (
    <div>
      {/* Control Bar */}
      <Card size="small" style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Text type="secondary">
              {personas.length} personas • {totalResponses} records • {questionGroups.size} topics
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                type={viewMode === 'by-question' ? 'primary' : 'default'}
                onClick={() => setViewMode('by-question')}
                style={viewMode === 'by-question' ? { background: colors.primary, borderColor: colors.primary } : {}}
              >
                By Topic
              </Button>
              <Button
                type={viewMode === 'by-persona' ? 'primary' : 'default'}
                onClick={() => setViewMode('by-persona')}
                style={viewMode === 'by-persona' ? { background: colors.primary, borderColor: colors.primary } : {}}
              >
                By Persona
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* By Question View */}
      {viewMode === 'by-question' && (
        <Collapse
          activeKey={expandedQuestions}
          onChange={(keys) => setExpandedQuestions(keys as string[])}
          style={{ background: 'transparent' }}
        >
          {Array.from(questionGroups.entries()).map(([question, responses]) => {
            const topicTag = responses[0]?.record.topicTag;
            return (
              <Panel
                key={question}
                header={
                  <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                    <Col flex="auto">
                      <Space direction="vertical" size={4}>
                        <Text strong>Topic: {question.length > 80 ? question.slice(0, 80) + '...' : question}</Text>
                        {topicTag && <Tag color={colors.accent}>{topicTag}</Tag>}
                      </Space>
                    </Col>
                    <Col flex="none">
                      <Space>
                        <Badge count={`${responses.length} records`} style={{ backgroundColor: colors.primary }} />
                        <Tooltip title="刪除此主題的所有記錄">
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteQuestion(question, responses.length);
                            }}
                          />
                        </Tooltip>
                      </Space>
                    </Col>
                  </Row>
                }
              >
                <Row gutter={[16, 16]}>
                  {responses.map(({ persona, record }, idx) => (
                    <Col span={12} key={idx}>
                      <Card size="small" style={{ borderLeft: `4px solid ${colors.primary}` }}>
                        <Space style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          >
                            {persona.lastName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {persona.lastName} {persona.gender === 'Male' ? '先生' : '小姐'}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {persona.occupation} • {persona.age} tuổi
                            </Text>
                          </div>
                        </Space>
                        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                          {record.answer}
                        </Paragraph>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Panel>
            );
          })}
        </Collapse>
      )}

      {/* By Persona View */}
      {viewMode === 'by-persona' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          {personas.map((persona, idx) => (
            <Card
              key={idx}
              title={
                <Space>
                  <UserOutlined />
                  <span>{persona.lastName} {persona.gender === 'Male' ? '先生' : '小姐'}</span>
                  <Text type="secondary" style={{ fontWeight: 400 }}>
                    {persona.occupation} • {persona.age} tuổi
                  </Text>
                </Space>
              }
              extra={
                <Space>
                  <Text type="secondary">{persona.interviewHistory?.length || 0} records</Text>
                  {!persona.isCompleted && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => onContinueInterview(persona)}
                      style={{ background: colors.primary, borderColor: colors.primary }}
                    >
                      Continue
                    </Button>
                  )}
                  {persona.isCompleted && <Tag color={colors.success}>Completed</Tag>}
                  <Tooltip title="刪除此受訪者">
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => onDeletePersona(persona.id, `${persona.lastName} ${persona.gender === 'Male' ? '先生' : '小姐'}`)}
                    />
                  </Tooltip>
                </Space>
              }
            >
              {persona.personalBackground && (
                <Alert
                  message={persona.personalBackground}
                  type="info"
                  style={{ marginBottom: 16, borderLeft: `3px solid ${colors.primary}` }}
                />
              )}
              <Collapse ghost>
                <Panel header={`Show ${persona.interviewHistory?.length || 0} Records`} key="1">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {persona.interviewHistory?.map((record, idx) => (
                      <Card key={idx} size="small" style={{ borderLeft: `3px solid ${colors.primary}` }}>
                        <Text strong style={{ color: colors.primary }}>Topic: {record.question}</Text>
                        <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>{record.answer}</Paragraph>
                      </Card>
                    ))}
                  </Space>
                </Panel>
              </Collapse>
            </Card>
          ))}
        </Space>
      )}
    </div>
  );
};
