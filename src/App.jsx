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
  Trash,
  Upload,
  X,
  CheckCircle2, // ✅ 新增：用於編輯模式的勾選圖示
  Circle,       // ✅ 新增：用於編輯模式的未勾選圖示
} from 'lucide-react';
// 若您本地沒有這些 txt 檔案，請註解掉下面這幾行
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

// Estimate pages based on content length
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
    tag_key: 'doc-1',
    tags: ['摘要', '納入報告'],
    content: q2Financials,
  },
  {
    id: 'doc-2',
    name: '授信條款書',
    type: 'TXT',
    pages: estimatePages(termSheet),
    tag_key: 'doc-2',
    tags: ['翻譯', '納入報告'],
    content: termSheet,
  },
  {
    id: 'doc-3',
    name: 'KYC / AML 資料包',
    type: 'TXT',
    pages: estimatePages(kycAml),
    tag_key: 'doc-3',
    tags: ['摘要', '風險掃描'],
    content: kycAml,
  },
  {
    id: 'doc-4',
    name: '擔保品估價報告',
    type: 'TXT',
    pages: estimatePages(appraisal),
    tag_key: 'doc-4',
    tags: ['翻譯'],
    content: appraisal,
  },
  {
    id: 'doc-5',
    name: '產業展望 Q2',
    type: 'TXT',
    pages: estimatePages(industryOutlook),
    tag_key: 'doc-5',
    tags: ['背景'],
    content: industryOutlook,
  },
];

const initialRoutingSteps = [];
const initialMessages = [];

const generateCaseId = () => {
  const now = new Date();
  const prefix = 'CASE';
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
};

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

const emptySummary = {
  output: summaryOutput,
  borrower: { name: '', description: '', rating: '' },
  metrics: initialSummaryMetrics,
  risks: initialRiskFlags,
};

const emptyTranslation = {
  output: translationOutput,
  clauses: initialTranslationPairs,
};

const artifactTabs = [
  { id: 'documents', label: '文件', icon: FolderOpen },
  { id: 'summary', label: '摘要', icon: FileText },
  { id: 'translation', label: '翻譯', icon: Languages },
  { id: 'memo', label: 'Credit Memo', icon: ClipboardCheck },
];

// ✅ 這裡定義了標籤的分類
const workflowTags = ['待處理', '處理中', '已完成', '需補件', '已歸檔'];
const functionTags = ['摘要', '翻譯', '納入報告', '風險掃描', '背景資料'];

const tagColors = {
  // 流程狀態 (Status)
  待處理: '#9ca3af', // 灰色 (Neutral)
  處理中: '#3b82f6', // 亮藍 (Blue)
  已完成: '#10b981', // 翠綠 (Green)
  需補件: '#ef4444', // 紅色 (Red) - 這個會很明顯！
  已歸檔: '#64748b', // 深灰 (Slate)

  // 功能標籤 (Tags)
  摘要: '#f59e0b',     // 金黃 (Amber)
  翻譯: '#06b6d4',     // 青色 (Cyan)
  納入報告: '#10b981', // 綠色 (Green)
  風險掃描: '#dc2626', // 深紅 (Dark Red) - 強調風險
  背景資料: '#8b5cf6', // 紫色 (Violet)
  背景: '#8b5cf6',
};

// ✅ 2. 新增：顏色輔助函式 (用來產生淺色背景)
const hexToRgba = (hex, alpha) => {
  if (!hex) return 'rgba(100, 116, 139, 0.1)'; // 預設灰
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const statusMeta = {
  running: { label: '進行中', className: 'is-running' },
  queued: { label: '等待中', className: 'is-queued' },
  done: { label: '完成', className: 'is-done' },
};

// ✅ Helper: 找出文件的當前狀態 (從 tags 中過濾出流程標籤)
const getDocStatus = (tags = []) => {
  return tags.find(t => workflowTags.includes(t)) || '待處理';
};

// ✅ Helper: 找出文件的功能標籤 (從 tags 中過濾掉流程標籤)
const getDocLabels = (tags = []) => {
  return tags.filter(t => !workflowTags.includes(t));
};

export default function App() {
  const [documents, setDocuments] = useState(initialDocs);
  const [selectedDocId, setSelectedDocId] = useState(initialDocs[0]?.id || '');
  const [editingDocId, setEditingDocId] = useState(null); // 修改初始值為 null
  const [customTags, setCustomTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [routingSteps, setRoutingSteps] = useState(initialRoutingSteps);
  const [messages, setMessages] = useState(initialMessages);
  const [composerText, setComposerText] = useState('');
  const [activeTab, setActiveTab] = useState('documents');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [reasoningSummary, setReasoningSummary] = useState('');

  const [caseId] = useState(() => generateCaseId());
  const [caseStartTime] = useState(() => Date.now());
  const [slaMinutes] = useState(45);
  const [ownerName, setOwnerName] = useState('RM Desk');

  const [artifacts, setArtifacts] = useState({
    summaries: [],
    translations: [],
    memo: {
      output: memoOutput,
      sections: initialMemoSections,
      recommendation: '',
      conditions: '',
    },
  });

  const [activeTranslationIndex, setActiveTranslationIndex] = useState(0);

  const persistDocTags = async (tagKey, tags) => {
    if (!tagKey) return;
    try {
      await fetch(`${apiBase || ''}/api/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_key: tagKey, tags }),
      });
    } catch (error) {
      console.warn('標籤保存失敗:', error);
    }
  };

  const persistCustomTags = async (tags) => {
    try {
      await fetch(`${apiBase || ''}/api/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_tags: tags }),
      });
    } catch (error) {
      console.warn('自定義標籤保存失敗:', error);
    }
  };

  const filteredTranslations = selectedDocId
    ? artifacts.translations.filter((item) => (item.sourceDocIds || []).includes(selectedDocId))
    : artifacts.translations;

  const filteredSummaries = selectedDocId
    ? artifacts.summaries.filter((item) => (item.sourceDocIds || []).includes(selectedDocId))
    : artifacts.summaries;

  // Load preloaded PDF documents
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
          tag_key: doc.tag_key || doc.id,
          tags: Array.isArray(doc.tags) ? doc.tags : [],
          content: doc.preview || '',
          image: '',
          image_mime: '',
          status: doc.status,
          message: doc.message,
          source: 'preloaded',
        }));
        if (pdfDocs.length > 0 && isMounted) {
          setDocuments((prev) => {
            const existingIds = new Set(prev.map((d) => d.id).filter(Boolean));
            const newDocs = pdfDocs.filter((doc) => !existingIds.has(doc.id));
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

  // Load Tags
  useEffect(() => {
    let isMounted = true;
    const loadTags = async () => {
      try {
        const response = await fetch(`${apiBase || ''}/api/tags`);
        if (!response.ok || !isMounted) return;
        const data = await response.json();
        if (Array.isArray(data.custom_tags) && isMounted) {
          setCustomTags(data.custom_tags);
        }
        const docTags = data.doc_tags || {};
        if (isMounted && docTags && typeof docTags === 'object') {
          setDocuments((prev) =>
            prev.map((doc) => {
              const tagKey = doc.tag_key || doc.id;
              const savedTags = docTags[tagKey];
              if (!Array.isArray(savedTags)) return doc;
              return { ...doc, tags: savedTags };
            })
          );
        }
      } catch (error) {
        console.warn('載入標籤失敗:', error);
      }
    };
    loadTags();
    return () => { isMounted = false; };
  }, []);

  // Ensure activeTranslationIndex is within bounds
  useEffect(() => {
    if (filteredTranslations.length === 0) {
      if (activeTranslationIndex !== 0) setActiveTranslationIndex(0);
      return;
    }
    if (activeTranslationIndex >= filteredTranslations.length) {
      setActiveTranslationIndex(filteredTranslations.length - 1);
    }
  }, [filteredTranslations.length, activeTranslationIndex]);

  const fileInputRef = useRef(null);

  const getActiveArtifact = () => {
    if (activeTab === 'documents') return { output: '' };
    if (activeTab === 'translation') {
      return filteredTranslations.length > 0
        ? filteredTranslations[activeTranslationIndex] || filteredTranslations[0]
        : emptyTranslation;
    }
    if (activeTab === 'summary') {
      return filteredSummaries.length > 0
        ? filteredSummaries[filteredSummaries.length - 1]
        : emptySummary;
    }
    return artifacts[activeTab];
  };

  const activeArtifact = getActiveArtifact();
  const hasRouting = routingSteps.length > 0;
  const latestRouting = hasRouting ? routingSteps[routingSteps.length - 1] : null;
  const latestRoutingStatus = latestRouting ? statusMeta[latestRouting.status] || null : null;
  
  const routingSummaryText = latestRouting ? (latestRouting.label || '—') : '尚未啟動';

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // ✅ 1. 處理「功能標籤」切換 (多選邏輯)
  const handleToggleLabel = (docId, tag) => {
    setDocuments((prev) => {
      let updatedTags = null;
      let tagKey = '';
      const next = prev.map((doc) => {
        if (doc.id !== docId) return doc;
        
        const currentStatus = getDocStatus(doc.tags); // 保留狀態
        const currentLabels = getDocLabels(doc.tags); // 取得現有標籤
        
        const hasTag = currentLabels.includes(tag);
        // 如果有就移除，沒有就加入
        const nextLabels = hasTag 
          ? currentLabels.filter((t) => t !== tag) 
          : [...currentLabels, tag];
          
        updatedTags = [currentStatus, ...nextLabels]; // 組合回去
        tagKey = doc.tag_key || doc.id;
        return { ...doc, tags: updatedTags };
      });
      if (updatedTags && tagKey) persistDocTags(tagKey, updatedTags);
      return next;
    });
  };

  // ✅ 2. 處理「流程狀態」變更 (單選互斥邏輯)
  const handleStatusChange = (docId, newStatus) => {
    setDocuments((prev) => {
      let updatedTags = null;
      let tagKey = '';
      const next = prev.map((doc) => {
        if (doc.id !== docId) return doc;
        
        const currentLabels = getDocLabels(doc.tags); // 保留標籤
        // 強制替換狀態
        updatedTags = [newStatus, ...currentLabels];
        tagKey = doc.tag_key || doc.id;
        
        return { ...doc, tags: updatedTags };
      });
      if (updatedTags && tagKey) persistDocTags(tagKey, updatedTags);
      return next;
    });
  };

  const handleAddCustomTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!customTags.includes(trimmed)) {
      const nextTags = [...customTags, trimmed];
      setCustomTags(nextTags);
      persistCustomTags(nextTags);
    }
    if (editingDocId) {
      handleToggleLabel(editingDocId, trimmed);
    }
    setNewTagInput('');
  };

  const handleDeleteDoc = (docId) => {
    if (!docId) return;
    if (!window.confirm(`確定要刪除嗎？`)) return;

    setDocuments((prev) => {
      const next = prev.filter((doc) => doc.id !== docId);
      if (selectedDocId === docId) setSelectedDocId(next[0]?.id || '');
      if (editingDocId === docId) setEditingDocId(null);
      return next;
    });
  };

  const handleToggleEditTags = (docId) => {
    setEditingDocId((prev) => (prev === docId ? null : docId));
  };

  // 文件上傳與後端互動邏輯 (略為簡化以保持聚焦於 UI 修復)
  const handleUploadFiles = async (event) => {
     // ... 保留您原本的上傳邏輯 ...
  };
  const handleDownloadOutput = () => { /* ... 保留原本邏輯 ... */ };
  const handleNewCase = () => { /* ... 保留原本邏輯 ... */ };
  const handleExportPackage = () => { /* ... 保留原本邏輯 ... */ };
  const handleSend = async () => { /* ... 保留原本邏輯 ... */ };

  const renderMarkdown = (value) => {
    return (
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {typeof value === 'string' ? value : ''}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <ThemeProvider customTheme={{ primaryColor: '#1f4b6e', neutralColor: '#1c1a18' }}>
      <div className="artifact-app">
        <header className="artifact-header">
          <div className="brand">
            <div className="brand-icon"><Icon icon={Landmark} size="small" /></div>
            <div>
              <Text as="h1" weight="700" className="brand-title">Credit Memo 工作台</Text>
            </div>
          </div>
          <div className="header-actions">
            <Button variant="outlined" icon={Briefcase} onClick={handleNewCase}>新增案件</Button>
            <Button type="primary" icon={FolderPlus} onClick={handleExportPackage}>匯出資料包</Button>
          </div>
        </header>

        <div className="artifact-shell">
          <section className="panel docs-panel">
            <div className="panel-header">
              <Text as="h2" weight="600" className="panel-title">文件集</Text>
              <div className="panel-actions">
                <Button icon={Upload} variant="outlined" onClick={handleUploadClick}>上傳文件</Button>
                <input ref={fileInputRef} type="file" multiple className="file-input" onChange={handleUploadFiles} />
              </div>
            </div>

            <div className="doc-tray">
              {documents.length > 0 ? (
                <div className="doc-grid">
                  {documents.map((doc) => {
                    const isEditing = editingDocId === doc.id;
                    const status = getDocStatus(doc.tags);
                    const labels = getDocLabels(doc.tags);

                    return (
                      <div
                        key={doc.id}
                        className={`doc-card${doc.id === selectedDocId ? ' is-active' : ''}`}
                        onClick={() => !isEditing && setSelectedDocId(doc.id)}
                      >
                        {/* 卡片標題列 */}
                        <div className="doc-card-row">
                          <div className="doc-title">{doc.name}</div>
                          <Tag size="small" color="blue" variant="light">{doc.type}</Tag>
                          
                          {/* 非編輯模式：顯示簡潔的狀態燈號 */}
                          {!isEditing && (
                            <div className="doc-status-badge">
                               <span className={`status-dot ${tagColors[status] || 'default'}`}></span>
                               {status}
                            </div>
                          )}

                          <ActionIcon
                            icon={isEditing ? X : Edit3}
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleEditTags(doc.id);
                            }}
                          />
                          <ActionIcon
                            icon={Trash}
                            size="small"
                            variant="outlined"
                            onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                          />
                        </div>

                        {/* 編輯模式區域 */}
                        {isEditing ? (
                          <div className="tag-editor">
                            {/* A. 流程狀態 (單選) - 選中時變實心色 */}
                            <div className="tag-section">
                              <div className="tag-section-title">流程進度</div>
                              <div className="status-selector">
                                {workflowTags.map((tag) => {
                                  const color = tagColors[tag] || '#64748b';
                                  const isSelected = status === tag;
                                  return (
                                    <button
                                      key={tag}
                                      type="button"
                                      className={`status-option${isSelected ? ' is-selected' : ''}`}
                                      onClick={() => handleStatusChange(doc.id, tag)}
                                      style={{
                                        backgroundColor: isSelected ? color : '#fff',
                                        borderColor: isSelected ? color : '#e2e8f0',
                                        color: isSelected ? '#fff' : '#64748b',
                                        fontWeight: isSelected ? 600 : 400,
                                      }}
                                    >
                                      {isSelected && <CheckCircle2 size={12} />}
                                      <span>{tag}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* B. 功能標籤 (多選) - 選中時變淺色背景+深色字 */}
                            <div className="tag-section">
                              <div className="tag-section-title">功能標籤</div>
                              <div className="tag-selector">
                                {[...functionTags, ...customTags].map((tag) => {
                                  const isSelected = labels.includes(tag);
                                  const isCustom = customTags.includes(tag);
                                  const color = tagColors[tag] || (isCustom ? '#d946ef' : '#64748b');

                                  return (
                                    <button
                                      key={tag}
                                      type="button"
                                      className={`tag-option${isSelected ? ' is-selected' : ''}`}
                                      onClick={() => handleToggleLabel(doc.id, tag)}
                                      style={{
                                        backgroundColor: isSelected ? hexToRgba(color, 0.1) : 'transparent',
                                        borderColor: isSelected ? color : '#cbd5e1',
                                        color: isSelected ? color : '#64748b',
                                        borderStyle: isSelected ? 'solid' : 'dashed',
                                        fontWeight: isSelected ? 600 : 400,
                                      }}
                                    >
                                      {isSelected ? <CheckCircle2 size={12} /> : <Circle size={12} className="tag-icon-empty" />}
                                      <span>{tag}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* C. 新增標籤 (保持不變) */}
                            <div className="tag-add">
                              <input
                                className="tag-input"
                                placeholder="新增標籤..."
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                              />
                              <ActionIcon icon={Plus} size="small" onClick={handleAddCustomTag} />
                            </div>
                          </div>
                        ) : (
                          /* 非編輯模式：只顯示標籤 */
                          <div className="doc-tags">
                            {labels.length > 0 ? labels.map((tag) => (
                              <span key={`${doc.id}-${tag}`} className="tag-pill">{tag}</span>
                            )) : <span className="doc-empty-tags">無標籤</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="doc-empty">尚未上傳文件</div>
              )}
            </div>
          </section>

          {/* ... 中間與右側 Panel (保持結構與您原檔相同) ... */}
          <section className="panel artifact-panel">
            <div className="panel-header">
               <Text as="h2" weight="600" className="panel-title">解析作業區</Text>
               <div className="panel-actions">
                 <ActionIcon icon={Download} variant="outlined" onClick={handleDownloadOutput} />
               </div>
            </div>
            <div className="tab-bar">
               {artifactTabs.map(tab => (
                 <button key={tab.id} className={`tab-button${activeTab === tab.id ? ' is-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                    <Icon icon={tab.icon} size="small" /><span>{tab.label}</span>
                 </button>
               ))}
            </div>
            <div className="artifact-stack">
               <div className="preview-card">
                  <div className="preview-canvas">
                     {activeTab === 'documents' ? (
                       <div className="preview-documents">
                          {/* 簡易預覽邏輯 */}
                          {(() => {
                            const selectedDoc = documents.find(d => d.id === selectedDocId);
                            return selectedDoc ? (
                              <>
                                <div className="doc-preview-header">
                                  <Icon icon={FileText} size="small" />
                                  <span className="doc-preview-name">{selectedDoc.name}</span>
                                </div>
                                <pre className="doc-preview-text">{selectedDoc.content}</pre>
                              </>
                            ) : <div className="doc-empty">尚未選擇</div>;
                          })()}
                       </div>
                     ) : <div className="live-markdown">{renderMarkdown(activeArtifact?.output)}</div>}
                  </div>
               </div>
            </div>
          </section>

          <section className="panel chat-panel">
             <div className="panel-header"><Text as="h2" weight="600" className="panel-title">RM 對話</Text></div>
             <div className="chat-stream">
               {messages.map(m => (
                 <div key={m.id} className={`message ${m.role === 'user' ? 'is-user' : 'is-assistant'}`}>
                   <div className="message-bubble"><p className="message-text">{m.content}</p></div>
                 </div>
               ))}
             </div>
             <div className="chat-composer">
               <TextArea value={composerText} onChange={e => setComposerText(e.target.value)} />
               <div className="composer-actions">
                 <Button type="primary" onClick={handleSend} disabled={isLoading}>送出指示</Button>
               </div>
             </div>
          </section>
        </div>
      </div>
    </ThemeProvider>
  );
}