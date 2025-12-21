import { useRef, useState, useEffect, useMemo } from 'react';
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

// Estimate pages based on content length (roughly 3000 chars per page)
const estimatePages = (content) => {
  if (!content) return '-';
  const chars = content.length;
  return Math.max(1, Math.ceil(chars / 3000));
};

const initialDocs = [
  {
    id: 'doc-1',
    name: '2024 Q2 財務報表',
    type: 'TXT',
    pages: estimatePages(q2Financials),
    tags: ['摘要', '納入報告'],
    content: q2Financials,
  },
  {
    id: 'doc-2',
    name: '授信條款書',
    type: 'TXT',
    pages: estimatePages(termSheet),
    tags: ['翻譯', '納入報告'],
    content: termSheet,
  },
  {
    id: 'doc-3',
    name: 'KYC / AML 資料包',
    type: 'TXT',
    pages: estimatePages(kycAml),
    tags: ['摘要', '風險掃描'],
    content: kycAml,
  },
  {
    id: 'doc-4',
    name: '擔保品估價報告',
    type: 'TXT',
    pages: estimatePages(appraisal),
    tags: ['翻譯'],
    content: appraisal,
  },
  {
    id: 'doc-5',
    name: '產業展望 Q2',
    type: 'TXT',
    pages: estimatePages(industryOutlook),
    tags: ['背景'],
    content: industryOutlook,
  },
];

// Available tags for documents
const availableTags = ['摘要', '翻譯', '納入報告', '風險掃描', '背景'];

const initialRoutingSteps = [];

const initialMessages = [];

// Generate case ID based on date
const generateCaseId = () => {
  const now = new Date();
  const prefix = 'CASE';
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
};

// Format relative time
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '尚未更新';
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  return new Date(timestamp).toLocaleDateString('zh-TW');
};

// Calculate SLA remaining time
const calculateSlaRemaining = (startTime, slaDurationMinutes = 45) => {
  if (!startTime) return `${slaDurationMinutes} 分鐘`;
  const elapsed = Math.floor((Date.now() - startTime) / 60000);
  const remaining = slaDurationMinutes - elapsed;
  if (remaining <= 0) return '已逾時';
  return `剩餘 ${remaining} 分鐘`;
};

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

// tabMeta will be computed dynamically in component

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

  // Dynamic metadata states
  const [caseId] = useState(() => generateCaseId());
  const [caseStartTime] = useState(() => Date.now());
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [ownerName, setOwnerName] = useState('RM Desk');
  const [slaMinutes] = useState(45);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every minute for SLA calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Compute dynamic tab metadata based on documents
  const tabMeta = useMemo(() => {
    const summaryDocs = documents.filter((d) => d.tags.includes('摘要')).length;
    const translationDocs = documents.filter((d) => d.tags.includes('翻譯')).length;
    const memoDocs = documents.filter((d) => d.tags.includes('納入報告')).length || documents.length;

    return {
      summary: [`來源: ${summaryDocs} 份文件`, '格式: 摘要重點'],
      translation: [`來源: ${translationDocs} 份文件`, '語言: EN'],
      memo: [`來源: ${memoDocs} 份文件`, '委員會版本'],
    };
  }, [documents]);

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
          pages: estimatePages(content),
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
        doc.id === selectedDocId ? { ...doc, content: value, pages: estimatePages(value) } : doc
      )
    );
  };

  // Toggle tag on selected document
  const handleToggleTag = (tag) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== selectedDocId) return doc;
        const hasTag = doc.tags.includes(tag);
        return {
          ...doc,
          tags: hasTag ? doc.tags.filter((t) => t !== tag) : [...doc.tags, tag],
        };
      })
    );
  };

  // Delete a document
  const handleDeleteDoc = (docId) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    if (selectedDocId === docId) {
      setSelectedDocId(documents[0]?.id || '');
    }
  };

  // Copy artifact output to clipboard
  const handleCopyOutput = async () => {
    const content = activeArtifact.output;
    if (!content) {
      setErrorMessage('尚無內容可複製');
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      setErrorMessage(''); // Clear any existing error
      alert('已複製到剪貼簿');
    } catch {
      setErrorMessage('複製失敗，請手動選取複製');
    }
  };

  // Download artifact output as file
  const handleDownloadOutput = () => {
    const content = activeArtifact.output;
    if (!content) {
      setErrorMessage('尚無內容可下載');
      return;
    }
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab}-${caseId}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Regenerate artifacts (re-send last request)
  const handleRegenerate = () => {
    if (messages.length === 0) {
      setErrorMessage('尚無對話記錄，無法重新產生');
      return;
    }
    // Find last user message and resend
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      setComposerText(lastUserMsg.content);
    }
  };

  // Create new case (reset all state)
  const handleNewCase = () => {
    if (messages.length > 0 || artifacts.summary.output || artifacts.translation.output || artifacts.memo.output) {
      if (!window.confirm('確定要新增案件嗎？目前的對話和產出將會清空。')) {
        return;
      }
    }
    setMessages([]);
    setRoutingSteps([]);
    setArtifacts({
      summary: { output: '', borrower: { name: '', description: '', rating: '' }, metrics: [], risks: [] },
      translation: { output: '', clauses: [] },
      memo: { output: '', sections: [], recommendation: '', conditions: '' },
    });
    setLastUpdateTime(null);
    setErrorMessage('');
    setComposerText('');
  };

  // Export all artifacts as a package
  const handleExportPackage = () => {
    const packageContent = {
      caseId,
      exportTime: new Date().toISOString(),
      summary: artifacts.summary,
      translation: artifacts.translation,
      memo: artifacts.memo,
      documents: documents.map((d) => ({ name: d.name, type: d.type, tags: d.tags })),
    };
    const blob = new Blob([JSON.stringify(packageContent, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `artifacts-${caseId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      setLastUpdateTime(Date.now());
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
            <Button variant="outlined" icon={Briefcase} onClick={handleNewCase}>
              新增案件
            </Button>
            <Button type="primary" icon={FolderPlus} onClick={handleExportPackage}>
              匯出資料包
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
                  案件: {caseId}
                </Tag>
                <Tag size="small" variant="borderless">
                  SLA: {calculateSlaRemaining(caseStartTime, slaMinutes)}
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
                  <span>文件設定</span>
                  <Tag size="small" variant="borderless">
                    頁數: {selectedDoc?.pages || '-'}
                  </Tag>
                </div>
                {selectedDoc ? (
                  <>
                    <div className="detail-title">{selectedDoc.name}</div>
                    <div className="tag-selector">
                      <span className="tag-label">標籤:</span>
                      {availableTags.map((tag) => (
                        <Tag
                          key={tag}
                          size="small"
                          color={selectedDoc.tags.includes(tag) ? tagColors[tag] : 'default'}
                          style={{ cursor: 'pointer', opacity: selectedDoc.tags.includes(tag) ? 1 : 0.5 }}
                          onClick={() => handleToggleTag(tag)}
                        >
                          {tag}
                        </Tag>
                      ))}
                    </div>
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
                <Button icon={Paperclip} variant="outlined" onClick={handleUploadClick}>
                  上傳文件
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
                <Button icon={Wand2} variant="outlined" disabled={isLoading} onClick={handleRegenerate}>
                  重新產生
                </Button>
                <ActionIcon icon={Copy} variant="outlined" onClick={handleCopyOutput} title="複製內容" />
                <ActionIcon icon={Download} variant="outlined" onClick={handleDownloadOutput} title="下載 Markdown" />
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
              <div className="meta-chip">更新: {formatRelativeTime(lastUpdateTime)}</div>
              <div className="meta-chip">負責人: {ownerName}</div>
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
                        <button className="preview-btn dark" type="button" onClick={handleDownloadOutput}>
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
