# server/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# 匯入您剛寫好的兩個 Agent
from extraction_agent import extract_ppv
from impersonation_agent import chat_with_digital_twin
from ppv_schema import PPVInstance

app = FastAPI()

# --- 設定 CORS (允許前端連線) ---
# 這很重要，不然您的 React 前端會被瀏覽器擋住，連不進來
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開發階段允許所有來源，上線後建議改成前端網址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 定義資料格式 ---
class ExtractRequest(BaseModel):
    chat_log: str
    user_id: str = "user_default"

class ChatRequest(BaseModel):
    ppv_profile: PPVInstance  # 直接接收完整的 PPV JSON
    user_query: str

# --- API 1: 提取人格 (Phase 2) ---
# 前端把對話紀錄丟進來，這裡吐出 JSON
@app.post("/api/extract_ppv", response_model=PPVInstance)
def api_extract_ppv(request: ExtractRequest):
    print(f"收到提取請求: {request.user_id}")
    result = extract_ppv(request.chat_log, request.user_id)
    if not result:
        raise HTTPException(status_code=500, detail="提取失敗")
    return result

# --- API 2: 數位孿生對話 (Phase 3) ---
# 前端把 PPV JSON 和 使用者的問題丟進來，這裡吐出 AI 的回答
@app.post("/api/chat_with_twin")
def api_chat_with_twin(request: ChatRequest):
    print(f"收到對話請求: {request.user_query}")
    try:
        response_text = chat_with_digital_twin(request.ppv_profile, request.user_query)
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 啟動指令提示
if __name__ == "__main__":
    import uvicorn
    print("啟動 API 伺服器中...")
    uvicorn.run(app, host="0.0.0.0", port=8000)