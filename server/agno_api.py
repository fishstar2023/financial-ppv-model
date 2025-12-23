import json
import os
import uuid
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Union, Literal

import dotenv
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from agno.agent import Agent
from agno.team import Team
from agno.models.openai import OpenAIChat
from agno.models.openai.responses import OpenAIResponses

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
    "你是企業金融 RM（Relationship Manager）授信報告助理，專精於企業授信分析、風險評估與金融市場研究。",
    "你可以與使用者自然對話，回答授信、金融、企業分析相關問題。",
    "",
    "【重要】根據使用者意圖選擇回覆模式：",
    "1. 問候/閒聊（如 hi, hello, 你好）→ 使用「簡單模式」",
    "2. 需要文件分析（如 摘要、翻譯、報告）→ 使用「完整模式」並委派 RAG Agent（文件檢索）",
    "3. 需要市場/即時資訊（企業、產業、新聞、股市、總經事件）→ 使用「完整模式」並委派 Web Research Agent，必須使用 web_search 工具先查後答，不可直接拒絕。",
    "4. 使用者提供截圖/照片/影像 → 委派 Vision Agent 讀圖與 OCR，並回傳重點與文字內容。",
    "",
    "【簡單模式】僅填充 assistant.content，其他欄位必須為空或空陣列：",
    '{"assistant": {"content": "你好！有什麼可以幫助你的嗎？", "bullets": []}, "summary": {"output": "", "borrower": null, "metrics": [], "risks": []}, "translation": {"output": "", "clauses": []}, "memo": {"output": "", "sections": [], "recommendation": "", "conditions": ""}, "routing": []}',
    "",
    "【完整模式】填充相關 artifacts 並記錄 routing 步驟",
    "",
    "【JSON 格式要求】",
    "- 回覆必須是嚴格 JSON，不可輸出 Markdown code fence 或多餘說明",
    "- summary.output 與 memo.output 用繁體中文",
    "- translation.output 與 translation.clauses[].translated 用英文",
    "- summary.risks[].level 僅能是 High、Medium、Low",
    "- routing[].status 只能是 done（完成後才回傳）",
    "- routing 只在使用工具時記錄，閒聊必須為 []",
]

EXPECTED_OUTPUT = """
簡單模式範例（問候/閒聊）：
{
  "assistant": { "content": "你好！我是授信報告助理，可以協助您進行企業授信分析、文件摘要、翻譯等工作。有什麼我能幫忙的嗎？", "bullets": [] },
  "summary": { "output": "", "borrower": null, "metrics": [], "risks": [] },
  "translation": { "output": "", "clauses": [] },
  "memo": { "output": "", "sections": [], "recommendation": "", "conditions": "" },
  "routing": []
}

完整模式範例（文件分析/市場查詢）：
{
  "assistant": { "content": "已完成文件摘要分析", "bullets": ["識別借款人資訊", "分析財務指標", "評估風險等級"] },
  "summary": {
    "output": "## 摘要內容...",
    "borrower": { "name": "公司名稱", "description": "簡介", "rating": "A+" },
    "metrics": [{ "label": "營收", "value": "100M", "delta": "+10%" }],
    "risks": [{ "label": "市場風險", "level": "Medium" }]
  },
  "translation": { "output": "", "clauses": [] },
  "memo": { "output": "", "sections": [], "recommendation": "", "conditions": "" },
  "routing": [
    { "label": "啟用 web_search 查詢最新資訊", "status": "done", "eta": "完成" },
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


class SystemContext(BaseModel):
    """系統當前狀態資訊"""
    case_id: Optional[str] = None
    owner_name: Optional[str] = None
    has_summary: bool = False
    has_translation: bool = False
    has_memo: bool = False
    translation_count: int = 0


class RouteDecision(BaseModel):
    mode: Literal["simple", "full"] = "full"
    needs_web_search: bool = False
    needs_rag: bool = False
    needs_vision: bool = False
    reason: Optional[str] = None


class ArtifactRequest(BaseModel):
    messages: List[Message] = Field(default_factory=list)
    documents: List[Document] = Field(default_factory=list)
    stream: bool = False
    system_context: Optional[SystemContext] = None


def get_model_id() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


WEB_SEARCH_TOOL = {"type": "web_search_preview"}


def get_model(
    enable_web_search: bool = False,
    enable_vision: bool = False,
    model_id: Optional[str] = None,
) -> Any:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY 未設定，無法呼叫模型")

    model_name = model_id or get_model_id()

    # Use Responses API when web search is required
    if enable_web_search:
        return OpenAIResponses(id=model_name, api_key=api_key)

    kwargs: Dict[str, Any] = {"id": model_name, "api_key": api_key}
    if enable_vision:
        kwargs["modalities"] = ["text", "image"]

    return OpenAIChat(**kwargs)


def get_research_model_id() -> str:
    return os.getenv("OPENAI_RESEARCH_MODEL", get_model_id())


def get_router_model_id() -> str:
    return os.getenv("OPENAI_ROUTER_MODEL", get_model_id())


def build_system_status(
    documents: List[Document], system_context: Optional[SystemContext]
) -> str:
    """構建系統當前狀態摘要，讓 LLM 了解系統中已有哪些資料"""
    lines = []

    # 案件資訊
    if system_context:
        if system_context.case_id:
            lines.append(f"【案件編號】{system_context.case_id}")
        if system_context.owner_name:
            lines.append(f"【負責人】{system_context.owner_name}")

    # 文件清單
    if documents:
        doc_list = []
        for idx, doc in enumerate(documents, start=1):
            pages = doc.pages if doc.pages not in (None, "") else "-"
            tags = f" (標籤: {', '.join(doc.tags)})" if doc.tags else ""
            doc_list.append(f"  {idx}. {doc.name or '未命名'} [{doc.type or 'FILE'}] - {pages}頁{tags}")
        lines.append(f"【已上傳文件】共 {len(documents)} 份:")
        lines.extend(doc_list)
    else:
        lines.append("【已上傳文件】無")

    # Artifacts 狀態
    if system_context:
        artifact_status = []
        if system_context.has_summary:
            artifact_status.append("摘要")
        if system_context.translation_count > 0:
            artifact_status.append(f"翻譯 ({system_context.translation_count} 份)")
        if system_context.has_memo:
            artifact_status.append("授信報告")

        if artifact_status:
            lines.append(f"【已產生 Artifacts】{', '.join(artifact_status)}")
        else:
            lines.append("【已產生 Artifacts】無")

    return "\n".join(lines)


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
    for msg in messages:
        content = (msg.content or "").strip()
        if not content:
            continue
        parts.append(f"{msg.role}: {content}")
    return "對話紀錄:\n" + "\n".join(parts) if parts else "對話紀錄：無。"


def get_last_user_message(messages: List[Message]) -> str:
    for msg in reversed(messages or []):
        content = (msg.content or "").strip()
        if msg.role == "user" and content:
            return content
    return ""


def build_empty_response(message: str) -> Dict[str, Any]:
    return {
        "assistant": {"content": message, "bullets": []},
        "summary": {
            "output": "",
            "borrower": {"name": "", "description": "", "rating": ""},
            "metrics": [],
            "risks": [],
        },
        "translation": {"output": "", "clauses": []},
        "memo": {
            "output": "",
            "sections": [],
            "recommendation": "",
            "conditions": "",
        },
        "routing": [],
    }


def build_smalltalk_agent(
    documents: List[Document],
    system_context: Optional[SystemContext],
) -> Agent:
    system_status = build_system_status(documents, system_context)
    return Agent(
        name="ChitChat",
        role="簡短且親切的 RM 助理，僅做寒暄或確認需求，不要主動生成報告。",
        model=get_model(),
        instructions=[
            "你是授信報告助理，可以協助企業授信分析、文件摘要、翻譯等工作。",
            "請參考對話紀錄延續脈絡，避免忽略先前內容。",
            "當用戶詢問「目前有哪些文件」或「系統狀態」時，請根據下方系統狀態資訊回答。",
            "保持一句或兩句的自然回應，確認需求即可。",
            "不要承諾開始產出報告或摘要；請詢問使用者需要什麼協助。",
            "語氣友善、簡潔，避免冗長。",
            "",
            f"【系統當前狀態】\n{system_status}",
        ],
        markdown=False,
    )


def build_router_agent(
    documents: List[Document],
    system_context: Optional[SystemContext],
) -> Agent:
    system_status = build_system_status(documents, system_context)
    return Agent(
        name="Router",
        role="判斷使用者需求要走哪種處理模式",
        model=get_model(model_id=get_router_model_id()),
        instructions=[
            "你是路由器，負責判斷是否需要簡單回覆或完整處理。",
            "請輸出 JSON，符合 schema：",
            '{ "mode": "simple|full", "needs_web_search": true|false, "needs_rag": true|false, "needs_vision": true|false, "reason": "簡短原因" }',
            "僅在問候/寒暄/致謝且不需要工具時才回 simple。",
            "若需要最新/外部資訊 → needs_web_search = true。",
            "若需要讀取或摘要/翻譯使用者上傳文件 → needs_rag = true。",
            "若需要解析影像/截圖/掃描件 → needs_vision = true。",
            "不允許輸出多餘文字，只能輸出 JSON。",
            "",
            f"【系統當前狀態】\n{system_status}",
        ],
        markdown=False,
    )


def build_smalltalk_prompt(messages: List[Message]) -> str:
    convo = build_conversation(messages)
    last_user = get_last_user_message(messages)
    if last_user:
        return f"{convo}\n\n使用者最新訊息：{last_user}\n\n請根據對話紀錄簡短回覆。"
    return f"{convo}\n\n請簡短回覆。"


def run_smalltalk_agent(
    messages: List[Message],
    documents: List[Document],
    system_context: Optional[SystemContext],
) -> str:
    """Use a lightweight chat agent to handle greetings/smalltalk via Agno."""
    agent = build_smalltalk_agent(documents, system_context)
    try:
        prompt = build_smalltalk_prompt(messages)
        resp = agent.run(prompt)
        return resp.get_content_as_string()
    except Exception:
        # fallback to static short response
        return "你好！我是授信報告助理，可以協助摘要、翻譯、風險評估與授信報告草稿。請告訴我需要什麼協助？"


def run_router_agent(
    messages: List[Message],
    documents: List[Document],
    system_context: Optional[SystemContext],
) -> Optional[RouteDecision]:
    if not messages:
        return None
    try:
        router = build_router_agent(documents, system_context)
        convo = build_conversation(messages)
        prompt = f"{convo}\n\n請判斷路由並輸出 JSON。"
        resp = router.run(prompt, output_schema=RouteDecision)
        content = getattr(resp, "content", None)
        if isinstance(content, RouteDecision):
            return content
        if isinstance(content, dict):
            return RouteDecision(**content)
        text = resp.get_content_as_string()
        if text:
            return RouteDecision.model_validate_json(text)
    except Exception:
        return None
    return None


def extract_stream_text(event: Any) -> Optional[str]:
    event_name = getattr(event, "event", "") or ""
    if event_name in {
        "TeamRunContent",
        "TeamRunIntermediateContent",
        "RunContent",
        "RunIntermediateContent",
    }:
        content = getattr(event, "content", None)
        if content is None:
            return None
        if isinstance(content, str):
            return content
        try:
            return json.dumps(content, ensure_ascii=False)
        except TypeError:
            return str(content)
    return None


def iter_stream_chunks(response: Any) -> Iterator[str]:
    saw_delta = False
    for event in response:
        delta = extract_stream_text(event)
        if delta:
            saw_delta = True
            yield delta
            continue
        if hasattr(event, "get_content_as_string") and not saw_delta:
            content = event.get_content_as_string()
            if content:
                yield content


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


def build_research_agent() -> Agent:
    model = get_model(enable_web_search=True, model_id=get_research_model_id())
    return Agent(
        name="Web Research Agent",
        role="網路檢索與深度研究",
        model=model,
        instructions=[
            "遇到需要即時新聞、市場、總經或網路資訊時，必須執行 web_search 並給出引用來源。",
            "可進行多輪搜尋與歸納，避免主觀推測，缺資料時請說明。",
        ],
        tools=[WEB_SEARCH_TOOL],
        search_knowledge=True,
        add_knowledge_to_context=True,
        markdown=False,
    )


def build_vision_agent() -> Agent:
    model = get_model(enable_vision=True)
    return Agent(
        name="Vision Agent",
        role="影像/截圖理解與OCR",
        model=model,
        instructions=[
            "專注於解析上傳的截圖、照片或文件圖片，描述關鍵內容與文字。",
            "若沒有影像可讀，請要求使用者提供圖片或確認格式。",
        ],
        markdown=False,
    )


def build_team(doc_ids: List[str], enable_web_search: bool = False) -> Team:
    model = get_model(enable_web_search=enable_web_search)
    rag_agent = build_rag_agent(doc_ids, get_model())
    research_agent = build_research_agent()
    vision_agent = build_vision_agent()
    return Team(
        name="授信報告助理",
        members=[rag_agent, research_agent, vision_agent],
        model=model,
        instructions=TEAM_INSTRUCTIONS,
        expected_output=EXPECTED_OUTPUT,
        tools=[WEB_SEARCH_TOOL] if enable_web_search else [],
        add_member_tools_to_context=True,
        add_name_to_context=True,
        add_datetime_to_context=True,
        delegate_to_all_members=False,  # Team Leader decides when to delegate
        markdown=False,
    )


def safe_parse_json(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
        # Return a fallback response if JSON parsing fails
        return build_empty_response(f"抱歉，處理過程中發生問題。原始回應：{text[:200]}...")


app = FastAPI(title="Agno Artifacts API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
    "Transfer-Encoding": "chunked",
}


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


@app.get("/api/documents/preloaded")
async def get_preloaded_documents():
    docs_dir = Path(__file__).resolve().parent.parent / "src" / "docs"
    if not docs_dir.exists():
        return {"documents": []}

    results = []
    for file_path in docs_dir.glob("*.pdf"):
        try:
            data = file_path.read_bytes()
            stored = rag_store.index_pdf_bytes(data, file_path.name)
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
        except Exception as exc:
            results.append(
                {
                    "id": str(uuid.uuid4()),
                    "name": file_path.stem,
                    "type": "PDF",
                    "pages": "-",
                    "status": "failed",
                    "message": str(exc),
                    "preview": "",
                }
            )

    return {"documents": results}


@app.post("/api/artifacts")
async def generate_artifacts(req: ArtifactRequest):
    try:
        last_user = get_last_user_message(req.messages)
        route = run_router_agent(req.messages, req.documents, req.system_context)
        if route and route.mode == "simple":
            # Return SSE format if streaming is requested
            if req.stream:
                agent = build_smalltalk_agent(req.documents, req.system_context)
                smalltalk_prompt = build_smalltalk_prompt(req.messages)
                response = agent.run(smalltalk_prompt or "你好", stream=True, stream_events=True)

                async def generate_smalltalk_sse():
                    accumulated = ""
                    try:
                        for chunk in iter_stream_chunks(response):
                            accumulated += chunk
                            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

                        final_data = build_empty_response(
                            accumulated
                            or "你好！我是授信報告助理，可以協助摘要、翻譯、風險評估與授信報告草稿。"
                        )
                        yield f"data: {json.dumps(final_data)}\n\n"
                    except Exception as exc:
                        error_response = build_empty_response(f"處理過程中發生錯誤：{str(exc)}")
                        yield f"data: {json.dumps(error_response)}\n\n"
                    yield f"data: {json.dumps({'done': True})}\n\n"

                return StreamingResponse(
                    generate_smalltalk_sse(),
                    media_type="text/event-stream",
                    headers=SSE_HEADERS,
                )

            reply = run_smalltalk_agent(
                req.messages, req.documents, req.system_context
            )
            response_data = build_empty_response(reply)
            return response_data

        ensure_inline_documents_indexed(req.documents)
        doc_context = build_doc_context(req.documents)
        convo = build_conversation(req.messages)
        doc_ids = [doc.id for doc in req.documents if doc.id and doc.id in rag_store.docs]

        # Add system status to prompt for Team
        system_status = build_system_status(req.documents, req.system_context)
        prompt = f"{convo}\n\n{system_status}\n\n{doc_context}\n\n請依規則產出 JSON。"
        use_web_search = bool(route and route.needs_web_search)
        team = build_team(doc_ids, enable_web_search=use_web_search)
        if use_web_search:
            team.tool_choice = WEB_SEARCH_TOOL

        if req.stream:
            # True token streaming from LLM
            response = team.run(
                prompt,
                dependencies={"doc_ids": doc_ids},
                add_dependencies_to_context=True,
                stream=True,
                stream_events=True,
            )

            async def generate_sse():
                accumulated = ""
                try:
                    for content in iter_stream_chunks(response):
                        if not content:  # Skip empty content
                            continue
                        accumulated += content
                        yield f"data: {json.dumps({'chunk': content})}\n\n"

                    # Parse and send final complete message
                    if accumulated:
                        final_data = safe_parse_json(accumulated)
                        yield f"data: {json.dumps(final_data)}\n\n"
                    else:
                        # No content accumulated, send fallback response
                        fallback = build_empty_response("抱歉，我無法完成這個請求。請稍後再試。")
                        yield f"data: {json.dumps(fallback)}\n\n"
                except Exception as exc:
                    error_response = build_empty_response(f"處理過程中發生錯誤：{str(exc)}")
                    yield f"data: {json.dumps(error_response)}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"

            return StreamingResponse(
                generate_sse(),
                media_type="text/event-stream",
                headers=SSE_HEADERS,
            )
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
