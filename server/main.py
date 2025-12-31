import json
import os
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# 匯入 Agent 功能
from extraction_agent import extract_ppv
from impersonation_agent import chat_with_digital_twin
from generator_agent import generate_diverse_personas
from ppv_schema import PPVInstance

# 載入環境變數
load_dotenv()

app = FastAPI()

# 1. 修改存檔邏輯：支援「更新」
def save_db(new_personas: List[PPVInstance]):
    all_data = load_db()
    
    # 建立一個 ID 對照表 (Dictionary)
    data_map = {p.id: p for p in all_data}
    
    # 更新或新增資料
    for p in new_personas:
        data_map[p.id] = p  # 如果 ID 存在就覆蓋 (更新)，不存在就新增
    
    # 轉回 List 並存檔
    updated_list = list(data_map.values())
    
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json_data = [p.model_dump() for p in updated_list]
        json.dump(json_data, f, ensure_ascii=False, indent=2)

# --- 設定 CORS (允許前端連線) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 資料庫設定 (Persistence) ---
DB_FILE = Path("server/personas.json")

def load_db() -> List[PPVInstance]:
    """從 JSON 檔案讀取所有客戶資料"""
    if not DB_FILE.exists():
        return []
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [PPVInstance(**item) for item in data]
    except Exception as e:
        print(f"讀取資料庫失敗: {e}")
        return []

def save_db(new_personas: List[PPVInstance]):
    """將新生成的客戶寫入 JSON 檔案 (附加模式)"""
    all_data = load_db()
    
    # 避免重複 ID (簡單檢查)
    existing_ids = {p.id for p in all_data}
    for p in new_personas:
        if p.id not in existing_ids:
            all_data.append(p)
    
    with open(DB_FILE, "w", encoding="utf-8") as f:
        # 將 Pydantic 物件轉為 dict 存檔
        json_data = [p.model_dump() for p in all_data]
        json.dump(json_data, f, ensure_ascii=False, indent=2)

# --- 定義請求格式 (Request Models) ---
# 重要：這些必須定義在 API 函式之前！

class ExtractRequest(BaseModel):
    chat_log: str
    user_id: str = "user_default"

class ChatRequest(BaseModel):
    ppv_profile: PPVInstance
    user_query: str

class GenerateRequest(BaseModel):
    hint: str = "General public"
    count: int = 3

# --- API 1: 提取人格 (Phase 2) ---
@app.post("/api/extract_ppv", response_model=PPVInstance)
def api_extract_ppv(request: ExtractRequest):
    print(f"收到提取請求: {request.user_id}")
    result = extract_ppv(request.chat_log, request.user_id)
    if not result:
        raise HTTPException(status_code=500, detail="提取失敗")
    return result

# ✅ 新增這個 API：讓前端可以上傳「剛訪談完」的資料
@app.post("/api/update_persona")
def api_update_persona(persona: PPVInstance):
    save_db([persona]) # 呼叫存檔函式
    return {"status": "updated", "id": persona.id}
# --- API 2: 數位孿生對話 (Phase 3) ---
@app.post("/api/chat_with_twin")
def api_chat_with_twin(request: ChatRequest):
    # print(f"收到對話請求: {request.user_query}") 
    try:
        response_text = chat_with_digital_twin(request.ppv_profile, request.user_query)
        return {"response": response_text}
    except Exception as e:
        print(f"對話錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- API 3: 生成多元虛擬客戶 (Phase 4 Generation) ---
@app.post("/api/generate_personas")
def api_generate_personas(req: GenerateRequest):
    print(f"收到生成請求: {req.hint} (x{req.count})")
    results = generate_diverse_personas(req.hint, req.count)
    
    if results:
        save_db(results) # 自動存檔
        return results
    else:
        raise HTTPException(status_code=500, detail="生成失敗")

# --- API 4: 取得/刪除 歷史客戶資料 (Persistence) ---
@app.get("/api/personas")
def api_get_personas():
    return load_db()

@app.delete("/api/personas")
def api_clear_personas():
    if DB_FILE.exists():
        os.remove(DB_FILE)
    return {"status": "cleared"}

# --- 啟動入口 ---
if __name__ == "__main__":
    import uvicorn
    print("啟動 API 伺服器中... (http://localhost:8000)")
    uvicorn.run(app, host="0.0.0.0", port=8000)