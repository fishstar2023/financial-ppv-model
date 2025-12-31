

# 🧠 Financial PPV Lab: Synthetic Market Research Platform

## 📖 專案簡介 (Introduction)

**Financial PPV Lab** 是一個結合 **心理測量人格向量 (Psychometric Persona Vectors, PPV)** 與 **生成式 AI** 的金融市場模擬平台。本專案旨在解決傳統金融市調中「個資隱私疑慮」與「樣本獲取高成本」的痛點。

[cite_start]透過將使用者的心理特質（如大五人格、風險偏好、財務價值觀）參數化，我們能建立高保真的「數位孿生 (Digital Twins)」，並進一步生成大規模的「合成客群 (Synthetic Populations)」，進行虛擬的產品訪談與壓力測試 [cite: 1540, 1541]。

---

## ✨ 核心功能 (Key Features)

本平台分為兩大實驗模組：

### 1. 🧬 個體數位孿生 (Individual Extraction)
*針對單一使用者的深度分析*
* [cite_start]**對話提取 (Extraction):** 讀取去識別化的對話紀錄，自動分析使用者的 **Big Five (大五人格)** [cite: 410][cite_start]、**Schwartz 價值觀** [cite: 424] [cite_start]與 **金融風險屬性 (Risk Profile)** [cite: 428]。
* [cite_start]**PPV 建模:** 生成標準化的 JSON 人格檔案，包含信心分數與來源權重 [cite: 397, 581]。
* **孿生對話:** 使用者可與提取出的數位分身對話，驗證其決策風格是否一致。

### 2. 📊 合成市場模擬 (Market Simulation) [New!]
*針對特定客群的批量調查*
* **隨機客群生成 (Generation):** 透過輸入目標描述（例如：「25-30歲，居住在台北，有信用卡使用習慣的小資族」），系統利用 LLM 生成具備**多樣性 (Diversity)** 的虛擬受訪者列表。
* **批量訪談 (Batch Interview):** 設計金融訪談問卷（例如：「你會考慮申辦這張年費 5000 元的哩程卡嗎？」），系統自動對所有生成的虛擬客戶進行提問。
* **決策分析:** 收集並比較不同風險屬性（如：保守型 vs. 冒險型）的客戶對同一產品的反應差異。

---

## 🛠️ 系統架構 (Architecture)

本專案採用前後端分離架構：

### Backend (Python / FastAPI)
* **`server/main.py`**: API 入口點，處理前端請求。
* **`server/generator_agent.py`**: **(核心)** 負責基於目標客群描述，生成多樣化的虛擬人格 PPV。
* **`server/extraction_agent.py`**: 負責從文本提取 PPV。
* [cite_start]**`server/impersonation_agent.py`**: 負責扮演特定人格進行對話與問卷回答 [cite: 771]。
* [cite_start]**`server/ppv_schema.py`**: 定義嚴謹的 Pydantic 資料結構 (Schema) [cite: 375]。

### Frontend (React / TypeScript)
* **`src/features/PPVAnalyzer`**: 單人提取模式的 UI 元件。
* **`src/features/MarketSimulator`**: **(核心)** 市場模擬實驗室，包含客群生成與批量訪談介面。
* **`src/services/ppv.ts`**: 統一管理 API 呼叫。

---

## 🚀 快速開始 (Quick Start)

### 1. 環境設定 (Environment Setup)
請確保您已安裝 Python 3.9+ 與 Node.js。

在專案根目錄建立 `.env` 檔案，並填入您的 OpenAI API Key：
```bash
OPENAI_API_KEY=sk-your-api-key-here

```

### 2. 啟動後端 (Backend)

```bash
# 安裝 Python 依賴
pip install fastapi uvicorn openai python-dotenv pydantic

# 啟動 FastAPI 伺服器
python3 server/main.py

```

*Server 將運行於: `http://localhost:8000*`

### 3. 啟動前端 (Frontend)

開啟一個新的終端機視窗：

```bash
# 安裝前端依賴
npm install

# 啟動開發伺服器
npm run dev

```

*開啟瀏覽器訪問: `http://localhost:3000*` (或終端機顯示的網址)

---

## 📂 專案結構 (Project Structure)

```text
financial-ppv-model/
├── server/
│   ├── main.py              # API Server
│   ├── ppv_schema.py        # Data Models (Big5, Risk)
│   ├── generator_agent.py   # Persona Generator
│   ├── extraction_agent.py  # Persona Extractor
│   └── impersonation_agent.py # Digital Twin Logic
├── src/
│   ├── App.jsx              # Main Layout & Navigation
│   ├── features/
│   │   ├── PPVAnalyzer/     # Phase 1-3 UI
│   │   └── MarketSimulator/ # Phase 4 UI (Batch Sim)
│   ├── services/            # API Client
│   └── types/               # TS Interfaces
└── README.md

---

## ⚠️ 免責聲明 (Disclaimer)

本系統生成的 PPV 與訪談結果僅供市場研究模擬參考，不應視為真實個人的行為預測或財務建議。系統設計遵循資料最小化原則 (Data Minimization)，不儲存任何真實用戶的敏感識別資料 。

---

Copyright © 2025 Financial PPV Lab. All Rights Reserved.
