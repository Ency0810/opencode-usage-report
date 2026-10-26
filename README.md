# opencode-usage-report

讓 [OpenCode](https://opencode.ai) 在**底部選單列**提供一個可點的 `Usage`，點擊後彈出簡約用量小窗；完整細節放在小窗內的 `▸ Details`。

```
✓ Server  ○ UI  Theme  Tools  Experiments  Usage
```

```
┌─────────────────────────────────────────────┐
│ Today   $0.38 · 497 calls                   │
│ deepseek-flash                 296    $0.38 │
│ deepseek-v4.1-flash-free       147       $0 │
│ claude-opus-5-5-high            30       $0 │
│ gemini-3.5-flash-lite           11       $0 │
│ gemini-4-argon-high              7       $0 │
│ ▸ Details                                   │
└─────────────────────────────────────────────┘
```

## 功能

- **底部 `Usage` 入口**：緊接在 `Experiments` 後面，沿用主機選單相同的兩格間距、灰色與 hover 效果。
- **點擊 → 簡約小窗**：今天的成本、呼叫次數、前 5 名模型（模型名稱靠左、呼叫數與成本靠右），底部有 `▸ Details` 按鈕；點小窗外或按 `Esc` 關閉。
- **`▸ Details` → 完整對話框**：Antigravity 配額、前 8 名模型（同樣左名稱、右用量）、`/usage` 提示。
- **`/usage` 指令**：完整 30 天表格直接貼進對話，不會額外呼叫模型。
- **`usage_report` 工具**：可以直接問 agent「我用了多少 / 花多少錢」。
- **訂閱友善**：`google/antigravity-*` 一律顯示 `$0`，並改為顯示剩餘配額，不會把訂閱誤看成 API 帳單。
- **唯讀**：不連網、不寫入 session，只讀用量資料與配額檔。

## 需求

- OpenCode **2.x**（使用 V2 的 server plugin 與 CLI plugin API）
- 選用：`opencode-antigravity-auth`（才會有配額資訊；沒有也能正常使用其他功能）

## 安裝

### 交給 agent 安裝（推薦）

把下面這段貼進 OpenCode、Claude Code、Codex、Cursor 或任何 agent：

```
Install and configure opencode-usage-report for OpenCode by following the instructions here:
https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/docs/installation.md
```

或中文版：

```
請依照以下說明安裝並設定 opencode-usage-report：
https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/docs/installation.md
```

### 手動安裝（兩個檔案）

```bash
mkdir -p ~/.config/opencode/plugins/usage-report
curl -fsSL https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/index.ts \
  -o ~/.config/opencode/plugins/usage-report/index.ts
curl -fsSL https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/tui.tsx \
  -o ~/.config/opencode/plugins/usage-report/tui.tsx
```

重新啟動 OpenCode 即可。`~/.config/opencode/plugins/` 下的目錄會被自動探索，**不需要**改 `opencode.json`。

### 套件形式

```bash
opencode plugin add github:Ency0810/opencode-usage-report
```

會安裝到 OpenCode 的 plugin cache 並載入 `./tui`。這個方式和上面的兩檔案方式**只能選一種**，同時用會重複註冊。

## 使用

| 想做什麼 | 怎麼做 |
| --- | --- |
| 簡約小窗 | 點底部 `Experiments` 後面的 `Usage`（模型名稱左、用量右） |
| 完整對話框 | 點小窗裡的 **▸ Details** |
| 完整報表（30 天） | `/usage` |
| 自訂期間 | `/usage --days 7`、`/usage --days 0`（今天） |
| 問 agent | 「顯示我的模型用量與花費」 |
| 工具 | `usage_report`（參數 `days`、`refresh`） |

## 顯示位置

- **最底部選單列**（`✓ Server  ○ UI  Theme  Tools  Experiments  Usage`）：那一列由 OpenCode 主機管理，插件沒有對應的 slot，所以用絕對定位 overlay 畫在 `Experiments` 後面，並套用相同的兩格間距、灰色與 hover；終端寬度小於 60 欄時自動隱藏。
- **聊天底部與右側任務詳情欄**：刻意不使用（沒有掛 `prompt.footer.status` 或 `sidebar.footer`）。
- **沒有額外快捷鍵**：詳情只透過小窗內的 `▸ Details` 開啟。
- **數字只在小窗、Details 與 `/usage` 裡**。

## 成本怎麼算

- Token 數與 `cost` 來自 OpenCode 存在每個 session 的 assistant 訊息。
- 一般 provider 的 `cost` 是 OpenCode 依 [models.dev](https://models.dev) 單價估算的**參考值**，不是帳單。
- `google/antigravity-*` 一律 `$0`：那是 Google Antigravity 訂閱配額，不是 API 計費；小窗與 Details 會改顯示 `~/.config/opencode/antigravity-accounts.json` 裡的剩餘配額。
- 小窗與 Details 算的是**今天**（本地午夜起）；`/usage` 預設 30 天。

## 設定（全部選用）

| 變數 | 預設值 | 用途 |
| --- | --- | --- |
| `OPENCODE_USAGE_REPORT_DIR` | `~/.cache/opencode/usage-report` | 小窗快照 `status.json` 的目錄 |
| `OPENCODE_USAGE_REPORT_STATUS` | `<dir>/status.json` | 小窗實際讀取的路徑 |
| `OPENCODE_USAGE_REPORT_ANTIGRAVITY_ACCOUNTS` | `~/.config/opencode/antigravity-accounts.json` | 配額來源 |

更新頻率：小窗每 15 秒重讀快照；快照每 5 分鐘重算，執行 `/usage` 時也會立即重算。

## 移除

```bash
rm -rf ~/.config/opencode/plugins/usage-report
rm -rf ~/.cache/opencode/usage-report
```

套件形式另加：

```bash
opencode plugin remove opencode-usage-report
```

## 開發與發佈

- CI：push / PR 會跑 `bunx tsc --noEmit`（`.github/workflows/ci.yml`）。
- 發佈：推 `v*` tag 時觸發 `.github/workflows/publish.yml`；需要在 repo secrets 設定 `NPM_TOKEN`，否則會安全跳過。
- 原始碼主要在 `index.ts`（server）與 `tui.tsx`（TUI）。

## 授權

MIT，詳見 [LICENSE](LICENSE)。

[English README](README.en.md)
