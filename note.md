# 待辦任務 (Pending Tasks)

## 目前待確認 (Pending Verification)

### 1. Translation History Accumulation
- **狀態**: 需要使用者測試
- **問題**: 多次翻譯請求應該創建多個子分頁（翻譯 #1、翻譯 #2...），但目前可能未正常累積
- **Debug**: 已加入 console.log 追蹤（App.jsx lines 510, 514-515, 549-550, 554, 574）
- **下一步**: 請使用者開啟 console，執行兩次翻譯請求，檢查 console 輸出

### 2. Streaming Visual Effect
- **狀態**: 需要使用者確認可見性
- **已實作**:
  - 脈衝式「正在產生中...」標籤
  - 黃色背景高亮
  - 藍色左側邊框
- **下一步**: 確認使用者能看到 streaming 效果

## 已完成 (Completed)

### ✅ 對話功能修正
- 修正 LLM 忽略對話訊息的問題
- 改為傳遞完整 message array 給 OpenAI API
- 更新 system prompt 以區分閒聊與正式工作請求

### ✅ Translation 歷史記錄 UI
- 實作子分頁模式保留所有翻譯記錄
- artifacts.translation 改為 artifacts.translations[] 陣列
- 新增 activeTranslationIndex 狀態追蹤
- 加入子分頁 UI 與 CSS 樣式

### ✅ React Hooks 順序修正
- 修正 useState 在 useEffect 之後的錯誤
- 確保 hooks 呼叫順序一致

### ✅ Streaming 文字實作
- Backend SSE (Server-Sent Events) 支援
- Frontend ReadableStream + TypeDecoder
- 打字機效果與視覺增強

### ✅ 版本控制流程
- 創建 note.md 追蹤待辦任務
- 建立工作流程：每次更動成功後 commit 至 GitHub

### ✅ UI 簡化重構
- 移除重複的"輸出內容"卡片
- 將 streaming 效果整合至"委員會預覽"區塊
- 簡化 Artifacts 面板佈局，提升使用體驗
- Commit: e3c64e0

## 未來考慮 (Future Considerations)

- 如果 App.jsx 持續增長，考慮拆分為獨立 components
- 考慮加入 document content 自動解析 (PDF/DOCX)
- 優化長文件的 context 限制（目前截斷至 2000 字元）
