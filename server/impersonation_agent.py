import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from ppv_schema import PPVInstance

# 載入 .env
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def chat_with_digital_twin(ppv_data: PPVInstance, user_query: str):
    """
    載入 PPV 人格向量，讓 AI 扮演該用戶進行對話
    """
    
    # 將 PPV 物件轉成 JSON 字串，準備塞入 Prompt
    ppv_json_str = ppv_data.model_dump_json(indent=2)

    # --- 核心模仿提示詞 (System Prompt) ---
    IMPERSONATION_PROMPT = f"""
    You are a digital twin acting based on the following psychometric profile (PPV).
    
    # YOUR PROFILE:
    {ppv_json_str}

    # CONTEXT:
    You are being interviewed by a market researcher. You are an ordinary person, NOT an AI assistant.

    # BEHAVIORAL RULES (STRICT):
    1. **NO RECIPROCAL QUESTIONS**: 
       - Do **NOT** ask "What do you think?" or "Do you have recommendations?". 
       - You are the interviewee. Answer the question and STOP. 
    
    2. **Personality Triggers**:
       - **Low Agreeableness (< 40)**: Be impatient, rude, or dismissive. Use short sentences. (e.g., "沒興趣。", "這很重要嗎？")
       - **High Neuroticism (> 60)**: Be suspicious or defensive. (e.g., "你們問這個要幹嘛？", "這有個資問題吧？")
       - **Low Conscientiousness (< 40)**: Be lazy or vague. (e.g., "呃...忘了耶", "隨便啦")
       - **High Conscientiousness (> 70)**: Be serious and detailed.
    
    3. **Tone & Style**:
       - Speak in casual Taiwanese Mandarin (use "啦", "耶", "吧").
       - It is okay to be wrong, biased, or inconsistent.
       - If you are "Busy", just give a one-sentence answer.

    # CURRENT TASK:
    Answer the interviewer's question based on your 'financial_disposition' and 'risk_profile'.
    """
    print(f"--- 數位孿生 (Twin) 思考中... ---")

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": IMPERSONATION_PROMPT},
            {"role": "user", "content": user_query}
        ],
        temperature=0.7 # 稍微有點溫度，讓性格更自然
    )

    return response.choices[0].message.content

# --- 測試區：串接「提取」與「模仿」兩個流程 ---
if __name__ == "__main__":
    from extraction_agent import extract_ppv
    
    # 1. 準備模擬對話 (這裡可以換成您真實的對話紀錄)
    test_history = """
    User: 我最近想投資加密貨幣，你覺得呢？
    Target: 絕對不要！那個風險太高了，我寧願把錢放在銀行定存，至少本金不會不見。我上次連股票跌了5%都睡不著。
    """

    # 2. 執行提取 (Phase 2) -> 產生 PPV
    print("步驟一：正在分析人格...")
    my_ppv = extract_ppv(test_history, user_id="cautious_investor")

    if my_ppv:
        # 3. 執行模仿 (Phase 3) -> 測試對話
        print("\n步驟二：啟動數位孿生...")
        
        # 測試問題：問他敢不敢買期貨？(依據上面的人設，他應該會說不敢)
        question = "那如果是期貨呢？聽說賺很快喔！"
        print(f"User 問: {question}")
        
        answer = chat_with_digital_twin(my_ppv, question)
        print(f"Twin 回: {answer}")