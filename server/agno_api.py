import json
import os
from typing import Any, Dict, List, Optional, Union, AsyncGenerator

import dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from openai import OpenAI

# Robust .env loader to avoid parser crashes on some environments.
def _safe_load_env() -> None:
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    try:
        dotenv.load_dotenv(env_path, override=True)
    except Exception:
        # Fallback to system environment variables.
        return


_safe_load_env()

SYSTEM_PROMPT = """
你是企業金融 RM 的授信報告助理。根據用戶的對話需求，靈活回應：

**判斷用戶意圖：**
- 如果用戶只是問候（如「hi」、「你好」）或普通對話，在 assistant.content 中自然回應，artifacts 欄位留空即可
- 只有當用戶明確要求分析、摘要、翻譯、產生報告時，才產出完整的 artifacts 內容
- 識別關鍵詞：「請摘要」、「分析」、「翻譯」、「產生報告」、「評估風險」等

**輸出規則：**
1) 回傳內容必須是嚴格 JSON，不要額外說明或 Markdown code fence
2) summary.output 與 memo.output 使用繁體中文；translation.output 以及 translation.clauses[].translated 使用英文
3) summary.risks[].level 必須是 High、Medium、Low
4) routing[].status 必須是 running、queued、done
5) 若文件內容不足，請明確註記「內容不足，需補充」
6) 每個陣列控制在 3-6 個項目

**JSON 格式：**
{
  "assistant": { "content": "你的回應內容", "bullets": ["可選的要點列表"] },
  "summary": {
    "output": "摘要 markdown（如不需要則留空字串）",
    "borrower": { "name": "", "description": "", "rating": "" },
    "metrics": [],
    "risks": []
  },
  "translation": {
    "output": "翻譯 markdown（如不需要則留空字串）",
    "clauses": []
  },
  "memo": {
    "output": "報告 markdown（如不需要則留空字串）",
    "sections": [],
    "recommendation": "",
    "conditions": ""
  },
  "routing": []
}

**範例：**
用戶：「hi 你好」
回應：{"assistant": {"content": "你好！我是授信報告助理，可以協助您產生摘要、翻譯條款、或撰寫授信報告。請告訴我需要什麼協助？", "bullets": []}, "summary": {"output": "", "borrower": {"name": "", "description": "", "rating": ""}, "metrics": [], "risks": []}, "translation": {"output": "", "clauses": []}, "memo": {"output": "", "sections": [], "recommendation": "", "conditions": ""}, "routing": []}

用戶：「請產生摘要和翻譯」
回應：產出完整的 summary、translation 等 artifacts 內容
""".strip()


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


def build_doc_context(documents: List[Document]) -> str:
    if not documents:
        return "文件清單: 無。"

    lines = []
    for idx, doc in enumerate(documents, start=1):
        content = (doc.content or "").strip()
        safe_content = content[:2000] if content else "未提供"
        tags = "、".join(doc.tags or []) if doc.tags else "無"
        pages = doc.pages if doc.pages not in (None, "") else "-"
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


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY 未設定，無法呼叫模型")
    return OpenAI(api_key=api_key)


def get_model_id() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


app = FastAPI(title="Agno Artifacts API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"ok": True}


async def generate_stream(messages: List[Dict[str, str]], doc_context: str) -> AsyncGenerator[str, None]:
    """Generate streaming response using OpenAI API."""
    try:
        client = get_openai_client()
        model_id = get_model_id()

        # Build full message list with system prompt and conversation history
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add conversation history
        for msg in messages:
            full_messages.append({"role": msg["role"], "content": msg["content"]})

        # Append document context to the last user message (or create new one)
        if full_messages and full_messages[-1]["role"] == "user":
            full_messages[-1]["content"] += f"\n\n{doc_context}\n\n請依規則產出 JSON。"
        else:
            full_messages.append({"role": "user", "content": f"{doc_context}\n\n請依規則產出 JSON。"})

        stream = client.chat.completions.create(
            model=model_id,
            messages=full_messages,
            stream=True,
        )

        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                # Send as SSE format
                yield f"data: {json.dumps({'chunk': content})}\n\n"

        # Send done signal
        yield f"data: {json.dumps({'done': True})}\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'error': str(exc)})}\n\n"


@app.post("/api/artifacts")
async def generate_artifacts(req: ArtifactRequest):
    doc_context = build_doc_context(req.documents)

    # Convert messages to dict format
    messages = [{"role": msg.role, "content": msg.content} for msg in req.messages]

    if req.stream:
        # Return streaming response
        return StreamingResponse(
            generate_stream(messages, doc_context),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # Non-streaming response (original behavior)
    try:
        client = get_openai_client()
        model_id = get_model_id()

        # Build full message list
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in messages:
            full_messages.append(msg)

        # Append document context to the last user message
        if full_messages and full_messages[-1]["role"] == "user":
            full_messages[-1]["content"] += f"\n\n{doc_context}\n\n請依規則產出 JSON。"
        else:
            full_messages.append({"role": "user", "content": f"{doc_context}\n\n請依規則產出 JSON。"})

        response = client.chat.completions.create(
            model=model_id,
            messages=full_messages,
        )

        text = response.choices[0].message.content or ""
        data: Dict[str, Any] = json.loads(text)
        return data
    except Exception as exc:
        return {
            "error": "LLM request failed",
            "detail": str(exc),
        }
