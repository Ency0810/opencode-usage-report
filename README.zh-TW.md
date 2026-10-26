# opencode-usage-report（繁體中文）

讓 [OpenCode](https://opencode.ai) 在 **TUI 底部狀態列**直接顯示「今天用了多少、花多少錢、Antigravity 配額還剩多少」，另外提供 `/usage` 指令與 `usage_report` 工具。

```
today · $0.20 · 379 calls · claude 80%
```

## 功能

- **右側任務詳情欄**：今天的估算成本、模型呼叫次數、Antigravity `claude` 配額剩餘百分比，每 15 秒更新；**不會佔用聊天底部**。
- **首頁 footer 可點的 `usage`**：點一下（或命令面板 **Usage: show report**）就看摘要。
- **`/usage` 指令**：在對話中直接貼出每個模型的完整用量表（不會額外呼叫模型）。
- **`usage_report` 工具**：可以直接問 agent「我用了多少 / 花多少錢」。
- **逐模型明細**：呼叫次數、input / output / reasoning tokens、cache read/write、估算成本。
- **訂閱友善**：`google/antigravity-*` 一律顯示 **$0**，並改為顯示剩餘配額，不會把訂閱誤看成 API 帳單。
- 唯讀：不連網、不寫入 session。

## 需求

- OpenCode **2.x**（使用 V2 的 server plugin 與 CLI plugin API）
- 選用：`opencode-antigravity-auth`（才會有配額那一行）

## 安裝

### 交給 agent 安裝（推薦）

把下面這段貼進 OpenCode、Claude Code、Codex、Cursor 或任何 agent：

```
Install and configure opencode-usage-report for OpenCode by following the instructions here:
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

兩種方式**只能選一種**，同時用會重複註冊。

## 使用

| 想做什麼 | 怎麼做 |
| --- | --- |
| 首頁 footer | 點 `usage` 看摘要 |
| 右側任務詳情欄 | 開 session 時自動顯示 |
| 命令面板 | `Ctrl+P` → **Usage: show report** |
| 完整報表（30 天） | `/usage` |
| 自訂期間 | `/usage --days 7`、`/usage --days 0`（今天） |
| 問 agent | 「顯示我的模型用量與花費」 |
| 工具 | `usage_report`（參數 `days`、`refresh`） |

## 顯示位置

- **首頁 footer 狀態列**：可點的 `usage`。`Server / UI / Theme / Tools / Experiments` 那一排由 OpenCode 主機自己管理，插件沒有對應的 slot，所以掛在緊鄰的狀態列。
- **Session 右側任務詳情欄**（`sidebar.footer`）：完整 `today · $… · N calls · claude N%`。
- **聊天底部不顯示**：刻意不掛 `prompt.footer.status`，保持對話區乾淨。
- **命令面板**：`Ctrl+P` →「Usage: show report」，側欄收起時也能用。

## 成本怎麼算

- Token 數與 `cost` 來自 OpenCode 存在每個 session 的 assistant 訊息。
- 一般 provider 的 `cost` 是 OpenCode 依 [models.dev](https://models.dev) 單價估算的**參考值**，不是帳單。
- `google/antigravity-*` 一律 `$0`：那是 Google Antigravity 訂閱配額，不是 API 計費；報表與狀態列會改顯示 `~/.config/opencode/antigravity-accounts.json` 裡的剩餘配額。
- 狀態列算的是**今天**（本地午夜起）；`/usage` 預設 30 天。

## 設定（全部選用）

| 變數 | 預設值 | 用途 |
| --- | --- | --- |
| `OPENCODE_USAGE_REPORT_DIR` | `~/.cache/opencode/usage-report` | 狀態快照 `status.json` 的目錄 |
| `OPENCODE_USAGE_REPORT_STATUS` | `<dir>/status.json` | 狀態列實際讀取的路徑 |
| `OPENCODE_USAGE_REPORT_ANTIGRAVITY_ACCOUNTS` | `~/.config/opencode/antigravity-accounts.json` | 配額來源 |

更新頻率：狀態列每 15 秒重讀；快照每 5 分鐘重算，執行 `/usage` 時也會立即重算。

## 移除

```bash
rm -rf ~/.config/opencode/plugins/usage-report
rm -rf ~/.cache/opencode/usage-report
```

套件形式另加：

```bash
opencode plugin remove opencode-usage-report
```

## 授權

MIT，詳見 [LICENSE](LICENSE)。

[English README](README.md)
