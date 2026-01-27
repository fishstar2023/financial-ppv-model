# 🎯 Market Research Simulator

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/python-3.9+-green)
![Node](https://img.shields.io/badge/node-18+-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

[![Open in VS Code Web](https://img.shields.io/badge/Open%20in-VS%20Code%20Web-007ACC?logo=visual-studio-code&logoColor=white)](https://vscode.dev/github/fishstar2023/financial-ppv-model)
[![Clone in VS Code](https://img.shields.io/badge/Clone%20in-VS%20Code-007ACC?logo=visual-studio-code&logoColor=white)](vscode://vscode.git/clone?url=https://github.com/fishstar2023/financial-ppv-model.git)

**AI-Powered Synthetic Persona Interview Platform**

A comprehensive market research tool that generates diverse synthetic personas and conducts automated interviews to gather consumer insights without privacy concerns or high sampling costs.

## 📦 Version Information

| Component | Version |
|-----------|---------|
| **Application** | 1.0.0 |
| **PPV Schema** | 2.0 |
| **Frontend** | React 19 + Vite 6.2 |
| **Backend** | FastAPI 0.115.6 |
| **Agent Framework** | Agno 2.3.18 |
| **LLM** | OpenAI GPT-4o |

### Python Dependencies

直接複製到 `server/requirements.txt`:

```txt
# Market Research Simulator - Python Dependencies v1.0.0
agno==2.3.18
fastapi==0.115.6
uvicorn[standard]==0.32.1
starlette==0.41.3
openai==2.14.0
pydantic==2.12.5
pydantic-settings==2.11.0
pydantic_core==2.41.5
python-dotenv==1.0.1
pypdf==6.5.0
httpx==0.28.1
anyio==4.12.0
httpcore==1.0.9
sniffio==1.3.1
typing_extensions==4.15.0
typing-inspection==0.4.2
pytest==8.4.2
```

### Node.js Dependencies

直接複製到 `package.json` 的 `dependencies`:

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "antd": "^5.24.6",
    "@lobehub/ui": "^1.164.4",
    "lucide-react": "^0.469.0",
    "@ant-design/icons": "^5.6.1",
    "react-markdown": "^10.0.2",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "vite": "^6.2.0",
    "@vitejs/plugin-react": "^4.4.1"
  }
}
```

---

## ✨ Key Features

### 🧬 Persona Generation
- **Cultural Adaptation**: Generate personas matching specific geographic and cultural contexts (Taiwan, Vietnam, etc.)
- **Psychometric Diversity**: Each persona has unique Big Five personality traits, risk profiles, and decision-making styles
- **Realistic Backgrounds**: 2-sentence backstories focusing on age, occupation, location, and key personality traits
- **Example**: "阿南是27歲的工廠工人，在台中工作。他經常憂心未來，不願意嘗試新的投資方式。"

### 💬 Batch Interviews
- **Contextual Questioning**: Provide product descriptions or scenarios before asking questions
- **Natural Responses**: AI-powered personas respond in colloquial language based on their personality traits
- **Interview History**: All Q&A sessions are preserved and accessible
- **Parallel Processing**: Interview multiple personas simultaneously

### 📊 Analytics Dashboard
- **Purchase Willingness Analysis**: Automatic sentiment detection (High/Medium/Low)
- **Response Distribution**: Visual charts showing decision patterns
- **Individual Insights**: Detailed breakdown of each persona's responses
- **Question Comparison**: Track different questions and their results

---

## 🏗️ Architecture

### Backend (Python + FastAPI + Agno)
```
server/
├── agno_api.py                    # FastAPI server with PPV endpoints
├── generator_agent.py             # Persona generation with diversity prompt
├── vietnam_interview_agent.py     # PPV-driven interview simulation
├── ppv_extreme_generator.py       # PPV extreme test case generator
├── ppv_diversity_monitor.py       # Diversity metrics monitoring
├── test_ppv_interview_stability.py # PPV testing suite
├── impersonation_agent.py         # Dynamic personality-driven chat agent
├── extraction_agent.py            # PPV extraction from conversation logs
├── ppv_schema.py                  # Pydantic schemas (Big5, Risk, Values)
└── personas.json                  # Persistent persona database
```

**Key Technologies**:
- **Agno**: Agent framework for structured AI interactions
- **OpenAI GPT-4o**: LLM for persona generation and interviews (temperature: 0.9 for diversity)
- **Pydantic**: Strict schema validation for PPV instances

### Frontend (React 19 + TypeScript + Vite)
```
src/
├── App.jsx                          # Application shell
├── features/
│   └── MarketSimulator/
│       └── index.tsx                # Main simulator component
├── types/
│   └── ppv.ts                       # TypeScript interfaces
└── styles.css                       # Morandi blue-yellow color palette
```

**Design System**:
- **Color Palette**: Deepened Morandi blue-yellow tones (#6b8aa3 primary, #2d3e4d text)
- **Typography**: Enhanced font sizes (15px-40px) for readability
- **UI Components**: Glass morphism effects, hover transitions, responsive grid

---

## 🚀 Quick Start (新手完整指南)

> 💡 **給完全新手的說明**：以下步驟假設你從未使用過 Python 或 Node.js，會一步步帶你完成安裝。

---

### Step 0: 安裝必要軟體

在開始之前，請先確認你的電腦已安裝以下軟體：

#### 📦 安裝 Python 3.9+

**Mac 用戶**：
```bash
# 使用 Homebrew 安裝（如果沒有 Homebrew，先執行下一行）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝 Python
brew install python@3.11
```

**Windows 用戶**：
1. 前往 https://www.python.org/downloads/
2. 下載 Python 3.11 或更新版本
3. 安裝時**務必勾選** "Add Python to PATH"
4. 完成安裝

**驗證安裝**：
```bash
python3 --version
# 應該顯示：Python 3.11.x 或更高
```

#### 📦 安裝 Node.js 18+

**Mac 用戶**：
```bash
brew install node@18
```

**Windows 用戶**：
1. 前往 https://nodejs.org/
2. 下載 LTS 版本（建議 18.x 或 20.x）
3. 執行安裝程式，一路下一步即可

**驗證安裝**：
```bash
node --version
# 應該顯示：v18.x.x 或更高

npm --version
# 應該顯示：9.x.x 或更高
```

#### 🔑 取得 OpenAI API Key

1. 前往 https://platform.openai.com/signup 註冊帳號
2. 登入後前往 https://platform.openai.com/api-keys
3. 點擊 "Create new secret key"
4. 複製並保存這個 key（格式像 `sk-xxxxxxxxxxxxxxxx`）
5. ⚠️ **重要**：這個 key 只會顯示一次，請妥善保存！

---

### Step 1: 下載專案

打開終端機（Mac: Terminal / Windows: PowerShell），執行：

```bash
# 複製專案到你的電腦
git clone https://github.com/fishstar2023/financial-ppv-model.git

# 進入專案目錄
cd financial-ppv-model
```

> 💡 **沒有 Git？**
> - Mac: `brew install git`
> - Windows: 下載 https://git-scm.com/download/win

---

### Step 2: 設定環境變數

在專案根目錄建立 `.env` 檔案：

**Mac/Linux**：
```bash
# 建立 .env 檔案
cat > .env << 'EOF'
OPENAI_API_KEY=sk-在這裡貼上你的API金鑰
OPENAI_MODEL=gpt-4o
PORT=8787
EOF
```

**Windows (PowerShell)**：
```powershell
# 建立 .env 檔案
@"
OPENAI_API_KEY=sk-在這裡貼上你的API金鑰
OPENAI_MODEL=gpt-4o
PORT=8787
"@ | Out-File -FilePath .env -Encoding UTF8
```

> ⚠️ **重要**：把 `sk-在這裡貼上你的API金鑰` 換成你在 Step 0 取得的真實 API Key！

---

### Step 3: 安裝 Python 後端套件

```bash
# 建立 Python 虛擬環境（隔離專案的套件）
python3 -m venv .venv

# 啟動虛擬環境
# Mac/Linux:
source .venv/bin/activate

# Windows:
.venv\Scripts\activate

# 你應該會看到命令列前面出現 (.venv)

# 安裝所有 Python 套件
pip install -r server/requirements.txt
```

**預期輸出**：
```
Successfully installed agno-2.3.18 fastapi-0.115.6 ...
```

> 🔧 **遇到問題？**
> - 如果出現 "pip not found"，試試 `pip3` 替代 `pip`
> - 如果權限不足，試試 `pip install --user -r server/requirements.txt`

---

### Step 4: 安裝 Node.js 前端套件

```bash
# 安裝所有前端套件
npm install
```

**預期輸出**：
```
added 200+ packages in 30s
```

> 🔧 **遇到問題？**
> - 如果出現網路錯誤，試試 `npm install --registry=https://registry.npmmirror.com`

---

### Step 5: 啟動應用程式

你需要開啟**兩個**終端機視窗：

**終端機 1 - 啟動後端 API**：
```bash
# 確保在專案目錄且虛擬環境已啟動
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 啟動後端
npm run dev:api
```

**預期輸出**：
```
INFO:     Uvicorn running on http://0.0.0.0:8787
INFO:     Application startup complete.
```

**終端機 2 - 啟動前端**：
```bash
# 開啟新的終端機視窗，進入專案目錄
cd financial-ppv-model

# 啟動前端
npm run dev
```

**預期輸出**：
```
  VITE v6.2.0  ready in 500 ms

  ➜  Local:   http://127.0.0.1:5176/
```

---

### Step 6: 開始使用！

打開瀏覽器，前往：**http://127.0.0.1:5176**

🎉 **恭喜！你已經成功啟動 Market Research Simulator！**

---

### ❓ 常見問題

| 問題 | 解決方案 |
|------|----------|
| `command not found: python3` | 重新安裝 Python 並確保加入 PATH |
| `port 8787 already in use` | 執行 `lsof -i :8787` 找出佔用程序並關閉 |
| `OPENAI_API_KEY not set` | 檢查 .env 檔案是否存在且內容正確 |
| `npm install` 失敗 | 刪除 `node_modules` 資料夾後重試 |
| 網頁顯示空白 | 開啟開發者工具 (F12) 查看 Console 錯誤 |

---

## 📖 Usage Guide

### Generate Personas

1. Navigate to **Current Interviews** tab
2. Enter target audience description:
   - Example (Taiwan): `25-35歲的台北上班族`
   - Example (Vietnam): `在越南本土出生的年輕人`
3. Click **Generate** - system creates 5 diverse personas

### Conduct Interviews

1. (Optional) Add **Product Context** to provide background information
2. Enter your **Interview Question** in the text area
3. Click **Send** - all personas respond based on their personality traits
4. View responses in each persona card

### Analyze Results

1. Switch to **Analytics** tab
2. View aggregate metrics:
   - Total Personas
   - Total Interviews
   - Average Interviews per Person
3. Expand questions to see:
   - Purchase Willingness Distribution (High/Medium/Low)
   - Average Willingness Score
   - Individual response details

### Manage Data

- **Archive**: View all historical personas in the **Archive** tab
- **Delete Individual**: Click × button on any persona card
- **Clear All**: Use "Clear All Data" button to reset

---

## 🎨 Design Philosophy

### Prompt Engineering Principles

1. **No Template Bias**: Removed all concrete examples from prompts to prevent AI from copying patterns
2. **Cultural Adaptation**: Dynamic language and location matching based on target audience
3. **Personality-Driven Instructions**: Agent behavior changes based on Big Five scores and risk profile
4. **Varied Phrasing**: Explicit instructions to avoid repetitive responses

### UI/UX Improvements

- **Enhanced Readability**: Deepened color palette with higher contrast ratios
- **Larger Typography**: Progressive font scaling (15px → 40px) for accessibility
- **Simplified Backstories**: Concise 2-sentence format focusing on demographics + key traits
- **Responsive Design**: Adaptive grid layout (min 320px cards)

---

## 🧠 PPV Diversity Control System

### Overview

The PPV (Persona Personality Variables) system ensures AI-generated interview responses are diverse and consistent with persona settings.

### Key PPV Dimensions

| Dimension | Range | Effect |
|-----------|-------|--------|
| `language_style.verbosity` | 0-100 | Controls response length (68-499 chars) |
| `language_style.emotion_expression` | 0-100 | Controls emotion word count (0-5 words) |
| `language_style.formality` | 0-100 | Controls formal vs casual language |
| `language_style.directness` | 0-100 | Controls direct vs indirect expression |
| `big5.neuroticism` | 0-100 | Controls anxiety/worry expression |
| `big5.extraversion` | 0-100 | Controls talkative vs reserved style |
| `risk_profile.overall` | 0-100 | Controls cautious vs risk-taking attitude |

### Diversity Metrics

- **Pearson Correlation**: 0.987 (verbosity ↔ response length)
- **Coefficient of Variation**: 48-64% (response length diversity)
- **PPV Consistency Score**: 81% average (response matches persona settings)

### Testing Commands

```bash
# Verbosity correlation test (0→100 gradient)
python server/test_ppv_interview_stability.py -m correlation

# Full diversity analysis (extreme personas)
python server/test_ppv_interview_stability.py -m diversity

# Multi-dimension cross test (verbosity × emotion)
python server/test_ppv_interview_stability.py -m cross

# Diagonal extremes (all high/low)
python server/test_ppv_interview_stability.py -m diagonal
```

### Extreme Test Personas

| Persona | V | F | E | N | Risk | Expected Behavior |
|---------|---|---|---|---|------|-------------------|
| All High | 95 | 95 | 95 | 95 | 95 | Long, emotional, anxious |
| All Low | 5 | 5 | 5 | 5 | 5 | Short, flat, cautious |
| Extrovert-Impulsive | 85 | 20 | 90 | 20 | 90 | Talkative, casual, bold |
| Introvert-Cautious | 25 | 85 | 20 | 75 | 10 | Brief, formal, worried |

---

## 📊 Data Schema

### PPVInstance Structure

```typescript
interface PPVInstance {
  id: string;                    // Culturally-appropriate nickname
  version: string;               // Schema version
  source_summary: {              // Data source weights
    dialogue: number;
    questionnaire: number;
    behavior: number;
  };
  big5: {                        // Big Five personality traits
    openness: number;            // 0-100
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  schwartz_values: {...} | null; // Schwartz Value Survey (optional)
  risk_profile: {                // Financial risk tolerance
    overall: number;             // 0-100
    financial: number;
    ethical: number;
    confidence: number;          // 0-1
  };
  financial_disposition: {
    long_term_orientation: number;
    loss_aversion: number;
    decision_style: "Intuitive" | "Analytical";
  };
  meta: {
    model: string;
    method: string;
    paper_ref: string;
  };
  notes: string;                 // Backstory (2 sentences)
  interview_history: Array<{
    question: string;
    answer: string;
    timestamp: string;
  }>;
}
```

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/personas` | GET | Retrieve all personas |
| `/api/personas` | DELETE | Clear all personas |
| `/api/personas/{id}` | DELETE | Delete specific persona |
| `/api/generate_personas` | POST | Generate new personas |
| `/api/chat_with_twin` | POST | Interview a persona |
| `/api/update_persona` | POST | Save interview responses |
| `/api/extract_ppv` | POST | Extract PPV from conversation |

---

## 🛠️ Development

### Project Scripts

```bash
npm run dev          # Start frontend dev server
npm run dev:api      # Start backend API server
npm run build        # Build for production
npm run preview      # Preview production build
```

### File Modifications

**Recent Changes**:
- ✅ Enhanced color palette for better contrast
- ✅ Increased font sizes across all components
- ✅ Simplified backstory generation (2 sentences)
- ✅ Removed example bias from prompts
- ✅ Added geographic/cultural adaptation
- ✅ Dynamic personality-driven agent instructions

---

## 📝 Configuration

### Generator Prompt Customization

Edit `server/generator_agent.py` (line 18-80) to customize:
- Persona diversity requirements
- Backstory format and language
- Personality trait distributions
- Risk profile variations

### UI Theme Customization

Edit `src/features/MarketSimulator/index.tsx` (line 4-34):
```typescript
const colors = {
  primary: '#6b8aa3',      // Main brand color
  textPrimary: '#2d3e4d',  // Primary text
  bgPrimary: 'rgba(255, 255, 255, 0.9)', // Card backgrounds
  // ... more colors
};
```

---

## ⚠️ Important Notes

### Persona Generation Quality

- **Temperature**: Set to 0.9 for maximum response diversity
- **Cultural Context**: System adapts names, locations, and language based on target audience
- **Diversity Enforcement**: Prompts explicitly require varied personality traits and decision patterns

### Interview Response Behavior

- **Short & Natural**: Responses limited to 1-2 sentences in colloquial language
- **Personality-Driven**: Reactions change based on Big Five scores and risk tolerance
- **Context-Aware**: Personas react to product information with natural surprise/curiosity

### Data Persistence

- All personas stored in `server/personas.json`
- Interview history preserved with timestamps
- Automatic de-duplication by persona ID

---

## 🔒 Privacy & Ethics

- **Synthetic Data Only**: All personas are AI-generated, not real people
- **No PII**: System does not collect or store personally identifiable information
- **Research Purpose**: Results are for market simulation only, not behavioral prediction

---

## 🐛 Troubleshooting

### Backend fails to start
- Check `.env` file has valid `OPENAI_API_KEY`
- Ensure port 8787 is not in use
- Verify Python dependencies: `pip install -r server/requirements.txt`

### Frontend connection error
- Confirm backend is running at `http://localhost:8787`
- Check CORS settings in `server/agno_api.py`
- Clear browser cache and reload

### Personas not generating
- Verify OpenAI API key has sufficient credits
- Check backend console for error messages
- Ensure target audience description is clear and specific

---

## 📚 References

- **Big Five Personality Traits**: OCEAN model (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)
- **Schwartz Values**: Human values theory (10 value types)
- **Agno Framework**: AI agent orchestration toolkit

---

## 📄 License

Copyright © 2025 Market Research Simulator. All Rights Reserved.

This project is for research and educational purposes only.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with ❤️ using React, FastAPI, and OpenAI GPT-4o**
