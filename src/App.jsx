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
  ChevronDown,
  ChevronUp,
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
  X,
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
  const [streamingContent, setStreamingContent] = useState('');
  const [isDocPanelOpen, setIsDocPanelOpen] = useState(false);

  // Dynamic metadata states
  const [caseId] = useState(() => generateCaseId());
  const [caseStartTime] = useState(() => Date.now());
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [ownerName, setOwnerName] = useState('RM Desk');
  const [slaMinutes] = useState(45);
  const [currentTime, setCurrentTime] = useState(Date.now());

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
    translations: [],  // Changed to array for history
    memo: {
      output: memoOutput,
      sections: initialMemoSections,
      recommendation: '',
      conditions: '',
    },
  });

  const [activeTranslationIndex, setActiveTranslationIndex] = useState(0);

  // Load preloaded PDF documents on startup (only once)
  useEffect(() => {
    let isMounted = true;
    const loadPreloadedDocs = async () => {
      try {
        const response = await fetch(`${apiBase || ''}/api/documents/preloaded`);
        if (!response.ok || !isMounted) return;
        const data = await response.json();
        const pdfDocs = (data.documents || []).map((doc) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          pages: doc.pages ?? '-',
          tags: [],
          content: doc.preview || '',
          status: doc.status,
          message: doc.message,
          source: 'preloaded',
        }));
        if (pdfDocs.length > 0 && isMounted) {
          setDocuments((prev) => {
            // Deduplicate by ID
            const existingIds = new Set(prev.map((d) => d.id).filter(Boolean));
            const existingKeys = new Set(
              prev
                .filter((d) => d.source === 'preloaded')
                .map((d) => `${(d.name || '').toLowerCase()}::${(d.type || '').toLowerCase()}`)
            );
            const newDocs = pdfDocs.filter((doc) => {
              const key = `${(doc.name || '').toLowerCase()}::${(doc.type || '').toLowerCase()}`;
              const idOk = doc.id ? !existingIds.has(doc.id) : true;
              const keyOk = !existingKeys.has(key);
              return idOk && keyOk;
            });
            return newDocs.length > 0 ? [...prev, ...newDocs] : prev;
          });
        }
      } catch (error) {
        console.error('載入預加載文檔失敗:', error);
      }
    };
    loadPreloadedDocs();
    return () => { isMounted = false; };
  }, []);

  // Update current time every minute for SLA calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Ensure activeTranslationIndex is within bounds
  useEffect(() => {
    if (artifacts.translations.length > 0 && activeTranslationIndex >= artifacts.translations.length) {
      setActiveTranslationIndex(artifacts.translations.length - 1);
    }
  }, [artifacts.translations.length, activeTranslationIndex]);

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

  const fileInputRef = useRef(null);

  // Get active artifact based on tab
  const getActiveArtifact = () => {
    if (activeTab === 'translation') {
      const translations = artifacts.translations;
      if (translations.length === 0) {
        return { output: '', clauses: [] };
      }
      return translations[activeTranslationIndex] || translations[0];
    }
    return artifacts[activeTab];
  };

  const activeArtifact = getActiveArtifact();
  const selectedDoc = documents.find((doc) => doc.id === selectedDocId);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setErrorMessage('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await fetch(`${apiBase || ''}/api/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '文件上傳失敗');
      }

      const nextDocs = (data.documents || []).map((doc) => ({
        id: doc.id || createId(),
        name: doc.name || '未命名',
        type: doc.type || 'FILE',
        pages: doc.pages ?? '-',
        tags: [],
        content: doc.preview || '',
        status: doc.status,
        message: doc.message,
        source: 'uploaded',
      }));

      if (!nextDocs.length) {
        throw new Error('未取得文件資訊');
      }

      setDocuments((prev) => [...nextDocs, ...prev]);
      setSelectedDocId(nextDocs[0]?.id || selectedDocId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? `上傳失敗: ${error.message}` : '上傳失敗，請稍後再試。'
      );
    } finally {
      event.target.value = '';
    }
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
    const hasContent = messages.length > 0 || artifacts.summary.output || artifacts.translations.length > 0 || artifacts.memo.output;
    if (hasContent) {
      if (!window.confirm('確定要新增案件嗎？目前的對話和產出將會清空。')) {
        return;
      }
    }
    setMessages([]);
    setRoutingSteps([]);
    setArtifacts({
      summary: { output: '', borrower: { name: '', description: '', rating: '' }, metrics: [], risks: [] },
      translations: [],
      memo: { output: '', sections: [], recommendation: '', conditions: '' },
    });
    setActiveTranslationIndex(0);
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
      translations: artifacts.translations,
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
    setStreamingContent('');
    // Show initial loading state - will be replaced by real routing data from LLM
    setRoutingSteps([
      { id: createId(), label: '處理請求中...', status: 'running', eta: '進行中' },
    ]);

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
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API request failed');
      }

      const data = await response.json();
      console.log('📦 Received data from API:', data);

      if (data.error) {
        throw new Error(data.error + (data.detail ? `: ${data.detail}` : ''));
      }

      // Update artifacts
      if (data.summary || data.translation || data.memo) {
        setArtifacts((prev) => {
          const newArtifacts = {
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
            translations: prev.translations,
            memo: {
              ...prev.memo,
              output: data.memo?.output || prev.memo.output,
              sections: data.memo?.sections || prev.memo.sections,
              recommendation: data.memo?.recommendation || prev.memo.recommendation,
              conditions: data.memo?.conditions || prev.memo.conditions,
            },
          };

          // Add new translation version if present
          if (data.translation && (data.translation.output || data.translation.clauses?.length > 0)) {
            const newTranslation = {
              id: createId(),
              timestamp: Date.now(),
              title: `翻譯 #${prev.translations.length + 1}`,
              output: data.translation.output || '',
              clauses: data.translation.clauses || [],
            };
            newArtifacts.translations = [...prev.translations, newTranslation];
            setActiveTranslationIndex(newArtifacts.translations.length - 1);
          }

          return newArtifacts;
        });
      }

      // Update routing
      if (Array.isArray(data.routing)) {
        setRoutingSteps(
          data.routing.map((step) => ({
            id: step.id || createId(),
            label: step.label || '任務更新',
            status: step.status || 'done',
            eta: step.eta || '完成',
          }))
        );
      } else {
        setRoutingSteps([]);
      }

      // Add assistant message
      const assistantMessage = {
        id: createId(),
        role: 'assistant',
        name: 'LLM',
        time: nowTime(),
        content: data.assistant?.content || '已完成處理。',
        bullets: data.assistant?.bullets,
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
      setStreamingContent('');
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

            {/* Collapsible Document Panel Toggle */}
            <button
              type="button"
              className={`doc-panel-toggle${isDocPanelOpen ? ' is-open' : ''}`}
              onClick={() => setIsDocPanelOpen(!isDocPanelOpen)}
            >
              <Icon icon={isDocPanelOpen ? ChevronUp : ChevronDown} size="small" />
              <span>文件管理 ({documents.length})</span>
              <Button size="small" variant="outlined" icon={Upload} onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}>
                上傳
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="file-input"
                onChange={handleUploadFiles}
              />
            </button>

            {/* Collapsible Document Panel */}
            {isDocPanelOpen && (
              <div className="doc-drawer">
                <div className="doc-list">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`doc-row${doc.id === selectedDocId ? ' is-active' : ''}`}
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      <Icon icon={FileText} size="small" className="doc-icon" />
                      <div className="doc-info">
                        <span className="doc-name">{doc.name}</span>
                        <span className="doc-type">{doc.type} · {doc.pages} 頁</span>
                      </div>
                      <div className="doc-row-tags">
                        {doc.tags.slice(0, 2).map((tag) => (
                          <Tag
                            key={`${doc.id}-${tag}`}
                            size="small"
                            variant="borderless"
                            color={tagColors[tag] || 'default'}
                          >
                            {tag}
                          </Tag>
                        ))}
                        {doc.tags.length > 2 && <span className="more-tags">+{doc.tags.length - 2}</span>}
                      </div>
                      <ActionIcon
                        icon={X}
                        size="small"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                        title="刪除"
                      />
                    </div>
                  ))}
                </div>
                {selectedDoc && (
                  <div className="doc-settings">
                    <div className="settings-header">
                      <span className="settings-title">{selectedDoc.name}</span>
                      <Tag size="small" variant="borderless">{selectedDoc.pages} 頁</Tag>
                    </div>
                    <div className="tag-selector">
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
                      rows={3}
                      value={selectedDoc.content}
                      onChange={(event) => handleDocContentChange(event.target.value)}
                      placeholder="貼上關鍵段落或摘要..."
                    />
                  </div>
                )}
              </div>
            )}

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
              <div className="preview-card">
                <div className="card-head">
                  <div>
                    <Text as="h3" weight="600" className="card-title">
                      產出預覽
                    </Text>
                    <Text type="secondary" className="card-subtitle">
                      結構化呈現分析產出
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
                        即時產生 LLM 輸出（Markdown），可直接作為委員會草稿
                      </p>
                    </div>
                    {isLoading && streamingContent ? (
                      <div className="streaming-wrapper">
                        <div className="streaming-label">正在產生中...</div>
                        <div className="streaming-content">
                          <pre className="streaming-text">{streamingContent}</pre>
                          <span className="streaming-cursor">▊</span>
                        </div>
                      </div>
                    ) : (
                      renderMarkdown(activeArtifact.output)
                    )}
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

                      {artifacts.translations.length > 1 && (
                        <div className="translation-tabs">
                          {artifacts.translations.map((trans, index) => (
                            <button
                              key={trans.id}
                              type="button"
                              className={`translation-tab${index === activeTranslationIndex ? ' is-active' : ''}`}
                              onClick={() => setActiveTranslationIndex(index)}
                            >
                              {trans.title}
                            </button>
                          ))}
                        </div>
                      )}

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
