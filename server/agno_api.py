import json
import os
import uuid
from typing import Any, Dict, List, Optional, Union

import dotenv
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from agno.agent import Agent
from agno.team import Team
from agno.models.openai import OpenAIChat

from rag_store import RagStore


# Robust .env loader to avoid parser crashes on some environments.
def _safe_load_env() -> None:
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    try:
        dotenv.load_dotenv(env_path, override=True)
    except Exception:
        # Fallback to system environment variables.
        return


_safe_load_env()

TEAM_INSTRUCTIONS = [
    "你是企業金融 RM 授信報告助理的 Team Leader，對話即是與團隊溝通。",
    "當使用者要求摘要、翻譯、授信報告或風險分析時，必須先使用 delegate_task_to_members 委派給 RAG Agent 檢索上傳文件。",
    "根據 RAG Agent 回傳的片段與對話內容產出 artifacts；資料不足時標註『內容不足，需補充』。",
    "如果使用者只是問候或一般閒聊，僅回覆 assistant.content，其餘 artifacts 欄位保持空值。",
    "回覆必須是嚴格 JSON，不可輸出 Markdown code fence 或多餘說明。",
    "summary.output 與 memo.output 用繁體中文；translation.output 與 translation.clauses[].translated 用英文。",
    "summary.risks[].level 僅能是 High、Medium、Low；routing[].status 只能是 running、queued、done。",
    "每個陣列控制在 3-6 個項目，避免過長。",
    "routing 必須反映實際執行的任務步驟，根據使用者需求動態產生：",
    "  - 若使用者要求摘要：routing 包含『檢索文件』『產生摘要』",
    "  - 若使用者要求翻譯：routing 包含『檢索文件』『翻譯條款』",
    "  - 若使用者要求報告：routing 包含『檢索文件』『產生摘要』『風險評估』『撰寫報告』",
    "  - 若只是閒聊：routing 保持空陣列 []",
    "  - 所有步驟的 status 都設為 'done'，eta 設為 '完成'",
]

EXPECTED_OUTPUT = """
{
  "assistant": { "content": "...", "bullets": ["..."] },
  "summary": {
    "output": "...",
    "borrower": { "name": "...", "description": "...", "rating": "..." },
    "metrics": [{ "label": "...", "value": "...", "delta": "..." }],
    "risks": [{ "label": "...", "level": "High" }]
  },
  "translation": {
    "output": "...",
    "clauses": [{ "section": "...", "source": "...", "translated": "..." }]
  },
  "memo": {
    "output": "...",
    "sections": [{ "title": "...", "detail": "..." }],
    "recommendation": "...",
    "conditions": "..."
  },
  "routing": [
    { "label": "檢索文件", "status": "done", "eta": "完成" },
    { "label": "產生摘要", "status": "done", "eta": "完成" }
  ]
}
""".strip()

RAG_AGENT_INSTRUCTIONS = [
    "你是文件檢索與解析專員，負責使用 RAG 搜尋上傳文件。",
    "收到任務後，先使用 search_knowledge_base 工具檢索相關片段。",
    "回覆請列出與需求最相關的摘錄與頁碼/段落資訊，避免編造。",
    "若找不到相關內容，請明確回覆『未找到相關段落』。",
]

rag_store = RagStore()


class Message(BaseModel):
    role: str
    content: str


class Document(BaseModel):
    id: Optional[str]
    name: Optional[str]
    type: Optional[str]
    pages: Optional[Union[int, str]] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    content: Optional[str] = ""


class ArtifactRequest(BaseModel):
    messages: List[Message] = Field(default_factory=list)
    documents: List[Document] = Field(default_factory=list)
    stream: bool = False


def get_model_id() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def get_model() -> OpenAIChat:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY 未設定，無法呼叫模型")
    return OpenAIChat(id=get_model_id(), api_key=api_key)


def build_doc_context(documents: List[Document]) -> str:
    if not documents:
        return "文件清單: 無。"

    lines = []
    for idx, doc in enumerate(documents, start=1):
        content = (doc.content or "").strip()
        tags = "、".join(doc.tags or []) if doc.tags else "無"
        pages = doc.pages if doc.pages not in (None, "") else "-"
        stored = rag_store.docs.get(doc.id or "") if doc.id else None
        if not content and stored and stored.preview:
            content = f"PDF 已索引（可 RAG 檢索）。預覽：{stored.preview}"
        safe_content = content[:2000] if content else "未提供"
        lines.append(
            "\n".join(
                [
                    f"{idx}. 名稱: {doc.name or '未命名'}",
                    f"   類型: {doc.type or '-'}",
                    f"   頁數: {pages}",
                    f"   標籤: {tags}",
                    f"   內容摘要: {safe_content}",
                ]
            )
        )
    return "文件清單:\n" + "\n".join(lines)


def build_conversation(messages: List[Message]) -> str:
    if not messages:
        return "對話紀錄：無。"
    parts = []
    for msg in messages[-8:]:
        parts.append(f"{msg.role}: {msg.content}")
    return "對話紀錄:\n" + "\n".join(parts)


def ensure_inline_documents_indexed(documents: List[Document]) -> None:
    for doc in documents:
        content = (doc.content or "").strip()
        if not content:
            continue
        if not doc.id:
            doc.id = str(uuid.uuid4())
        name = doc.name or doc.id
        rag_store.index_inline_text(doc.id, name, content, doc.type or "TEXT")


def build_rag_agent(doc_ids: List[str], model: OpenAIChat) -> Agent:
    def knowledge_retriever(
        query: str,
        num_documents: Optional[int] = None,
        filters: Optional[Dict[str, Any]] = None,
        dependencies: Optional[Dict[str, Any]] = None,
        **_: Any,
    ) -> Optional[List[Dict[str, Any]]]:
        ids: Optional[List[str]] = None
        if isinstance(filters, dict) and filters.get("doc_ids"):
            ids = filters.get("doc_ids")
        if dependencies and dependencies.get("doc_ids"):
            ids = dependencies.get("doc_ids")
        if not ids:
            ids = doc_ids
        return rag_store.search(query, doc_ids=ids, top_k=num_documents or 5)

    return Agent(
        name="RAG Agent",
        role="文件檢索與解析",
        model=model,
        instructions=RAG_AGENT_INSTRUCTIONS,
        knowledge_retriever=knowledge_retriever,
        search_knowledge=True,
        add_knowledge_to_context=True,
        markdown=False,
    )


def build_team(doc_ids: List[str]) -> Team:
    model = get_model()
    rag_agent = build_rag_agent(doc_ids, model)
    return Team(
        members=[rag_agent],
        model=model,
        instructions=TEAM_INSTRUCTIONS,
        expected_output=EXPECTED_OUTPUT,
        delegate_to_all_members=True,
    )


def safe_parse_json(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


app = FastAPI(title="Agno Artifacts API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def preload_sample_pdfs() -> None:
    """預加載 src/docs 目錄下的示例 PDF 文件"""
    docs_dir = os.path.join(os.path.dirname(__file__), "..", "src", "docs")
    if not os.path.isdir(docs_dir):
        return

    for filename in os.listdir(docs_dir):
        if not filename.lower().endswith(".pdf"):
            continue
        filepath = os.path.join(docs_dir, filename)
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            rag_store.index_pdf_bytes(data, filename)
            print(f"✓ 預加載 PDF: {filename}")
        except Exception as exc:
            print(f"✗ 預加載 PDF 失敗 {filename}: {exc}")


@app.on_event("startup")
async def startup_event():
    """應用啟動時預加載示例 PDF"""
    preload_sample_pdfs()


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.get("/api/documents/preloaded")
async def get_preloaded_documents():
    """獲取預加載的文檔列表"""
    documents = []
    for doc_id, stored in rag_store.docs.items():
        documents.append(
            {
                "id": stored.id,
                "name": stored.name,
                "type": stored.type,
                "pages": stored.pages or "-",
                "status": stored.status,
                "message": stored.message,
                "preview": stored.preview,
            }
        )
    return {"documents": documents}


@app.post("/api/documents")
async def upload_documents(files: List[UploadFile] = File(...)):
    if not files:
        return JSONResponse({"error": "No files provided"}, status_code=400)

    results = []
    for file in files:
        filename = file.filename or f"upload-{uuid.uuid4()}"
        ext = os.path.splitext(filename)[1].lower()
        data = await file.read()

        try:
            if ext == ".pdf":
                stored = rag_store.index_pdf_bytes(data, filename)
            elif ext in {".txt", ".md", ".csv"}:
                stored = rag_store.index_text_bytes(data, filename)
            else:
                stored = rag_store.register_stub(filename, ext.upper().lstrip(".") or "FILE", "尚未支援此格式")
        except Exception as exc:
            stored = rag_store.register_stub(filename, ext.upper().lstrip(".") or "FILE", str(exc))

        results.append(
            {
                "id": stored.id,
                "name": stored.name,
                "type": stored.type,
                "pages": stored.pages or "-",
                "status": stored.status,
                "message": stored.message,
                "preview": stored.preview,
            }
        )

    return {"documents": results}


@app.post("/api/artifacts")
async def generate_artifacts(req: ArtifactRequest):
    try:
        ensure_inline_documents_indexed(req.documents)
        doc_context = build_doc_context(req.documents)
        convo = build_conversation(req.messages)
        doc_ids = [doc.id for doc in req.documents if doc.id and doc.id in rag_store.docs]

        prompt = f"{convo}\n\n{doc_context}\n\n請依規則產出 JSON。"
        team = build_team(doc_ids)

        if req.stream:
            # Use streaming response
            response = team.run(
                prompt,
                dependencies={"doc_ids": doc_ids},
                add_dependencies_to_context=True,
                stream=True,
            )

            async def generate_sse():
                accumulated = ""
                try:
                    for chunk in response:
                        content = chunk.get_content_as_string() if hasattr(chunk, 'get_content_as_string') else str(chunk)
                        accumulated += content
                        # Send chunk to frontend
                        yield f"data: {json.dumps({'chunk': content})}\n\n"

                    # Parse and send final complete message
                    final_data = safe_parse_json(accumulated)
                    yield f"data: {json.dumps(final_data)}\n\n"
                    yield f"data: {json.dumps({'done': True})}\n\n"
                except Exception as exc:
                    yield f"data: {json.dumps({'error': str(exc)})}\n\n"

            return StreamingResponse(generate_sse(), media_type="text/event-stream")
        else:
            # Non-streaming response
            response = team.run(
                prompt,
                dependencies={"doc_ids": doc_ids},
                add_dependencies_to_context=True,
            )
            text = response.get_content_as_string()
            data: Dict[str, Any] = safe_parse_json(text)
            return data
    except Exception as exc:  # noqa: BLE001
        return {
            "error": "LLM request failed",
            "detail": str(exc),
        }
