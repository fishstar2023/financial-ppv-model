import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# 匯入 Agent 功能
from extraction_agent import extract_ppv
from impersonation_agent import chat_with_digital_twin
from generator_agent import generate_diverse_personas
from ppv_schema import PPVInstance
from vietnam_interview_agent import interview_vietnam_persona
from vietnam_generator_agent import generate_vietnam_personas

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
VIETNAM_DB_FILE = Path("server/vietnam_personas.json")

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
    context_data: Optional[str] = None

class GenerateRequest(BaseModel):
    hint: str = "General public"
    count: int = 3

# --- 越南訪談專用 Request Models ---
class VietnamInterviewRequest(BaseModel):
    persona: Dict[str, Any]
    question: str
    subQuestions: List[str] = []

# --- 越南訪談資料庫函式 ---
def load_vietnam_db() -> List[Dict[str, Any]]:
    """從 JSON 檔案讀取越南訪談資料"""
    if not VIETNAM_DB_FILE.exists():
        return []
    try:
        with open(VIETNAM_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"讀取越南資料庫失敗: {e}")
        return []

def save_vietnam_db(persona: Dict[str, Any]):
    """儲存/更新越南訪談資料"""
    all_data = load_vietnam_db()

    # 建立 ID 對照表
    data_map = {p.get('id'): p for p in all_data}

    # 更新或新增
    data_map[persona.get('id')] = persona

    # 存檔
    with open(VIETNAM_DB_FILE, "w", encoding="utf-8") as f:
        json.dump(list(data_map.values()), f, ensure_ascii=False, indent=2)

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
    try:
        # 呼叫我們剛升級的 Agent
        response_text = chat_with_digital_twin(
            request.ppv_profile, 
            request.user_query, 
            request.context_data # ✅ 把資料傳進去
        )
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

# --- 越南訪談 API ---
@app.get("/api/vietnam_personas")
def api_get_vietnam_personas():
    """取得所有越南訪談記錄"""
    return load_vietnam_db()

@app.post("/api/vietnam_personas")
def api_save_vietnam_persona(persona: Dict[str, Any]):
    """儲存/更新越南訪談記錄"""
    save_vietnam_db(persona)
    return {"status": "saved", "id": persona.get('id')}

@app.delete("/api/vietnam_personas/{persona_id}")
def api_delete_vietnam_persona(persona_id: str):
    """刪除單一越南訪談記錄"""
    all_data = load_vietnam_db()
    filtered = [p for p in all_data if p.get('id') != persona_id]

    with open(VIETNAM_DB_FILE, "w", encoding="utf-8") as f:
        json.dump(filtered, f, ensure_ascii=False, indent=2)

    return {"status": "deleted", "id": persona_id}

@app.delete("/api/vietnam_personas")
def api_clear_vietnam_personas():
    """清除所有越南訪談記錄"""
    if VIETNAM_DB_FILE.exists():
        os.remove(VIETNAM_DB_FILE)
    return {"status": "cleared"}

@app.post("/api/vietnam_interview")
def api_vietnam_interview(request: VietnamInterviewRequest):
    """使用 AI 模擬越南受訪者回答"""
    try:
        response_text = interview_vietnam_persona(
            request.persona,
            request.question,
            request.subQuestions
        )
        return {"response": response_text}
    except Exception as e:
        print(f"越南訪談錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate_vietnam_personas")
def api_generate_vietnam_personas(req: GenerateRequest):
    """AI 生成越南受訪者"""
    print(f"🇻🇳 收到越南受訪者生成請求: {req.hint} (x{req.count})")
    try:
        results = generate_vietnam_personas(req.hint, req.count)

        if results:
            # 將生成的 Persona 轉換為完整格式並存檔
            import datetime
            for p in results:
                full_persona = {
                    "id": p.id,
                    "lastName": p.lastName,
                    "gender": p.gender,
                    "age": p.age,
                    "occupation": p.occupation,
                    "timesOfOverseasTravelInsurance": p.timesOfOverseasTravelInsurance,
                    "purchasedBrand": p.purchasedBrand,
                    "purchasedChannels": p.purchasedChannels,
                    "personalBackground": p.personalBackground,
                    "interviewHistory": [],
                    "currentSectionIndex": 0,
                    "currentQuestionIndex": 0,
                    "isCompleted": False,
                    "createdAt": datetime.datetime.now().isoformat(),
                    "updatedAt": datetime.datetime.now().isoformat()
                }
                save_vietnam_db(full_persona)

            return [p.model_dump() for p in results]
        else:
            raise HTTPException(status_code=500, detail="生成失敗")
    except Exception as e:
        print(f"越南受訪者生成錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 啟動入口 ---
if __name__ == "__main__":
    import uvicorn
    print("啟動 API 伺服器中... (http://localhost:8000)")
    uvicorn.run(app, host="0.0.0.0", port=8000)