import json
import os
from typing import Any, Dict, List, Optional

import dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agno.agent import Agent
from agno.models.openai import OpenAIChat

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
    pages: Optional[int]
    tags: Optional[List[str]] = Field(default_factory=list)
    content: Optional[str] = ""


class ArtifactRequest(BaseModel):
    messages: List[Message] = Field(default_factory=list)
    documents: List[Document] = Field(default_factory=list)


def build_doc_context(documents: List[Document]) -> str:
    if not documents:
        return "文件清單: 無。"

    lines = []
    for idx, doc in enumerate(documents, start=1):
        content = (doc.content or "").strip()
        safe_content = content[:2000] if content else "未提供"
        tags = "、".join(doc.tags or []) if doc.tags else "無"
        lines.append(
            "\n".join(
                [
                    f"{idx}. 名稱: {doc.name or '未命名'}",
                    f"   類型: {doc.type or '-'}",
                    f"   頁數: {doc.pages or '-'}",
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


def get_agent() -> Agent:
    api_key = os.getenv("OPENAI_API_KEY")
    model_id = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY 未設定，無法呼叫模型")
    model = OpenAIChat(id=model_id, api_key=api_key)
    return Agent(
        model=model,
        system_message=SYSTEM_PROMPT,
        markdown=False,
    )


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


@app.post("/api/artifacts")
async def generate_artifacts(req: ArtifactRequest):
    try:
        agent = get_agent()
    except RuntimeError as exc:
        return {"error": str(exc)}

    doc_context = build_doc_context(req.documents)
    convo = build_conversation(req.messages)
    prompt = f"{convo}\n\n{doc_context}\n\n請依規則產出 JSON。"

    try:
        result = agent.run(prompt)
        text = result.get_content_as_string()
        data: Dict[str, Any] = json.loads(text)
        return data
    except Exception as exc:  # noqa: BLE001
        return {
            "error": "LLM request failed",
            "detail": str(exc),
        }
