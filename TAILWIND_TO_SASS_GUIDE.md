# Tailwind 到 Sass 轉換指南

## 已完成的轉換

✅ **依賴移除**
- 移除 tailwindcss, @tailwindcss/postcss
- 移除 tailwind-merge, class-variance-authority, clsx
- 移除 autoprefixer
- 安裝 sass

✅ **配置文件更新**
- 更新 postcss.config.js
- index.css → index.scss
- 創建 common.scss

✅ **已完成的組件**
- Layout.tsx + Layout.scss
- Navbar.tsx + Navbar.scss
- HomePage.tsx + HomePage.scss
- TournamentCard.tsx + TournamentCard.scss
- CreateTournamentPage.tsx + CreateTournamentPage.scss
- JoinPage.tsx + JoinPage.scss
- ScorerAuthPage.tsx + ScorerAuthPage.scss
- BracketView.tsx + BracketView.scss
- BracketStage.tsx + BracketStage.scss
- MatchCard.tsx + MatchCard.scss
- PlayerSlot.tsx + PlayerSlot.scss

## 待完成的組件

⏳ 需要手動更新以下文件（已創建 Sass 文件，但 TSX 需要更新類名）:

1. **TournamentDetailPage.tsx**
   - 已創建 TournamentDetailPage.scss
   - 需要將所有 Tailwind 類名替換為 BEM 命名

2. **EditTournamentPage.tsx**
   - 已創建 EditTournamentPage.scss
   - 需要將所有 Tailwind 類名替換為 BEM 命名

3. **ScorePage.tsx**
   - 已創建 ScorePage.scss
   - 需要將所有 Tailwind 類名替換為 BEM 命名

## 轉換模式參考

### Tailwind → Sass BEM 模式

**容器類:**
```tsx
// Before
<div className="max-w-2xl mx-auto">

// After
<div className="container"> // 在對應的 .scss 中定義
```

**狀態類:**
```tsx
// Before
<span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">

// After
<span className="badge badge--draft">
```

**按鈕類:**
```tsx
// Before
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">

// After
<button className="btn btn--primary">
```

**載入狀態:**
```tsx
// Before
<div className="text-center py-12">
  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  <p className="mt-4 text-gray-600">載入中...</p>
</div>

// After
<div className="loading">
  <div className="loading__spinner"></div>
  <p className="loading__text">載入中...</p>
</div>
```

## 快速完成剩餘轉換的步驟

對於 TournamentDetailPage、EditTournamentPage、ScorePage：

1. 在文件頂部添加 Sass 導入：
```tsx
import './ComponentName.scss';
```

2. 使用對應的 .scss 文件中定義的 BEM 類名替換所有 className

3. 參考 common.scss 中的通用類別（loading, error-message, btn, badge）

## 測試清單

運行應用並測試以下功能：
- [ ] 首頁顯示正常
- [ ] 導航欄樣式正確
- [ ] 創建比賽流程正常
- [ ] 報名流程正常
- [ ] 對戰表顯示正確
- [ ] 計分功能正常
- [ ] 所有按鈕和交互效果正常

## 開發命令

```bash
npm run dev    # 啟動開發服務器
npm run build  # 構建生產版本
```

