# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LobeChat-based prototype for enterprise banking RM credit approval workflows. Uses Claude Artifacts-style UI with dual-pane layout: left side for conversation/document management, right side for live preview of generated artifacts (summaries, translations, credit reports).

**Tech Stack:**
- Frontend: React 19 + Vite + @lobehub/ui + Ant Design
- Backend: Python FastAPI + Agno (agent framework) + OpenAI API
- Rendering: ReactMarkdown with remark-gfm for live Markdown preview

## Development Commands

### Initial Setup
```bash
# 1. Create .env file (see .env.example)
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# 2. Create Python virtual environment and install dependencies
python3 -m venv .venv
. .venv/bin/activate
pip install -r server/requirements.txt

# 3. Install frontend dependencies
npm install
```

### Running the Application
```bash
# Terminal 1: Start backend API (Agno + OpenAI)
npm run dev:api
# Equivalent: PYTHONPATH=server .venv/bin/uvicorn server.agno_api:app --reload --host 0.0.0.0 --port 8787

# Terminal 2: Start frontend dev server (host/port configured in vite.config.js)
npm run dev

# Access at: http://127.0.0.1:5176/
```

### Production Build
```bash
npm run build
npm run preview
```

## Architecture

### Data Flow
1. User uploads documents and sends instructions via left panel
2. Frontend sends POST to `/api/artifacts` with:
   - `messages[]`: conversation history (role, content)
   - `documents[]`: uploaded files with metadata and text content
3. Backend (Agno agent) processes request through OpenAI
4. Returns strict JSON with three artifacts + routing status
5. Frontend updates right panel with live Markdown preview

### Key Files
- [src/App.jsx](src/App.jsx): Single-file frontend component (850+ lines)
  - Manages all state: documents, messages, artifacts, routing steps
  - Handles file uploads, API calls, Markdown rendering
  - Three artifact tabs: summary (摘要), translation (翻譯), memo (授信報告)
- [server/agno_api.py](server/agno_api.py): FastAPI backend with single `/api/artifacts` endpoint
  - Uses Agno Agent with OpenAI model (configured via env vars)
  - System prompt defines strict JSON output schema
  - Builds context from last 8 messages + first 2000 chars of each document
- [src/docs/](src/docs/): Static sample documents (.txt files) imported at build time

### Critical JSON Schema
Backend must return JSON matching this exact structure. The system prompt now intelligently handles both casual conversation and formal artifact generation based on user intent (see [agno_api.py:24-68](server/agno_api.py#L24-L68)):
```json
{
  "assistant": { "content": "...", "bullets": ["..."] },
  "summary": {
    "output": "markdown string",
    "borrower": { "name": "...", "description": "...", "rating": "..." },
    "metrics": [{ "label": "...", "value": "...", "delta": "..." }],
    "risks": [{ "label": "...", "level": "High|Medium|Low" }]
  },
  "translation": {
    "output": "markdown string",
    "clauses": [{ "section": "...", "source": "...", "translated": "..." }]
  },
  "memo": {
    "output": "markdown string",
    "sections": [{ "title": "...", "detail": "..." }],
    "recommendation": "...",
    "conditions": "..."
  },
  "routing": [{ "label": "...", "status": "running|queued|done", "eta": "..." }]
}
```

### Important Constraints
- **Document content**: PDF/DOCX files are NOT auto-parsed. Users must paste key text into "文件內容" field for accurate results.
- **Risk levels**: Must be exactly "High", "Medium", or "Low" (case-sensitive). Frontend normalizes via [normalizeRiskLevel](src/App.jsx#L192-L203).
- **Markdown safety**: Non-string outputs are JSON.stringify'd before rendering ([renderMarkdown](src/App.jsx#L401-L416)).
- **API base URL**: Uses `VITE_API_URL` from .env; if not set, falls back to Vite dev proxy (`/api` → `http://localhost:8787`, see [vite.config.js:10-12](vite.config.js#L10-L12)).
- **Context limits**: Backend truncates document content to 2000 chars, uses last 8 messages only.

### State Management
All state lives in [App.jsx](src/App.jsx) via useState hooks:
- `documents`: uploaded files + initial sample docs
- `artifacts`: nested object with summary/translations[]/memo data
  - `translations` is an array to preserve history of all translation tasks
  - Each translation has: `{id, timestamp, title, output, clauses}`
- `activeTranslationIndex`: tracks which translation version is currently displayed
- `routingSteps`: task status visualization
- `messages`: chat history
- `isLoading`: controls UI state during API calls

### UI Components
Uses @lobehub/ui (LobeHub design system):
- `ThemeProvider`: Custom primary/neutral colors ([App.jsx:419-424](src/App.jsx#L419-L424))
- `TextArea`, `Button`, `ActionIcon`, `Tag`, `Icon`: UI primitives
- Icons from lucide-react
- Custom CSS in [src/styles.css](src/styles.css) for dual-pane layout

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY`: OpenAI API key for backend
- `OPENAI_MODEL`: Model ID (default: gpt-4o-mini)
- `PORT`: Backend server port (default: 8787)
- `VITE_API_URL`: Frontend API endpoint (optional, defaults to Vite proxy)

## Development Notes

- Frontend is a single large component - consider extracting panels/tabs if adding major features
- Backend supports SSE streaming via `stream: true` parameter - frontend displays real-time typewriter effect
- System prompt intelligently distinguishes casual conversation from formal artifact requests - only generates full artifacts when explicitly requested
- Conversation history is preserved in full message format (not compressed to string) for proper context understanding
- **Translation history**: Multiple translation requests create separate sub-tabs (翻譯 #1, #2, #3...) - all previous translations are preserved and accessible
- Sample documents in [src/docs/](src/docs/) are imported as raw text via Vite's `?raw` import
- File uploads only extract text content from text/* files and .txt/.md/.csv extensions
- Error handling shows errors in chat composer area ([App.jsx:633](src/App.jsx#L633))
