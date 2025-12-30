# 效能優化報告

## 優化日期
2025-12-30

## 優化前的問題
1. **載入速度慢** - 首次進入頁面需要等待較長時間
2. **資料查詢效率低** - 一次性抓取所有比賽資料，隨著比賽數量增加會越來越慢
3. **打包檔案過大** - 所有頁面組件都在首次載入時下載
4. **不必要的重新渲染** - Zustand store 使用不當導致組件頻繁更新

## 已完成的優化

### 1. 優化 Firestore 查詢策略 ✅
**問題：** 原本使用 `useTournaments()` 一次性抓取所有比賽，當比賽數量增加到數百場時會造成嚴重的效能問題。

**解決方案：**
- 建立 `useActiveTournaments()` - 只抓取進行中和已結束的比賽（限制 50 場）
- 建立 `useMyDraftTournaments()` - 只抓取用戶籌備中的比賽（限制 10 場）
- 建立 `useMyOrganizedTournaments()` - 只抓取用戶舉辦的比賽
- 使用 Firestore 的 `where` 和 `limit` 子句進行伺服器端過濾

**效果：**
- 首頁資料量從「全部比賽」減少到「最多 60 場」
- 個人頁面只載入與用戶相關的比賽
- 大幅減少網路流量和記憶體使用

### 2. 實施路由懶加載 (Code Splitting) ✅
**問題：** 所有頁面組件在首次載入時就被下載，即使用戶可能不會訪問這些頁面。

**解決方案：**
```typescript
// 使用 React.lazy 進行動態匯入
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
// ... 其他頁面
```

**效果：**
- 首次載入只下載必要的程式碼
- 其他頁面在需要時才載入
- 提升首屏載入速度

### 3. 優化 Vite 打包配置 ✅
**問題：** 第三方庫與應用程式碼混在一起，無法有效利用瀏覽器快取。

**解決方案：**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-state': ['zustand'],
        'vendor-ui': ['lucide-react', 'qrcode.react']
      }
    }
  }
}
```

**效果：**
- Firebase (337.93 kB) 被拆分為獨立檔案
- React 核心 (47.06 kB) 被拆分為獨立檔案
- 第三方庫可以被瀏覽器長期快取
- 應用程式碼更新時不需要重新下載第三方庫

### 4. 優化 Zustand Store Selectors ✅
**問題：** 使用 `const { tournaments, loading } = useTournamentStore()` 會導致 store 中任何狀態改變都觸發組件重新渲染。

**解決方案：**
```typescript
// 使用 selector 只訂閱需要的狀態
const tournaments = useTournamentStore(state => state.tournaments);
const loading = useTournamentStore(state => state.loading);
```

**效果：**
- 減少不必要的重新渲染
- 提升應用程式響應速度

### 5. 優化 TournamentCard 即時監聽 ✅
**問題：** 每個比賽卡片都在監聽 Firestore，當首頁有多個卡片時會建立大量連線。

**解決方案：**
- 添加 500ms 的節流機制，避免頻繁更新
- 正確清理 timeout 和監聽器

**效果：**
- 減少 Firestore 讀取次數
- 降低 CPU 使用率

## 打包結果分析

### 主要檔案大小（gzip 後）：
- `vendor-firebase-Dt9KR1ot.js`: 104.73 kB （Firebase 核心）
- `vendor-react-DodukWKn.js`: 16.74 kB （React 核心）
- `index-BYow03t2.js`: 66.88 kB （應用程式主要邏輯）
- `vendor-ui-nwUKxnSp.js`: 7.53 kB （UI 組件庫）

### 頁面級別的程式碼拆分：
- `HomePage-BBOmTOVt.js`: 3.60 kB
- `ProfilePage-DyQELUda.js`: 1.29 kB
- `TournamentDetailPage-C1tSCrCx.js`: 5.30 kB
- `CreateTournamentPage-DTLCJg9b.js`: 2.67 kB
- `EditTournamentPage-BYzntOff.js`: 3.18 kB
- `ScorePage-Y9Z7GRbV.js`: 3.60 kB

## 預期效果

### 首次載入：
- **優化前：** 需要下載所有頁面 + 所有比賽資料
- **優化後：** 只下載首頁 + 核心庫 + 最多 60 場比賽資料

### 後續導航：
- **優化前：** 已載入所有頁面，但資料查詢仍然緩慢
- **優化後：** 頁面按需載入，資料查詢精準快速

### 快取效率：
- **優化前：** 應用程式更新時需要重新下載所有程式碼
- **優化後：** 第三方庫（Firebase、React）可以長期快取，只需更新應用程式碼

## 建議的後續優化

### 1. 添加 Service Worker（PWA）
可以實現離線訪問和更快的重複訪問速度。

### 2. 圖片優化
如果未來添加更多圖片，建議：
- 使用 WebP 格式
- 實施圖片懶加載
- 使用 CDN

### 3. 實施虛擬滾動
如果比賽列表非常長，可以使用虛擬滾動（如 `react-window`）只渲染可見的項目。

### 4. 添加 Firebase 索引
確保 Firestore 查詢有適當的索引，特別是：
- `tournaments` 集合的 `status` + `createdAt` 複合索引
- `tournaments` 集合的 `organizerId` + `status` + `createdAt` 複合索引

### 5. 考慮使用 React Server Components（未來）
當 React 19 穩定後，可以考慮使用 Server Components 進一步優化首次載入。

## 測試建議

### 開發環境測試：
```bash
npm run dev
```
訪問 http://localhost:5174/ 測試功能是否正常

### 生產環境測試：
```bash
npm run build
npm run preview
```
測試打包後的效能

### 效能測試工具：
1. Chrome DevTools > Network 標籤 - 查看載入時間和檔案大小
2. Chrome DevTools > Performance 標籤 - 分析渲染效能
3. Lighthouse - 綜合效能評分

## 注意事項

1. **Firestore 查詢限制：** 確保 Firebase 專案中已建立必要的索引
2. **懶加載載入畫面：** 已添加 Loading 組件作為懶加載的 fallback
3. **向後相容：** 保留了 `useTournaments()` 函數以確保向後相容

## 結論

通過這些優化，應用程式的載入速度應該有明顯提升，特別是在比賽數量較多的情況下。建議在上線前進行完整的測試，確保所有功能正常運作。

