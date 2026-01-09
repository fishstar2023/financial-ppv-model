import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Tabs,
  Space,
  Typography,
  Tag,
  Spin,
  Empty,
  Collapse,
  Progress,
  Statistic,
  Popconfirm,
  message,
  Tooltip,
  Divider,
} from 'antd';
import {
  UserAddOutlined,
  DeleteOutlined,
  SendOutlined,
  BarChartOutlined,
  HistoryOutlined,
  TeamOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { PPVInstance } from '../../types/ppv';

const { TextArea } = Input;
const { Text, Title } = Typography;

export const MarketSimulator = () => {
  const [activeTab, setActiveTab] = useState<string>('current');
  const [loading, setLoading] = useState(false);
  const [currentPersonas, setCurrentPersonas] = useState<PPVInstance[]>([]);
  const [historyPersonas, setHistoryPersonas] = useState<PPVInstance[]>([]);
  const [contextInfo, setContextInfo] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");
  const [personaCount, setPersonaCount] = useState(5);

  const fetchHistory = async (autoLoadToCurrent = false) => {
    try {
      const res = await fetch('http://localhost:8787/api/personas');
      const data = await res.json();
      if (Array.isArray(data)) {
        const reversed = data.reverse();
        setHistoryPersonas(reversed);
        if (autoLoadToCurrent && reversed.length > 0) {
          setCurrentPersonas(reversed);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchHistory(true); }, []);

  const handleGenerate = async () => {
    if (!targetAudience) return message.warning("Please specify target audience");
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8787/api/generate_personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint: targetAudience, count: personaCount })
      });
      const data = await res.json();
      setCurrentPersonas(data);
      fetchHistory();
      message.success(`Generated ${data.length} personas`);
    } catch (e) {
      message.error("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastAsk = async () => {
    if (currentPersonas.length === 0) return message.warning("Please generate personas first");
    if (!currentQuestion.trim()) return message.warning("Please enter a question");

    setIsInterviewing(true);
    const updatedPersonas = [...currentPersonas];

    try {
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

      await Promise.all(updatedPersonas.map(async (persona) => {
        await fetch('http://localhost:8787/api/update_persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(persona)
        });
      }));

      setCurrentPersonas(updatedPersonas);
      await fetchHistory();
      setCurrentQuestion("");
      message.success("Interview completed");

    } catch (e) {
      console.error(e);
      message.error("Interview failed");
    } finally {
      setIsInterviewing(false);
    }
  };

  const handleClearHistory = async () => {
    await fetch('http://localhost:8787/api/personas', { method: 'DELETE' });
    setHistoryPersonas([]);
    setCurrentPersonas([]);
    message.success("All data cleared");
  };

  const handleDeletePersona = async (personaId: string) => {
    try {
      await fetch(`http://localhost:8787/api/personas/${encodeURIComponent(personaId)}`, {
        method: 'DELETE'
      });
      setHistoryPersonas(prev => prev.filter(p => p.id !== personaId));
      setCurrentPersonas(prev => prev.filter(p => p.id !== personaId));
      message.success("Persona deleted");
    } catch (e) {
      console.error(e);
      message.error("Delete failed");
    }
  };

  const handleUpdatePersona = (updatedPersona: PPVInstance) => {
    setCurrentPersonas(prev => prev.map(p => p.id === updatedPersona.id ? updatedPersona : p));
    setHistoryPersonas(prev => prev.map(p => p.id === updatedPersona.id ? updatedPersona : p));
  };

  const tabItems = [
    {
      key: 'current',
      label: (
        <Space>
          <TeamOutlined />
          Current Interviews
        </Space>
      ),
      children: (
        <div style={{ paddingBottom: currentPersonas.length > 0 ? 200 : 0 }}>
          {/* Generation Panel */}
          <Card style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Text strong>Target Audience</Text>
              <Row gutter={12}>
                <Col flex="auto">
                  <Input
                    size="large"
                    placeholder="e.g., 25-35 year old tech professionals in Taipei"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />
                </Col>
                <Col>
                  <Space>
                    <Text type="secondary">Count:</Text>
                    <Select
                      value={personaCount}
                      onChange={setPersonaCount}
                      style={{ width: 80 }}
                      options={[3, 5, 8, 10].map(n => ({ value: n, label: n }))}
                    />
                  </Space>
                </Col>
                <Col>
                  <Button
                    type="primary"
                    size="large"
                    icon={<UserAddOutlined />}
                    onClick={handleGenerate}
                    loading={loading}
                    disabled={isInterviewing}
                  >
                    Generate
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>

          {/* Persona Cards */}
          {currentPersonas.length > 0 ? (
            <Row gutter={[16, 16]}>
              {currentPersonas.map((p, i) => (
                <Col xs={24} md={12} xl={8} key={i}>
                  <PersonaCard
                    p={p}
                    defaultExpanded={true}
                    onDelete={handleDeletePersona}
                    onUpdate={handleUpdatePersona}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            !loading && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No personas generated yet. Specify a target audience and click Generate."
              />
            )
          )}

          {/* Fixed Bottom Panel */}
          {currentPersonas.length > 0 && (
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#fff',
              borderTop: '1px solid #f0f0f0',
              boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
              padding: '20px 32px',
              zIndex: 100
            }}>
              <Row gutter={20} style={{ maxWidth: 1400, margin: '0 auto' }}>
                <Col span={8}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Product Context</Text>
                  <TextArea
                    rows={3}
                    placeholder="Product description, news, or background information..."
                    value={contextInfo}
                    onChange={(e) => setContextInfo(e.target.value)}
                  />
                </Col>
                <Col span={16}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Interview Question</Text>
                  <Row gutter={12}>
                    <Col flex="auto">
                      <TextArea
                        rows={3}
                        placeholder="What would you like to ask all personas?"
                        value={currentQuestion}
                        onChange={(e) => setCurrentQuestion(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleBroadcastAsk(); } }}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleBroadcastAsk}
                        loading={isInterviewing}
                        style={{ height: '100%', minHeight: 78 }}
                      >
                        Send
                      </Button>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <Space>
          <HistoryOutlined />
          Archive
        </Space>
      ),
      children: (
        <div>
          <Row justify="end" style={{ marginBottom: 16 }}>
            <Popconfirm
              title="Clear all data?"
              onConfirm={handleClearHistory}
              okText="Yes"
              cancelText="No"
            >
              <Button danger icon={<DeleteOutlined />}>
                Clear All Data
              </Button>
            </Popconfirm>
          </Row>
          <Row gutter={[16, 16]}>
            {historyPersonas.map((p, i) => (
              <Col xs={24} md={12} xl={8} key={i}>
                <PersonaCard
                  p={p}
                  isHistory
                  onDelete={handleDeletePersona}
                  onUpdate={handleUpdatePersona}
                />
              </Col>
            ))}
          </Row>
        </div>
      ),
    },
    {
      key: 'analytics',
      label: (
        <Space>
          <BarChartOutlined />
          Analytics
        </Space>
      ),
      children: (
        <AnalyticsDashboard personas={currentPersonas.length > 0 ? currentPersonas : historyPersonas} />
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

const PersonaCard = ({ p, isHistory = false, defaultExpanded = false, onDelete, onUpdate }: any) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedInterviewerNotes, setEditedInterviewerNotes] = useState(p.interviewer_notes || "");
  const records = [...(p.interview_history || [])].reverse();

  const handleSaveInterviewerNotes = async () => {
    const updatedPersona = { ...p, interviewer_notes: editedInterviewerNotes };
    try {
      await fetch('http://localhost:8787/api/update_persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPersona)
      });
      if (onUpdate) onUpdate(updatedPersona);
      setIsEditingNotes(false);
      message.success("Notes saved");
    } catch (e) {
      console.error('Failed to save interviewer notes:', e);
      message.error("Failed to save notes");
    }
  };

  return (
    <Card
      title={
        <Space>
          <Text strong>{p.id}</Text>
          {isHistory && <Tag color="blue">Archived</Tag>}
        </Space>
      }
      extra={
        <Popconfirm
          title="Delete this persona?"
          onConfirm={() => onDelete(p.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      }
      size="small"
    >
      {/* Demographic Profile */}
      <div style={{
        background: '#fafafa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 13,
        color: '#666',
        whiteSpace: 'pre-line'
      }}>
        {p.notes || "No demographic information"}
      </div>

      {/* Interview Records */}
      {records.length > 0 ? (
        <>
          {/* Latest Answer */}
          <Card
            size="small"
            style={{ marginBottom: 12 }}
            styles={{ body: { padding: 12 } }}
          >
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Q: {records[0].question}
            </Text>
            <Text>{records[0].answer}</Text>
          </Card>

          {/* History */}
          {records.length > 1 && (
            <Collapse
              ghost
              items={[{
                key: '1',
                label: `Show ${records.length - 1} previous response${records.length > 2 ? 's' : ''}`,
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {records.slice(1).map((r: any, idx: number) => (
                      <Card key={idx} size="small" styles={{ body: { padding: 10 } }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                          Q: {r.question}
                        </Text>
                        <Text style={{ fontSize: 13 }}>{r.answer}</Text>
                      </Card>
                    ))}
                  </Space>
                ),
              }]}
            />
          )}

          {/* Interviewer Notes */}
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>Interviewer Notes</Text>
          {isEditingNotes ? (
            <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
              <TextArea
                value={editedInterviewerNotes}
                onChange={(e) => setEditedInterviewerNotes(e.target.value)}
                placeholder="Add your observations..."
                autoFocus
                rows={3}
              />
              <Space>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => { setEditedInterviewerNotes(p.interviewer_notes || ""); setIsEditingNotes(false); }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveInterviewerNotes}
                >
                  Save
                </Button>
              </Space>
            </Space>
          ) : (
            <div
              onClick={() => setIsEditingNotes(true)}
              style={{
                marginTop: 8,
                padding: 10,
                border: '1px dashed #d9d9d9',
                borderRadius: 6,
                cursor: 'pointer',
                color: p.interviewer_notes ? '#333' : '#999',
                fontStyle: p.interviewer_notes ? 'normal' : 'italic',
              }}
            >
              {p.interviewer_notes || "Click to add notes..."} <EditOutlined style={{ marginLeft: 8, opacity: 0.5 }} />
            </div>
          )}
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No interview responses yet"
        />
      )}
    </Card>
  );
};

// Analytics Dashboard Component
const AnalyticsDashboard = ({ personas }: { personas: PPVInstance[] }) => {
  if (personas.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No data available for analysis. Generate or load personas first."
      />
    );
  }

  // 分析最新的訪談問題
  const latestQuestions = new Map<string, { question: string; responses: { id: string; answer: string; willingness: number }[] }>();

  personas.forEach(p => {
    if (p.interview_history && p.interview_history.length > 0) {
      p.interview_history.forEach((record: any) => {
        if (!latestQuestions.has(record.question)) {
          latestQuestions.set(record.question, { question: record.question, responses: [] });
        }

        const answer = record.answer.toLowerCase();
        let willingness = 50;

        if (answer.includes('會買') || answer.includes('想買') || answer.includes('可以') ||
            answer.includes('試試') || answer.includes('不錯') || answer.includes('好') ||
            answer.includes('衝') || answer.includes('辦')) {
          willingness = 80;
        }
        else if (answer.includes('不') || answer.includes('沒') || answer.includes('太貴') ||
                 answer.includes('不要') || answer.includes('算了') || answer.includes('擔心') ||
                 answer.includes('怕')) {
          willingness = 20;
        }
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
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Summary Cards */}
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Personas"
              value={personas.length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Interviews"
              value={personas.reduce((sum, p) => sum + (p.interview_history?.length || 0), 0)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Avg Interviews/Person"
              value={(personas.reduce((sum, p) => sum + (p.interview_history?.length || 0), 0) / personas.length).toFixed(1)}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Question Analysis */}
      <Collapse
        defaultActiveKey={['0']}
        items={Array.from(latestQuestions.entries()).map(([question, data], idx) => {
          const avgWillingness = data.responses.reduce((sum, r) => sum + r.willingness, 0) / data.responses.length;
          const highWillingness = data.responses.filter(r => r.willingness >= 70).length;
          const mediumWillingness = data.responses.filter(r => r.willingness >= 40 && r.willingness < 70).length;
          const lowWillingness = data.responses.filter(r => r.willingness < 40).length;

          return {
            key: String(idx),
            label: <Text strong>Question {idx + 1}: {question}</Text>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Willingness Distribution */}
                <div>
                  <Text type="secondary">Purchase Willingness Distribution</Text>
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col flex={highWillingness || 1}>
                      <Tooltip title={`High: ${highWillingness}`}>
                        <div style={{
                          background: '#52c41a',
                          height: 40,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600
                        }}>
                          {highWillingness}
                        </div>
                      </Tooltip>
                    </Col>
                    <Col flex={mediumWillingness || 1}>
                      <Tooltip title={`Medium: ${mediumWillingness}`}>
                        <div style={{
                          background: '#faad14',
                          height: 40,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600
                        }}>
                          {mediumWillingness}
                        </div>
                      </Tooltip>
                    </Col>
                    <Col flex={lowWillingness || 1}>
                      <Tooltip title={`Low: ${lowWillingness}`}>
                        <div style={{
                          background: '#f5222d',
                          height: 40,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600
                        }}>
                          {lowWillingness}
                        </div>
                      </Tooltip>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col><Tag color="success">High ({((highWillingness / data.responses.length) * 100).toFixed(0)}%)</Tag></Col>
                    <Col><Tag color="warning">Medium ({((mediumWillingness / data.responses.length) * 100).toFixed(0)}%)</Tag></Col>
                    <Col><Tag color="error">Low ({((lowWillingness / data.responses.length) * 100).toFixed(0)}%)</Tag></Col>
                  </Row>
                </div>

                {/* Average Score */}
                <Card size="small">
                  <Statistic
                    title="Average Willingness Score"
                    value={avgWillingness.toFixed(1)}
                    suffix="/ 100"
                    valueStyle={{
                      color: avgWillingness >= 70 ? '#52c41a' : avgWillingness >= 40 ? '#faad14' : '#f5222d'
                    }}
                  />
                </Card>

                {/* Individual Responses */}
                <Collapse
                  ghost
                  items={[{
                    key: '1',
                    label: `View All ${data.responses.length} Responses`,
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {data.responses.map((r, i) => (
                          <Card
                            key={i}
                            size="small"
                            style={{
                              borderLeft: `3px solid ${r.willingness >= 70 ? '#52c41a' : r.willingness >= 40 ? '#faad14' : '#f5222d'}`
                            }}
                          >
                            <Text strong>{r.id}</Text>
                            <Tag style={{ marginLeft: 8 }}>{r.willingness}/100</Tag>
                            <br />
                            <Text style={{ marginTop: 4, display: 'block' }}>{r.answer}</Text>
                          </Card>
                        ))}
                      </Space>
                    ),
                  }]}
                />
              </Space>
            ),
          };
        })}
      />
    </Space>
  );
};
