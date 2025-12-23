import { useRef, useState, useEffect } from 'react';
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
  Edit3,
  FileText,
  FolderOpen,
  FolderPlus,
  Landmark,
  Languages,
  ListChecks,
  Paperclip,
  Plus,
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
  { id: 'documents', label: '文件', icon: FolderOpen },
  { id: 'summary', label: '摘要', icon: FileText },
  { id: 'translation', label: '翻譯', icon: Languages },
  { id: 'memo', label: '授信報告', icon: ClipboardCheck },
];

// 預設標籤分類
const workflowTags = ['待處理', '處理中', '已完成', '需補件', '已歸檔'];
const functionTags = ['摘要', '翻譯', '納入報告', '風險掃描', '背景資料'];

const tagColors = {
  // 流程標籤
  待處理: 'orange',
  處理中: 'blue',
  已完成: 'green',
  需補件: 'red',
  已歸檔: 'default',
  // 功能標籤
  摘要: 'gold',
  翻譯: 'cyan',
  納入報告: 'green',
  風險掃描: 'volcano',
  背景資料: 'geekblue',
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
  const [editingDocId, setEditingDocId] = useState(''); // For tag editing
  const [customTags, setCustomTags] = useState([]); // User-created tags
  const [newTagInput, setNewTagInput] = useState('');
  const [routingSteps, setRoutingSteps] = useState(initialRoutingSteps);
  const [messages, setMessages] = useState(initialMessages);
  const [composerText, setComposerText] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [streamingContent, setStreamingContent] = useState('');

  // Dynamic metadata states
  const [caseId] = useState(() => generateCaseId());
  const [caseStartTime] = useState(() => Date.now());
  const [slaMinutes] = useState(45);
  const [ownerName, setOwnerName] = useState('RM Desk');

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

  // Ensure activeTranslationIndex is within bounds
  useEffect(() => {
    if (artifacts.translations.length > 0 && activeTranslationIndex >= artifacts.translations.length) {
      setActiveTranslationIndex(artifacts.translations.length - 1);
    }
  }, [artifacts.translations.length, activeTranslationIndex]);

  const fileInputRef = useRef(null);

  // Get active artifact based on tab
  const getActiveArtifact = () => {
    if (activeTab === 'documents') {
      return { output: '' };
    }
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
  const hasRouting = routingSteps.length > 0;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Tag management functions
  const handleToggleTag = (docId, tag) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;
        const tags = doc.tags || [];
        const hasTag = tags.includes(tag);
        return {
          ...doc,
          tags: hasTag ? tags.filter((t) => t !== tag) : [...tags, tag],
        };
      })
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!customTags.includes(trimmed)) {
      setCustomTags((prev) => [...prev, trimmed]);
    }
    if (editingDocId) {
      handleToggleTag(editingDocId, trimmed);
    }
    setNewTagInput('');
  };

  const handleToggleEditTags = (docId) => {
    setEditingDocId((prev) => (prev === docId ? '' : docId));
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
      // Build system context for LLM
      const systemContext = {
        case_id: caseId,
        owner_name: ownerName,
        has_summary: Boolean(artifacts.summary.output),
        has_translation: artifacts.translations.length > 0,
        has_memo: Boolean(artifacts.memo.output),
        translation_count: artifacts.translations.length,
      };

      const response = await fetch(`${apiBase}/api/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: outgoingMessages.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          documents,
          stream: true,
          system_context: systemContext,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API request failed');
      }

      const contentType = response.headers.get('content-type') || '';
      let data = null;

      if (!contentType.includes('text/event-stream')) {
        // Fallback: handle JSON (e.g., error response) when SSE is not returned
        data = await response.json().catch(() => null);
      } else {
        // Handle SSE streaming
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);

              // Handle streaming chunks - update routing in real-time
              if (parsed.chunk) {
                accumulatedContent += parsed.chunk;
                setStreamingContent(accumulatedContent);

                // Try to extract partial routing from accumulated content
                try {
                  const routingMatch = accumulatedContent.match(/"routing"\s*:\s*\[([\s\S]*?)\]/);
                  if (routingMatch) {
                    const routingJson = JSON.parse(`[${routingMatch[1]}]`);
                    if (Array.isArray(routingJson) && routingJson.length > 0) {
                      setRoutingSteps(
                        routingJson.map((step) => ({
                          id: step.id || createId(),
                          label: step.label || '任務更新',
                          status: step.status || 'running',
                          eta: step.eta || '進行中',
                        }))
                      );
                    }
                  }
                } catch {
                  // Partial JSON, continue accumulating
                }
                continue;
              }

              // Handle final complete data or done signal
              if (parsed.done) {
                continue;
              }

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              // Final parsed response
              if (parsed.assistant || parsed.summary || parsed.translation || parsed.memo) {
                data = parsed;
              }
            } catch (parseErr) {
              console.warn('Parse error:', parseErr);
            }
          }
        }
      }

      console.log('📦 Received data from API:', data);

      if (!data) {
        throw new Error('No valid response received');
      }

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
                Credit Memo 工作台
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
          <section className="panel docs-panel">
            <div className="panel-header">
              <div>
                <Text as="h2" weight="600" className="panel-title">
                  文件集
                </Text>
              </div>
              <div className="panel-actions">
                <Button icon={Upload} variant="outlined" onClick={handleUploadClick}>
                  上傳文件
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="file-input"
                  onChange={handleUploadFiles}
                />
              </div>
            </div>

            <div className="doc-tray">
              {documents.length > 0 ? (
                <div className="doc-grid">
                  {documents.map((doc) => {
                    const isEditing = editingDocId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className={`doc-card${doc.id === selectedDocId ? ' is-active' : ''}`}
                        onClick={() => !isEditing && setSelectedDocId(doc.id)}
                      >
                        <div className="doc-card-row">
                          <div className="doc-title">{doc.name}</div>
                          <Tag size="small" color="blue">{doc.type}</Tag>
                          <ActionIcon
                            icon={isEditing ? X : Edit3}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEditTags(doc.id);
                            }}
                            title={isEditing ? '關閉編輯' : '編輯標籤'}
                          />
                        </div>

                        {isEditing ? (
                          <div className="tag-editor">
                            <div className="tag-section">
                              <div className="tag-section-title">流程狀態</div>
                              <div className="tag-selector">
                                {workflowTags.map((tag) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    className={`tag-option${(doc.tags || []).includes(tag) ? ' is-selected' : ''}`}
                                    onClick={() => handleToggleTag(doc.id, tag)}
                                  >
                                    <Tag size="small" color={tagColors[tag] || 'default'}>
                                      {tag}
                                    </Tag>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="tag-section">
                              <div className="tag-section-title">功能標籤</div>
                              <div className="tag-selector">
                                {functionTags.map((tag) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    className={`tag-option${(doc.tags || []).includes(tag) ? ' is-selected' : ''}`}
                                    onClick={() => handleToggleTag(doc.id, tag)}
                                  >
                                    <Tag size="small" color={tagColors[tag] || 'default'}>
                                      {tag}
                                    </Tag>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {customTags.length > 0 && (
                              <div className="tag-section">
                                <div className="tag-section-title">自定義標籤</div>
                                <div className="tag-selector">
                                  {customTags.map((tag) => (
                                    <button
                                      key={tag}
                                      type="button"
                                      className={`tag-option${(doc.tags || []).includes(tag) ? ' is-selected' : ''}`}
                                      onClick={() => handleToggleTag(doc.id, tag)}
                                    >
                                      <Tag size="small" color="purple">
                                        {tag}
                                      </Tag>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="tag-add">
                              <input
                                type="text"
                                className="tag-input"
                                placeholder="新增自定義標籤..."
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddCustomTag();
                                  }
                                }}
                              />
                              <ActionIcon
                                icon={Plus}
                                size="small"
                                onClick={handleAddCustomTag}
                                disabled={!newTagInput.trim()}
                                title="新增標籤"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="doc-tags">
                            {doc.tags?.length ? (
                              doc.tags.map((tag) => (
                                <Tag
                                  key={`${doc.id}-${tag}`}
                                  size="small"
                                  color={tagColors[tag] || (customTags.includes(tag) ? 'purple' : 'default')}
                                >
                                  {tag}
                                </Tag>
                              ))
                            ) : (
                              <span className="doc-empty">點擊 ✏️ 編輯標籤</span>
                            )}
                          </div>
                        )}

                        {doc.status === 'error' ? (
                          <div className="doc-empty">解析失敗</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="doc-empty">尚未上傳文件，支援 PDF / TXT</div>
              )}
            </div>

          </section>

          <section className="panel artifact-panel">
            <div className="panel-header">
              <div>
                <Text as="h2" weight="600" className="panel-title">
                  Artifacts
                </Text>
              </div>
              <div className="panel-actions">
                {activeTab === 'memo' ? (
                  <Button type="primary" onClick={handleDownloadOutput}>
                    匯出報告
                  </Button>
                ) : null}
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

            <div className="artifact-stack">
              <div className="preview-card">
                <div className="card-head">
                  <div>
                    <Text as="h3" weight="600" className="card-title">
                      產出預覽
                    </Text>
                  </div>
                </div>

                <div className="preview-canvas">
                  {activeTab === 'documents' ? (
                    <div className="preview-documents">
                      {(() => {
                        const selectedDoc = documents.find((doc) => doc.id === selectedDocId);
                        if (!selectedDoc) {
                          return <div className="doc-empty">尚未選擇文件</div>;
                        }
                        return (
                          <>
                            <div className="doc-preview-header">
                              <Icon icon={FileText} size="small" />
                              <span className="doc-preview-name">{selectedDoc.name}</span>
                              <Tag size="small" color="blue">{selectedDoc.type}</Tag>
                              <span className="doc-preview-meta">{selectedDoc.pages} 頁</span>
                            </div>
                            {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                              <div className="doc-preview-tags">
                                {selectedDoc.tags.map((tag) => (
                                  <Tag
                                    key={tag}
                                    size="small"
                                    color={tagColors[tag] || (customTags.includes(tag) ? 'purple' : 'default')}
                                  >
                                    {tag}
                                  </Tag>
                                ))}
                              </div>
                            )}
                            <div className="doc-preview-content-full">
                              {selectedDoc.content ? (
                                <pre className="doc-preview-text">{selectedDoc.content}</pre>
                              ) : (
                                <div className="no-preview-full">
                                  <Icon icon={FileText} size="large" />
                                  <p>無文字預覽內容</p>
                                  <p className="no-preview-hint">
                                    此 PDF 文件已索引，可透過 RAG 檢索內容
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="live-markdown">
                      {isLoading && streamingContent ? (
                        <div className="streaming-wrapper">
                          <div className="streaming-label">正在產生中...</div>
                          <div className="streaming-content">
                            <pre className="streaming-text">{streamingContent}</pre>
                            <span className="streaming-cursor">▊</span>
                          </div>
                        </div>
                      ) : (
                        renderMarkdown(activeArtifact?.output || '')
                      )}
                    </div>
                  )}

                  {activeTab === 'translation' ? (
                    <div className="preview-translation">
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
                </div>
              </div>
            </div>
          </section>

          <section className="panel chat-panel">
            <div className="panel-header">
              <div>
                <Text as="h2" weight="600" className="panel-title">
                  RM 對話
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

            <div className={`routing-panel${hasRouting ? '' : ' is-empty'}`}>
              <div className="routing-header">
                <div className="tray-title">
                  <Icon icon={ListChecks} size="small" />
                  <span>任務路由</span>
                </div>
                {hasRouting ? (
                  <Tag size="small" variant="borderless">
                    自動分類
                  </Tag>
                ) : (
                  <span className="routing-empty">尚未啟動</span>
                )}
              </div>
              {hasRouting ? (
                <div className="routing-list">
                  {routingSteps.map((step) => (
                    <div key={step.id} className="routing-item">
                      <span
                        className={`status-pill ${statusMeta[step.status]?.className || ''}`}
                      >
                        {statusMeta[step.status]?.label || '等待中'}
                      </span>
                      <span className="routing-label">{step.label}</span>
                      <span className="routing-eta">{step.eta}</span>
                    </div>
                  ))}
                </div>
              ) : null}
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
        </div>
      </div>
    </ThemeProvider>
  );
}
