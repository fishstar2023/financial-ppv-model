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
你是企業金融 RM 的授信報告助理。請依據對話與文件清單，產出三個 artifacts：摘要、翻譯、授信報告草稿，並提供任務路由狀態。

輸出規則：
1) 回傳內容必須是嚴格 JSON，不要額外說明或 Markdown code fence。
2) summary.output 與 memo.output 使用繁體中文；translation.output 以及 translation.clauses[].translated 使用英文。
3) summary.risks[].level 必須是 High、Medium、Low。
4) routing[].status 必須是 running、queued、done。
5) 若文件內容不足，請明確註記「內容不足，需補充」。
6) 請控制每個陣列 3-6 個項目，避免過長。

JSON 格式：
{
  "assistant": { "content": "...", "bullets": ["...", "..."] },
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
  "routing": [{ "label": "...", "status": "queued", "eta": "..." }]
}
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


async def generate_stream(prompt: str) -> AsyncGenerator[str, None]:
    """Generate streaming response using OpenAI API."""
    try:
        client = get_openai_client()
        model_id = get_model_id()

        stream = client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
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
    convo = build_conversation(req.messages)
    prompt = f"{convo}\n\n{doc_context}\n\n請依規則產出 JSON。"

    if req.stream:
        # Return streaming response
        return StreamingResponse(
            generate_stream(prompt),
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

        response = client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )

        text = response.choices[0].message.content or ""
        data: Dict[str, Any] = json.loads(text)
        return data
    except Exception as exc:
        return {
            "error": "LLM request failed",
            "detail": str(exc),
        }
