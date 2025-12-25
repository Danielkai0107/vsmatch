# 剩餘任務

## 🎉 已完成的重大工作

1. ✅ 移除所有 Tailwind CSS 依賴
2. ✅ 安裝並配置 Sass
3. ✅ 創建完整的 Sass 樣式結構
4. ✅ 轉換以下組件（共11個）：
   - Layout + Navbar
   - HomePage
   - TournamentCard
   - CreateTournamentPage（包括4個步驟和成功頁面）
   - JoinPage
   - ScorerAuthPage
   - BracketView + BracketStage + MatchCard + PlayerSlot

## ⚠️ 需要手動完成的最後 3 個文件

這些文件的 Sass 樣式文件已經創建完成，但 TSX 文件中的類名需要手動更新：

### 1. TournamentDetailPage.tsx
- ✅ 已創建 `TournamentDetailPage.scss`
- ❌ 需要在 TSX 中：
  1. 添加導入：`import './TournamentDetailPage.scss';`
  2. 將所有 Tailwind 類名替換為對應的 BEM 類名

**主要替換模式：**
```tsx
// 載入狀態
<div className="text-center py-12">
  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  <p className="mt-4 text-gray-600">載入中...</p>
</div>
→
<div className="loading">
  <div className="loading__spinner"></div>
  <p className="loading__text">載入中...</p>
</div>

// 頂部卡片
<div className="bg-white rounded-lg shadow p-6 mb-6">
→
<div className="tournament-detail__header">

// PIN 碼格子
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
→
<div className="tournament-detail__pins">

// 按鈕
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
→
<button className="btn btn--primary">
```

### 2. EditTournamentPage.tsx
- ✅ 已創建 `EditTournamentPage.scss`
- ❌ 需要在 TSX 中：
  1. 添加導入：`import './EditTournamentPage.scss';`
  2. 將所有 Tailwind 類名替換為對應的 BEM 類名

**主要替換模式：**
```tsx
// 容器
<div className="max-w-2xl mx-auto">
→
<div className="edit-tournament">

// 卡片
<div className="bg-white rounded-lg shadow p-6 space-y-6">
→
<div className="edit-tournament__card">

// 輸入框
<input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
→
<input className="edit-tournament__input">
```

### 3. ScorePage.tsx
- ✅ 已創建 `ScorePage.scss`
- ❌ 需要在 TSX 中：
  1. 添加導入：`import './ScorePage.scss';`
  2. 將所有 Tailwind 類名替換為對應的 BEM 類名

**主要替換模式：**
```tsx
// 容器
<div className="max-w-4xl mx-auto">
→
<div className="score-page">

// 計分按鈕
<button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xl font-semibold">
→
<button className="score-page__score-btn score-page__score-btn--player1">

// 分數顯示
<div className="text-6xl font-bold text-gray-900 flex-1 text-center">
→
<div className="score-page__score-display">
```

## 快速操作步驟

對每個文件執行以下步驟：

1. **打開文件**
2. **添加 Sass 導入**（在文件頂部 import 區域）
3. **查找並替換類名**
   - 使用 VS Code 的查找替換功能
   - 參考對應的 .scss 文件中的類名
   - 保持 HTML 結構不變，只替換 className 屬性

4. **測試頁面**
   - 開發服務器：http://localhost:5174/
   - 測試該頁面的所有功能和樣式

## 測試檢查清單

完成所有轉換後，請測試：

- [ ] 首頁 - 搜尋功能、比賽列表顯示
- [ ] 創建比賽 - 4 個步驟流程、成功頁面
- [ ] 比賽詳情頁 - PIN 碼顯示、對戰表、按鈕
- [ ] 編輯頁面 - 表單輸入、PIN 管理、刪除功能
- [ ] 報名頁面 - PIN 搜尋、選手報名
- [ ] 計分員授權 - PIN 輸入驗證
- [ ] 計分頁面 - 加減分、局數管理、結束比賽
- [ ] 響應式設計 - 手機、平板、桌面

## 注意事項

1. **不要更改 HTML 結構**，只替換 className
2. **保持動態類名的邏輯**，例如：
   ```tsx
   className={`match-card ${status === 'live' ? 'match-card--live' : 'match-card--pending'}`}
   ```
3. **使用 BEM 命名規範**：
   - Block: `.component`
   - Element: `.component__element`
   - Modifier: `.component--modifier` 或 `.component__element--modifier`
4. **參考已完成的組件**作為範例（如 CreateTournamentPage.tsx）

## 開發服務器

當前運行在：**http://localhost:5174/**

重啟：`npm run dev`

