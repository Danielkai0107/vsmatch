# 上線前檢查清單

## 1. 效能優化 ✅
- [x] Firestore 查詢優化
- [x] 路由懶加載
- [x] Vite 打包配置優化
- [x] Zustand selector 優化
- [x] TournamentCard 即時監聽優化

## 2. Firestore 索引設定 ⚠️

### 方法一：使用 Firebase CLI（推薦）
```bash
# 部署索引配置
firebase deploy --only firestore:indexes
```

### 方法二：手動建立
如果 Firebase CLI 部署失敗，請到 Firebase Console 手動建立以下索引：

1. **索引 1：** `tournaments` 集合
   - `status` (升序)
   - `createdAt` (降序)

2. **索引 2：** `tournaments` 集合
   - `organizerId` (升序)
   - `status` (升序)
   - `createdAt` (降序)

3. **索引 3：** `tournaments` 集合
   - `organizerId` (升序)
   - `createdAt` (降序)

## 3. 建置與測試

### 本地測試
```bash
# 開發環境測試
npm run dev

# 建置生產版本
npm run build

# 預覽生產版本
npm run preview
```

### 檢查項目
- [ ] 首頁載入速度 < 3 秒
- [ ] 所有頁面路由正常運作
- [ ] 懶加載的頁面能正確顯示
- [ ] 個人頁面只顯示用戶相關的比賽
- [ ] 首頁只顯示活躍的比賽（進行中 + 最近結束）
- [ ] 籌備中的比賽正確顯示在「最近發布」區塊

## 4. Firebase 部署

### 部署步驟
```bash
# 1. 建置專案
npm run build

# 2. 部署到 Firebase Hosting
firebase deploy --only hosting

# 3. 部署 Firestore 索引（如果尚未部署）
firebase deploy --only firestore:indexes
```

### 部署後檢查
- [ ] 訪問生產環境 URL
- [ ] 檢查 Chrome DevTools > Network 標籤
  - 確認檔案正確快取（Cache-Control headers）
  - 確認 gzip 壓縮生效
- [ ] 使用 Lighthouse 測試效能分數
  - 目標：Performance > 80
  - 目標：Best Practices > 90

## 5. 效能監控

### Chrome DevTools - Network 分析
預期載入檔案：
- `vendor-firebase-*.js`: ~105 kB (gzip)
- `vendor-react-*.js`: ~17 kB (gzip)
- `index-*.js`: ~67 kB (gzip)
- `HomePage-*.js`: ~4 kB (gzip)

### Firestore 使用量監控
- 監控每日讀取次數
- 預期：優化後讀取次數應減少 70-80%

## 6. 環境變數檢查

確認 Firebase 配置正確：
- [ ] `src/lib/firebase.ts` 中的配置指向正確的 Firebase 專案
- [ ] API keys 沒有外洩到公開的 repository

## 7. 錯誤處理

確認以下錯誤情境都有適當處理：
- [ ] 網路連線失敗
- [ ] Firestore 查詢失敗
- [ ] 找不到比賽（404）
- [ ] 權限不足

## 8. 瀏覽器相容性

測試以下瀏覽器：
- [ ] Chrome（最新版）
- [ ] Safari（iOS + macOS）
- [ ] Firefox（最新版）
- [ ] Edge（最新版）

## 9. 行動裝置測試

- [ ] iOS Safari
- [ ] Android Chrome
- [ ] 響應式設計在各種螢幕尺寸下正常運作

## 10. SEO 與 Meta Tags

檢查 `index.html`：
- [ ] 正確的 title
- [ ] 適當的 meta description
- [ ] Open Graph tags（如果需要社群分享）

## 常見問題排解

### Q: 首頁載入仍然很慢
A: 檢查以下項目：
1. Firestore 索引是否已建立完成
2. 網路連線速度
3. Firebase Hosting 是否正確部署

### Q: 出現 "Missing or insufficient permissions" 錯誤
A: 檢查 Firestore Security Rules，確保允許讀取 tournaments 集合

### Q: 懶加載的頁面顯示空白
A: 檢查：
1. 是否正確使用 `Suspense` 包裹路由
2. Loading 組件是否正確顯示
3. 瀏覽器 Console 是否有錯誤訊息

## 上線後監控

### 第一週
- 每天檢查 Firebase Console 的使用量
- 監控 Firestore 讀取次數是否在預期範圍內
- 收集用戶反饋

### 長期監控
- 設定 Firebase Performance Monitoring
- 定期檢查 Lighthouse 分數
- 監控錯誤日誌

## 緊急回滾計畫

如果上線後發現嚴重問題：
```bash
# 回滾到上一個版本
firebase hosting:rollback
```

## 聯絡資訊

如有問題，請參考：
- `PERFORMANCE_OPTIMIZATION.md` - 效能優化詳細說明
- `README.md` - 專案基本資訊
- Firebase Console - 即時監控和錯誤日誌

