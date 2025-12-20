# LobeChat Claude Artifacts Screen

以 LobeHub UI 建立的企業金融 RM 授信原型，模擬指派摘要/翻譯並將產出整理成 Artifacts 分頁，後端改為 Agno（Python Agent）調用。

## 特色
- Claude Artifacts 風格：暖色編輯系雙欄，左側對話/路由，右側輸出 + Live Preview。
- 真實串接：送出指令會打 OpenAI，回填摘要/翻譯/授信報告分頁與任務路由。
- 文件工作流：可上傳檔案並貼入重點文字，指派摘要/翻譯，生成授信草稿。

## 快速開始
1. 建立 `.env`（參考 `.env.example`）
   ```bash
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   PORT=8787
   VITE_API_URL=http://localhost:8787
   ```
   使用 `npm run dev` 時可省略 `VITE_API_URL`（前端會走 proxy）。
2. 建立 Python venv 並安裝 Agno 服務端依賴
   ```bash
   python3 -m venv .venv
   . .venv/bin/activate
   pip install -r server/requirements.txt
   ```
3. 安裝前端依賴
   ```bash
   npm install
   ```
4. 啟動 API（Agno + OpenAI 模型）
   ```bash
   npm run dev:api
   ```
5. 另開終端啟動前端
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5176 --strictPort --force --clearScreen false
   ```
6. 打開 `http://127.0.0.1:5176/` 測試。

備註：PDF/DOCX 不會自動解析內容，如需精準輸出，請在左側「文件內容」貼上重點段落。

## Build / Preview
```bash
npm run build
npm run preview
```

## 截圖
可將截圖放入 `docs/`，並在此處引用：
```
![UI 截圖](docs/ui.png)
```
