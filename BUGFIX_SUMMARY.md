# Bug 修復總結

## 修復的問題

### 1. ❌ TournamentCard 組件錯誤
**錯誤訊息**：`Uncaught TypeError: Component is not a function`

**原因**：
使用 `export const ComponentName = memo(function ComponentName(...) {...})` 的語法在 Vite 的熱重載（HMR）環境中可能會導致問題。

**解決方案**：
將組件定義和 memo 包裝分離：

```typescript
// ❌ 之前（可能導致 HMR 問題）
export const TournamentCard = memo(function TournamentCard({ tournament }) {
  // ...
});

// ✅ 修復後
function TournamentCardComponent({ tournament }) {
  // ...
}

export const TournamentCard = memo(TournamentCardComponent);
```

**修復的組件**：
- `TournamentCard`
- `BracketView`
- `BracketStage`
- `BracketViewMobile`
- `MatchCard`
- `PlayerSlot`

---

### 2. ❌ 重複刪除同一個過期比賽
**問題**：
同一個過期比賽被重複嘗試刪除多次，導致大量重複的日誌輸出：

```
HomePage.tsx:114 自動刪除過期比賽: C6mY7rWTzCYlNnS03EYP (吃了)
HomePage.tsx:135 比賽 C6mY7rWTzCYlNnS03EYP 已自動刪除
HomePage.tsx:114 自動刪除過期比賽: C6mY7rWTzCYlNnS03EYP (吃了)
...（重複多次）
```

**原因**：
`useEffect` 的依賴項是 `[tournaments]`，導致以下循環：

1. 檢查並刪除過期比賽
2. Firestore 監聽器更新 `tournaments`
3. `useEffect` 因為 `tournaments` 變化而重新執行
4. 再次嘗試刪除（可能還在列表中的）同一個比賽
5. 回到步驟 2，形成循環

**解決方案**：

```typescript
// 使用 ref 追蹤正在刪除的比賽 ID
const deletingTournamentsRef = useRef<Set<string>>(new Set());

const checkExpiredTournaments = useCallback(async () => {
  const draftTournaments = tournaments.filter((t) => t.status === "draft");
  const now = Date.now();

  for (const tournament of draftTournaments) {
    // ✅ 如果正在刪除，跳過
    if (deletingTournamentsRef.current.has(tournament.id)) {
      continue;
    }

    // 檢查是否過期...
    if (elapsed >= COUNTDOWN_DURATION) {
      // ✅ 標記為正在刪除
      deletingTournamentsRef.current.add(tournament.id);
      
      try {
        // 執行刪除...
      } catch (error) {
        // ✅ 刪除失敗，從集合中移除，允許重試
        deletingTournamentsRef.current.delete(tournament.id);
      }
    }
  }
}, [tournaments]);

useEffect(() => {
  const interval = setInterval(checkExpiredTournaments, 30000);
  checkExpiredTournaments();
  return () => clearInterval(interval);
}, [checkExpiredTournaments]); // ✅ 依賴 callback 而非 tournaments
```

**關鍵改進**：
1. ✅ 使用 `useRef<Set<string>>` 追蹤正在刪除的比賽 ID
2. ✅ 刪除前檢查是否已在刪除中
3. ✅ 使用 `useCallback` 包裝刪除函數
4. ✅ `useEffect` 依賴 callback 而非直接依賴 `tournaments`
5. ✅ 刪除失敗時從 Set 中移除，允許重試

---

## 測試結果

### Build 測試
```bash
npm run build
```
✅ **成功** - 所有組件正確編譯

### 功能測試

#### 1. TournamentCard 顯示
- ✅ 首頁正常顯示比賽卡片
- ✅ 個人頁面正常顯示比賽列表
- ✅ 熱重載不會導致組件錯誤

#### 2. 過期比賽自動刪除
- ✅ 每個過期比賽只會被嘗試刪除一次
- ✅ 不會出現重複的刪除日誌
- ✅ 刪除失敗時可以重試

---

## 副作用和注意事項

### 正面影響
1. ✅ 組件在熱重載環境中更穩定
2. ✅ 減少了不必要的網絡請求（避免重複刪除）
3. ✅ 降低了 Firestore 讀寫次數
4. ✅ 清理了控制台輸出

### 需要注意
1. ⚠️ 如果頁面刷新，`deletingTournamentsRef` 會重置
   - **影響**：頁面刷新後如果有比賽正在刪除，可能會再次嘗試刪除
   - **風險等級**：低（Firestore 會處理重複刪除請求）

2. ⚠️ 如果刪除操作很慢（網絡延遲）
   - **影響**：比賽 ID 會在 Set 中停留較長時間
   - **風險等級**：低（刪除完成後 Firestore 會自動更新列表）

---

## 相關文件

- `src/components/TournamentCard.tsx` - 修復 memo 導出
- `src/components/bracket/BracketView.tsx` - 修復 memo 導出
- `src/components/bracket/BracketStage.tsx` - 修復 memo 導出
- `src/components/bracket/BracketViewMobile.tsx` - 修復 memo 導出
- `src/components/bracket/MatchCard.tsx` - 修復 memo 導出
- `src/components/bracket/PlayerSlot.tsx` - 修復 memo 導出
- `src/pages/HomePage.tsx` - 修復重複刪除問題

---

## 修復時間
2025-01-30

## 修復版本
v0.0.1 (開發中)

