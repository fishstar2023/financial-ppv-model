# LobeChat Claude Artifacts Screen

以 LobeHub UI 建立的授信報告原型，模擬企業金融 RM 在對話中指派摘要/翻譯任務，並將產出整理成 Artifacts 分頁。

## 功能
- 左側對話 + 右側 Artifacts 分頁的雙欄布局
- 文件上傳、任務路由與摘要/翻譯指示
- Summaries、Translations、授信報告三個分頁
- 右側預覽區即時呈現結構化內容

## LLM 串接
1. 建立 `.env` (可參考 `.env.example`)
   ```bash
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   PORT=8787
   VITE_API_URL=http://localhost:8787
   ```
   若僅在 `npm run dev` 使用 Vite proxy，可省略 `VITE_API_URL`。
2. 啟動 API 伺服器
   ```bash
   npm run dev:api
   ```
3. 另開終端啟動前端
   ```bash
   npm run dev
   ```
   PDF/DOCX 內容不會自動解析，可在左側「文件內容」欄位貼上關鍵段落。

## 開發
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```
