import { useRef, useState } from 'react';
import {
  ActionIcon,
  Button,
  Icon,
  Tag,
  Text,
  TextArea,
  ThemeProvider,
} from '@lobehub/ui';
import {
  ArrowUpRight,
  Briefcase,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  FolderPlus,
  Landmark,
  Languages,
  ListChecks,
  Paperclip,
  Upload,
  Wand2,
} from 'lucide-react';
import q2Financials from './docs/q2-financials.txt?raw';
import termSheet from './docs/term-sheet.txt?raw';
import kycAml from './docs/kyc-aml.txt?raw';
import appraisal from './docs/appraisal.txt?raw';
import industryOutlook from './docs/industry-outlook.txt?raw';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const createId = () => Math.random().toString(36).slice(2, 10);

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const nowTime = () =>
  new Date().toLocaleTimeString('zh-TW', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

const initialDocs = [
  {
    id: 'doc-1',
    name: '2024 Q2 財務報表',
    type: 'PDF',
    pages: 42,
    tags: ['摘要', '納入報告'],
    content: q2Financials,
  },
  {
    id: 'doc-2',
    name: '授信條款書',
    type: 'DOCX',
    pages: 9,
    tags: ['翻譯', '納入報告'],
    content: termSheet,
  },
  {
    id: 'doc-3',
    name: 'KYC / AML 資料包',
    type: 'PDF',
    pages: 65,
    tags: ['摘要', '風險掃描'],
    content: kycAml,
  },
  {
    id: 'doc-4',
    name: '擔保品估價報告',
    type: 'PDF',
    pages: 18,
    tags: ['翻譯'],
    content: appraisal,
  },
  {
    id: 'doc-5',
    name: '產業展望 Q2',
    type: 'PPTX',
    pages: 22,
    tags: ['背景'],
    content: industryOutlook,
  },
];

const initialRoutingSteps = [
  {
    id: 'route-1',
    label: '翻譯授信條款書',
    status: 'running',
    eta: '3 分鐘',
  },
  {
    id: 'route-2',
    label: '翻譯擔保品估價報告',
    status: 'queued',
    eta: '7 分鐘',
  },
  {
    id: 'route-3',
    label: '摘要 Q2 財報重點',
    status: 'queued',
    eta: '8 分鐘',
  },
  {
    id: 'route-4',
    label: '摘要 KYC/AML 風險',
    status: 'done',
    eta: '完成',
  },
];

const initialMessages = [
  {
    id: 'msg-1',
    role: 'user',
    name: 'RM',
    time: '10:08',
    content:
      '已上傳 Q2 財務報表、授信條款書、KYC/AML 資料包與擔保品估價報告。請將條款書與估價報告翻譯為英文，並摘要 Q2 財報與 KYC 風險。成果請放在不同的 Artifact 分頁。',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    name: 'LLM',
    time: '10:09',
    content:
      '收到，已依指示進行文件分流與產出，並會同步更新授信報告草稿。',
    bullets: ['摘要: Q2 財務與 KYC/AML', '翻譯: 條款書與估價報告', '授信報告: 委員會版本'],
  },
  {
    id: 'msg-3',
    role: 'assistant',
    name: 'LLM',
    time: '10:11',
    content: 'Artifacts 生成中，完成後會即時更新右側分頁。',
    attachment: {
      title: 'Artifacts: 授信資料包',
      detail: '排程中 - 即將更新',
    },
  },
];

const summaryOutput = '';

const translationOutput = '';

const memoOutput = '';

const initialSummaryMetrics = [];

const initialRiskFlags = [];

const initialTranslationPairs = [];

const initialMemoSections = [];

const artifactTabs = [
  { id: 'summary', label: '摘要', icon: FileText },
  { id: 'translation', label: '翻譯', icon: Languages },
  { id: 'memo', label: '授信報告', icon: ClipboardCheck },
];

const tabMeta = {
  summary: ['來源: 2 份文件', '格式: 摘要重點'],
  translation: ['來源: 2 份文件', '語言: EN'],
  memo: ['來源: 4 份文件', '委員會版本'],
};

const previewTags = {
  summary: '摘要視圖',
  translation: '雙語對照',
  memo: '報告排版',
};

const tagColors = {
  摘要: 'gold',
  翻譯: 'cyan',
  納入報告: 'green',
  風險掃描: 'volcano',
  背景: 'geekblue',
};

const statusMeta = {
  running: { label: '進行中', className: 'is-running' },
  queued: { label: '等待中', className: 'is-queued' },
  done: { label: '完成', className: 'is-done' },
};

const normalizeRiskLevel = (level = '') => {
  const raw = level.toString();
  const lowered = raw.toLowerCase();

  if (lowered.includes('high') || raw.includes('高')) {
    return { key: 'high', label: '高' };
  }
  if (lowered.includes('medium') || raw.includes('中')) {
    return { key: 'medium', label: '中' };
  }
  return { key: 'low', label: '低' };
};

export default function App() {
  const [documents, setDocuments] = useState(initialDocs);
  const [selectedDocId, setSelectedDocId] = useState(initialDocs[0]?.id || '');
  const [routingSteps, setRoutingSteps] = useState(initialRoutingSteps);
  const [messages, setMessages] = useState(initialMessages);
  const [composerText, setComposerText] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [artifacts, setArtifacts] = useState({
    summary: {
      output: summaryOutput,
      borrower: {
        name: '',
        description: '',
        rating: '',
      },
      metrics: initialSummaryMetrics,
      risks: initialRiskFlags,
    },
    translation: {
      output: translationOutput,
      clauses: initialTranslationPairs,
    },
    memo: {
      output: memoOutput,
      sections: initialMemoSections,
      recommendation: '',
      conditions: '',
    },
  });

  const fileInputRef = useRef(null);

  const activeArtifact = artifacts[activeTab];
  const selectedDoc = documents.find((doc) => doc.id === selectedDocId);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const nextDocs = await Promise.all(
      files.map(async (file) => {
        const extension = file.name.split('.').pop() || '';
        const isTextFile =
          file.type.startsWith('text/') ||
          ['txt', 'md', 'csv'].includes(extension.toLowerCase());
        const content = isTextFile ? await file.text() : '';

        return {
          id: createId(),
          name: file.name.replace(/\.[^.]+$/, ''),
          type: extension.toUpperCase() || 'FILE',
          pages: '-',
          tags: [],
          content,
        };
      })
    );

    setDocuments((prev) => [...nextDocs, ...prev]);
    setSelectedDocId(nextDocs[0]?.id || selectedDocId);
    event.target.value = '';
  };

  const handleDocContentChange = (value) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === selectedDocId ? { ...doc, content: value } : doc
      )
    );
  };

  const handleSend = async () => {
    const trimmed = composerText.trim();
    if (!trimmed || isLoading) return;

    const userMessage = {
      id: createId(),
      role: 'user',
      name: 'RM',
      time: nowTime(),
      content: trimmed,
    };

    const outgoingMessages = [...messages, userMessage];

    setMessages(outgoingMessages);
    setComposerText('');
    setIsLoading(true);
    setErrorMessage('');
    setRoutingSteps((prev) =>
      prev.map((step, index) => ({
        ...step,
        status: index === 0 ? 'running' : 'queued',
        eta: index === 0 ? '進行中' : step.eta,
      }))
    );

    try {
      const response = await fetch(`${apiBase}/api/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: outgoingMessages.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          documents,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API request failed');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.summary || data.translation || data.memo) {
        setArtifacts((prev) => ({
          summary: {
            ...prev.summary,
            output: data.summary?.output || prev.summary.output,
            borrower: {
              ...prev.summary.borrower,
              ...(data.summary?.borrower || {}),
            },
            metrics: data.summary?.metrics || prev.summary.metrics,
            risks: data.summary?.risks || prev.summary.risks,
          },
          translation: {
            ...prev.translation,
            output: data.translation?.output || prev.translation.output,
            clauses: data.translation?.clauses || prev.translation.clauses,
          },
          memo: {
            ...prev.memo,
            output: data.memo?.output || prev.memo.output,
            sections: data.memo?.sections || prev.memo.sections,
            recommendation:
              data.memo?.recommendation || prev.memo.recommendation,
            conditions: data.memo?.conditions || prev.memo.conditions,
          },
        }));
      }

      if (Array.isArray(data.routing)) {
        setRoutingSteps(
          data.routing.map((step) => ({
            id: step.id || createId(),
            label: step.label || '任務更新',
            status: step.status || 'queued',
            eta: step.eta || '等待中',
          }))
        );
      } else {
        setRoutingSteps((prev) =>
          prev.map((step) => ({ ...step, status: 'done', eta: '完成' }))
        );
      }

      const assistantMessage = {
        id: createId(),
        role: 'assistant',
        name: 'LLM',
        time: nowTime(),
        content: data.assistant?.content || '已完成最新授信產出。',
        bullets: data.assistant?.bullets,
        attachment: {
          title: 'Artifacts: 授信資料包',
          detail: `更新 ${nowTime()} - 3 個分頁`,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `連線失敗: ${error.message}`
          : '連線失敗，請稍後再試。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderMarkdown = (value) => {
    const safeText =
      typeof value === 'string'
        ? value.trim()
        : value
          ? JSON.stringify(value, null, 2)
          : '';

    return (
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {safeText || '尚未產出，請先在左側送出指示。'}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <ThemeProvider
      customTheme={{
        primaryColor: '#1f4b6e',
        neutralColor: '#1c1a18',
      }}
    >
      <div className="artifact-app">
        <header className="artifact-header">
          <div className="brand">
            <div className="brand-icon">
              <Icon icon={Landmark} size="small" />
            </div>
            <div>
              <Text as="h1" weight="700" className="brand-title">
                授信 Artifacts 工作台
              </Text>
              <Text type="secondary" className="brand-subtitle">
                企業金融 RM 授信報告工作流程
              </Text>
            </div>
          </div>

          <div className="header-tags">
            <Tag size="small" color="gold">
              企業金融
            </Tag>
            <Tag size="small" color="cyan">
              RM 工作區
            </Tag>
            <Tag size="small" color="green">
              Artifacts 即時
            </Tag>
          </div>

          <div className="header-actions">
            <Button variant="outlined" icon={Briefcase}>
              新增案件
            </Button>
            <Button type="primary" icon={FolderPlus}>
              分享資料包
            </Button>
          </div>
        </header>

        <div className="artifact-shell">
          <section className="panel chat-panel">
            <div className="panel-header">
              <div>
                <Text as="h2" weight="600" className="panel-title">
                  RM 對話
                </Text>
                <Text type="secondary" className="panel-subtitle">
                  將文件指派到摘要/翻譯任務並生成授信內容
                </Text>
              </div>
              <div className="panel-actions">
                <Tag size="small" variant="borderless">
                  案件: ATLAS-102
                </Tag>
                <Tag size="small" variant="borderless">
                  SLA: 45 分鐘
                </Tag>
              </div>
            </div>

            <div className="doc-tray">
              <div className="tray-header">
                <div className="tray-title">
                  <Icon icon={Upload} size="small" />
                  <span>已上傳文件</span>
                </div>
                <Button size="small" variant="outlined" icon={Upload} onClick={handleUploadClick}>
                  上傳
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="file-input"
                  onChange={handleUploadFiles}
                />
              </div>
              <div className="doc-grid">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    className={`doc-card${doc.id === selectedDocId ? ' is-active' : ''}`}
                    onClick={() => setSelectedDocId(doc.id)}
                  >
                    <div className="doc-title">{doc.name}</div>
                    <div className="doc-meta">
                      <span>{doc.type}</span>
                      <span>{doc.pages} 頁</span>
                    </div>
                    <div className="doc-tags">
                      {doc.tags.length ? (
                        doc.tags.map((tag) => (
                          <Tag
                            key={`${doc.id}-${tag}`}
                            size="small"
                            variant="borderless"
                            color={tagColors[tag] || 'default'}
                          >
                            {tag}
                          </Tag>
                        ))
                      ) : (
                        <span className="doc-empty">尚未標註</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="doc-detail">
                <div className="detail-header">
                  <span>文件內容 (可選)</span>
                  <Tag size="small" variant="borderless">
                    只會送出文字內容
                  </Tag>
                </div>
                {selectedDoc ? (
                  <>
                    <div className="detail-title">{selectedDoc.name}</div>
                    <TextArea
                      rows={4}
                      value={selectedDoc.content}
                      onChange={(event) => handleDocContentChange(event.target.value)}
                      placeholder="貼上關鍵段落或摘要，讓 LLM 產出更準確"
                    />
                  </>
                ) : (
                  <Text type="secondary">請先選擇文件再貼上內容。</Text>
                )}
              </div>
            </div>

            <div className="routing-panel">
              <div className="routing-header">
                <div className="tray-title">
                  <Icon icon={ListChecks} size="small" />
                  <span>任務路由</span>
                </div>
                <Tag size="small" variant="borderless">
                  自動分類
                </Tag>
              </div>
              <div className="routing-list">
                {routingSteps.map((step) => (
                  <div key={step.id} className="routing-item">
                    <div className={`status-dot ${statusMeta[step.status]?.className || ''}`} />
                    <div className="routing-body">
                      <div className="routing-label">{step.label}</div>
                      <div className="routing-meta">
                        <span
                          className={`status-pill ${statusMeta[step.status]?.className || ''}`}
                        >
                          {statusMeta[step.status]?.label || '等待中'}
                        </span>
                        <span className="routing-eta">{step.eta}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chat-stream">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`message ${
                    message.role === 'user' ? 'is-user' : 'is-assistant'
                  }`}
                  style={{ '--delay': `${index * 120}ms` }}
                >
                  <div className="message-avatar">
                    {message.role === 'user' ? 'RM' : 'AI'}
                  </div>
                  <div className="message-bubble">
                    <div className="message-meta">
                      <span className="message-name">{message.name}</span>
                      <span className="message-time">{message.time}</span>
                    </div>
                    <p className="message-text">{message.content}</p>
                    {message.bullets ? (
                      <ul className="message-list">
                        {message.bullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                    {message.attachment ? (
                      <div className="message-attachment">
                        <div className="attachment-title">
                          {message.attachment.title}
                        </div>
                        <div className="attachment-detail">
                          {message.attachment.detail}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-composer">
              <TextArea
                rows={3}
                value={composerText}
                onChange={(event) => setComposerText(event.target.value)}
                placeholder="輸入指示，例如：請翻譯條款書第 3-6 條，並更新風險摘要"
              />
              {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
              <div className="composer-actions">
                <Button icon={Paperclip} variant="outlined">
                  附件
                </Button>
                <Button icon={ArrowUpRight} type="primary" onClick={handleSend} disabled={isLoading}>
                  {isLoading ? '產生中...' : '送出指示'}
                </Button>
              </div>
            </div>
          </section>

          <section className="panel artifact-panel">
            <div className="panel-header">
              <div>
                <Text as="h2" weight="600" className="panel-title">
                  Artifacts
                </Text>
                <Text type="secondary" className="panel-subtitle">
                  分頁呈現摘要、翻譯與授信報告草稿
                </Text>
              </div>
              <div className="panel-actions">
                <Button icon={Wand2} variant="outlined" disabled={isLoading}>
                  重新產生
                </Button>
                <ActionIcon icon={Copy} variant="outlined" />
                <ActionIcon icon={Download} variant="outlined" />
              </div>
            </div>

            <div className="tab-bar">
              {artifactTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`tab-button${activeTab === tab.id ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon icon={tab.icon} size="small" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="artifact-meta">
              <div className="meta-chip">更新: 1 分鐘前</div>
              <div className="meta-chip">負責人: RM Desk</div>
              {tabMeta[activeTab].map((item) => (
                <div key={item} className="meta-chip">
                  {item}
                </div>
              ))}
              <div className="meta-chip live">
                <span className="live-dot" />
                {isLoading ? '產生中' : '即時更新'}
              </div>
            </div>

            <div className="artifact-stack">
              <div className="output-card">
                <div className="card-head">
                  <div>
                    <Text as="h3" weight="600" className="card-title">
                      輸出內容
                    </Text>
                    <Text type="secondary" className="card-subtitle">
                      依分頁顯示 LLM 產出文字
                    </Text>
                  </div>
                  <Tag size="small" color="gold" variant="filled">
                    Markdown
                  </Tag>
                </div>
                <div className="output-code">
                  {renderMarkdown(activeArtifact.output)}
                </div>
              </div>

              <div className="preview-card">
                <div className="card-head">
                  <div>
                    <Text as="h3" weight="600" className="card-title">
                      右側預覽
                    </Text>
                    <Text type="secondary" className="card-subtitle">
                      結構化呈現給授信委員會
                    </Text>
                  </div>
                  <div className="preview-actions">
                    <Tag size="small" color="cyan" variant="filled">
                      {previewTags[activeTab]}
                    </Tag>
                  </div>
                </div>

                <div className="preview-canvas">
                  <div className="live-markdown">
                    <div className="live-markdown-head">
                      <div className="summary-kicker">Live Preview</div>
                      <p className="live-markdown-hint">
                        右側即時套用 LLM 輸出（Markdown），可直接作為委員會草稿
                      </p>
                    </div>
                    {renderMarkdown(activeArtifact.output)}
                  </div>

                  {activeTab === 'summary' ? (
                    <div className="preview-summary">
                      <div className="summary-header">
                        <div>
                          <div className="summary-kicker">借款人概況</div>
                          <h4>{activeArtifact.borrower?.name || '未命名'}</h4>
                          <p>{activeArtifact.borrower?.description || '內容不足，需補充'}</p>
                        </div>
                        <div className="rating-pill">
                          評等: {activeArtifact.borrower?.rating || '待補'}
                        </div>
                      </div>
                      <div className="summary-metrics">
                        {(activeArtifact.metrics || []).map((metric) => (
                          <div key={metric.id || metric.label} className="summary-metric">
                            <div className="metric-value">{metric.value}</div>
                            <div className="metric-label">{metric.label}</div>
                            <div className="metric-delta">{metric.delta}</div>
                          </div>
                        ))}
                      </div>
                      <div className="summary-risks">
                        <div className="risk-title">主要風險</div>
                        <div className="risk-grid">
                          {(activeArtifact.risks || []).map((risk) => {
                            const level = normalizeRiskLevel(risk.level);
                            return (
                              <div key={risk.id || risk.label} className="risk-card">
                                <span>{risk.label}</span>
                                <span className={`risk-level risk-${level.key}`}>
                                  {level.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'translation' ? (
                    <div className="preview-translation">
                      <div className="translation-header">
                        <div>
                          <div className="summary-kicker">條款翻譯</div>
                          <h4>翻譯校對 (EN)</h4>
                          <p>條款關鍵句對照，方便納入授信報告。</p>
                        </div>
                        <Tag size="small" variant="borderless" color="gold">
                          {(activeArtifact.clauses || []).length} 條
                        </Tag>
                      </div>
                      <div className="translation-list">
                        {(activeArtifact.clauses || []).map((pair) => (
                          <div key={pair.id || pair.section} className="translation-block">
                            <div className="translation-label">{pair.section}</div>
                            <div className="translation-columns">
                              <div className="translation-col">
                                <div className="translation-caption">原文</div>
                                <p>{pair.source}</p>
                              </div>
                              <div className="translation-col">
                                <div className="translation-caption">英文</div>
                                <p>{pair.translated}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'memo' ? (
                    <div className="preview-memo">
                      <div className="memo-header">
                        <div>
                          <div className="summary-kicker">授信報告草稿</div>
                          <h4>擔保授信 - 委員會版本</h4>
                          <p>已整合重點摘要、風險與條款。</p>
                        </div>
                        <div className="rating-pill">
                          建議: {activeArtifact.recommendation || '待更新'}
                        </div>
                      </div>
                      <div className="memo-grid">
                        {(activeArtifact.sections || []).map((section) => (
                          <div key={section.id || section.title} className="memo-card">
                            <div className="memo-title">{section.title}</div>
                            <div className="memo-text">{section.detail}</div>
                          </div>
                        ))}
                      </div>
                      <div className="memo-footer">
                        <div>
                          <div className="footer-title">核准條件</div>
                          <div className="footer-text">
                            {activeArtifact.conditions || '內容不足，需補充'}
                          </div>
                        </div>
                        <button className="preview-btn dark" type="button">
                          匯出報告
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ThemeProvider>
  );
}
