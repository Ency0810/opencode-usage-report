# 安裝指南

給 agent 與使用者看的 **opencode-usage-report** 安裝指南。這是一個唯讀的 OpenCode 插件，用來看每個模型的 token 用量、估算成本與 Antigravity 配額。

整份安裝只有兩個檔案，兩個都必須存在：

| 檔案 | 角色 |
| --- | --- |
| `index.ts` | Server plugin：`usage_report` 工具、`/usage` 指令、寫出 TUI 快照 |
| `tui.tsx` | CLI/TUI plugin：在最底部選單列畫出可點的 `Usage`，以及小窗與 Details |

放在 `~/.config/opencode/plugins/<名稱>/` 下就會被 OpenCode 自動探索。**用這個方式不需要修改 `opencode.json`。**

---

## 給 LLM agent 的安裝步驟

使用者若請你安裝這個插件，請照順序做完，並完成 Step 3 的驗證。不要跳過驗證。

### Step 0 — 確認版本

```bash
opencode --version
```

- 需要 **OpenCode 2.x**（插件使用 V2 的 server `Plugin.define` API 與 `@opencode/plugin/tui` CLI API）。
- 若版本是 1.x，**停止**並告知使用者此插件只支援 OpenCode 2。
- 配額區塊需要 `opencode-antigravity-auth`；其他功能不需要。

### Step 1 — 安裝兩個檔案

```bash
mkdir -p ~/.config/opencode/plugins/usage-report

curl -fsSL https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/index.ts \
  -o ~/.config/opencode/plugins/usage-report/index.ts

curl -fsSL https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/tui.tsx \
  -o ~/.config/opencode/plugins/usage-report/tui.tsx
```

確認兩個檔案都非空且是 TypeScript：

```bash
wc -l ~/.config/opencode/plugins/usage-report/index.ts \
      ~/.config/opencode/plugins/usage-report/tui.tsx
```

大約會是 270+ 行與 220+ 行。

**替代方式（套件）**：如果使用者偏好 OpenCode 的套件管理：

```bash
opencode plugin add github:Ency0810/opencode-usage-report
```

這會安裝到 OpenCode 的 plugin cache 並載入 `./tui`。**只能二選一**，同時用會重複註冊。

### Step 2 — 重新載入

```bash
opencode reload
```

TUI 的底部 `Usage` 需要**完整重開 OpenCode**（CLI plugin 只在 TUI 啟動時載入）。完成這步後，請提醒使用者重開。

### Step 3 — 驗證

先確認 server 端有寫出快照（伺服器載入後或執行 `/usage` 後會出現）：

```bash
ls -l ~/.cache/opencode/usage-report/status.json
head -c 200 ~/.cache/opencode/usage-report/status.json
```

預期格式：

```json
{"at":1792991321547,"days":0,"calls":376,"cost":0.19497081,"tokens":1289610,"models":[...],"quota":[{"email":"...","buckets":[{"name":"claude","percent":80,...}]}]}
```

接著在 TUI 中驗證：

1. **最底部選單列**：應顯示
   `✓ Server  ○ UI  Theme  Tools  Experiments  Usage`
   其中 `Usage` 與其他項目相同：兩格間距、灰色、hover 會變亮。終端寬度小於 60 欄時會自動隱藏。
2. **點擊 `Usage`**：會在 footer 上方彈出簡約小窗，內容為今天的成本、呼叫次數，以及前 5 名模型（名稱靠左、呼叫數與成本靠右），底部有 `▸ Details`。點小窗外或按 `Esc` 會關閉。
3. **點擊 `▸ Details`**：開啟完整對話框，包含 Antigravity 配額、前 8 名模型（同樣左名稱、右用量）與 `/usage` 提示。
4. **`/usage`**：在 session 中執行，會直接把 30 天完整表格貼進對話。
5. 也可以問 agent：「顯示我的模型用量」——它應該呼叫 `usage_report`。

若 `Usage` 沒出現但 `status.json` 存在，代表 CLI plugin 沒載入（或終端太窄）——請看下方疑難排解。

### Step 4 — 選用設定

只有預設值不適用時才需要：

| 變數 | 預設值 |
| --- | --- |
| `OPENCODE_USAGE_REPORT_DIR` | `~/.cache/opencode/usage-report` |
| `OPENCODE_USAGE_REPORT_STATUS` | `<dir>/status.json` |
| `OPENCODE_USAGE_REPORT_ANTIGRAVITY_ACCOUNTS` | `~/.config/opencode/antigravity-accounts.json` |

若要改位置，請寫進使用者的 shell 啟動檔。

---

## 疑難排解

| 症狀 | 原因 | 處理 |
| --- | --- | --- |
| 最底部沒有 `Usage` | CLI plugin 沒載入，或終端小於 60 欄 | 完整重開 OpenCode、把終端加寬 |
| 點 `Usage` 沒反應 | 快照還沒寫出 | 先跑一次 `/usage`，確認 `status.json`，再重開 |
| `▸ Details` 沒反應 | 快照缺失或 `index.ts` 沒載入 | 確認兩個檔案都在 `~/.config/opencode/plugins/usage-report/`，重開 |
| `/usage` 找不到指令 | server plugin 沒被探索到 | 確認檔案位置，重開 OpenCode |
| 沒有配額資訊 | 未安裝 `opencode-antigravity-auth` 或帳號檔不存在 | 安裝該插件並登入；不影響其他功能 |
| 成本全部 `$0` | 只用了 Antigravity／訂閱模型 | 正常，請改看配額 |
| 出現重複的小窗或重複註冊 | 兩檔案版與套件版同時存在 | 移除其中一個：`opencode plugin remove opencode-usage-report` 或刪除目錄 |

## 移除

```bash
rm -rf ~/.config/opencode/plugins/usage-report
rm -rf ~/.cache/opencode/usage-report
```

套件版另外執行：

```bash
opencode plugin remove opencode-usage-report
```

然後重開 OpenCode。

## 備註

- 插件是唯讀的：只讀 session 訊息與 Antigravity 帳號檔，並在 `~/.cache` 寫一份 JSON 快照。
- 非 Antigravity provider 的 `cost` 是 OpenCode 依 models.dev 單價估算的參考值，不是帳單。
- `google/antigravity-*` 一律 `$0`，因為那是 Google 訂閱配額，不是 API 計費。
- 目前版本**沒有**額外的快速鍵；詳細資料只從小窗的 `▸ Details` 開啟。
