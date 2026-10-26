# opencode-usage-report

Per-model token usage, cost and Antigravity quota for [OpenCode](https://opencode.ai) — visible in the TUI footer and available as a `/usage` command.

```
today · $0.20 · 379 calls · claude 80%
```

## Features

- **Task-detail sidebar line** — today's estimated cost, model calls, and remaining Antigravity `claude` quota, refreshed every 15 seconds. No chat-footer clutter.
- **Clickable `usage` on the home footer** — click the `usage` entry (or run the palette command **Usage: show report**) for a summary dialog.
- **`/usage` command** — a full per-model table inside the session (no extra model call; it posts the report directly).
- **`usage_report` tool** — the agent can answer "how much have I used / spent?" with the same numbers.
- **Per-model breakdown** — calls, input / output / reasoning tokens, cache read/write, and estimated cost.
- **Subscription aware** — Antigravity (`google/antigravity-*`) models are reported as **$0** and their remaining quota is shown instead, so a subscription never looks like an API bill.
- Read-only: no network requests, no session writes.

## Requirements

- OpenCode **2.x** (uses the V2 server plugin and CLI plugin APIs).
- Optional: `opencode-antigravity-auth`, for the quota section. Without it the rest works fine.

## Install

### Let an agent do it (recommended)

Paste this into OpenCode, Claude Code, Codex, Cursor, or any agent session:

```
Install and configure opencode-usage-report for OpenCode by following the instructions here:
https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/docs/installation.md
```

### Manual (two files)

```bash
mkdir -p ~/.config/opencode/plugins/usage-report
curl -fsSL https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/index.ts \
  -o ~/.config/opencode/plugins/usage-report/index.ts
curl -fsSL https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/tui.tsx \
  -o ~/.config/opencode/plugins/usage-report/tui.tsx
```

Then restart OpenCode. OpenCode discovers plugins under `~/.config/opencode/plugins/` automatically — no `opencode.json` change needed.

### GitHub package install

```bash
opencode plugin add github:Ency0810/opencode-usage-report
```

This installs the package into OpenCode's plugin cache and loads its `./tui` export for the footer (verified: the server entrypoint loads and writes the snapshot; restart the TUI to attach the footer). The two-file method above is the most predictable if the footer does not appear.

## Usage

| What | How |
| --- | --- |
| Home footer | Click `usage` for the summary dialog |
| Task-detail sidebar | Automatic in a session (right panel) |
| Command palette | `Ctrl+P` → **Usage: show report** |
| Full report (30 days) | `/usage` |
| Custom window | `/usage --days 7`, `/usage --days 0` (today) |
| Ask the agent | "show my model usage and cost" |
| Tool | `usage_report` with `days` and `refresh` |

Example report:

```
### 模型用量（最近 30 天）
| 模型 | 呼叫 | Input | Output | Reasoning | Cache read | Cache write | 成本 |
| deepseek/deepseek-flash                    | 167 | 473,965 | 42,786 | 54,967 | 16,996,736 | 0 | $0.18 |
| antigravity-claude-opus-5-5-high（訂閱）     |  30 |  89,639 |  8,150 |      0 |    277,845 | 0 | $0    |
...
```

## Where it appears

- **Home footer status row**: a clickable `usage` entry. The host owns the `Server / UI / Theme / Tools / Experiments` menu row, so plugins append to the status row next to it (there is no slot for that menu row).
- **Session task-detail sidebar** (`sidebar.footer`): the full `today · $… · N calls · claude N%` line.
- **No chat footer**: deliberately not attached to `prompt.footer.status`, so the conversation area stays clean.
- **Command palette**: `Ctrl+P` → “Usage: show report” works anywhere, even with the sidebar closed.

## How cost is calculated

- Token counts and `cost` come from the assistant messages OpenCode stores for every session.
- For normal providers, `cost` is OpenCode's estimate using [models.dev](https://models.dev) pricing — a reference value, not an invoice.
- For `google/antigravity-*` models, cost is always `$0`: they consume the Google Antigravity subscription quota, not API billing. The report and footer show the remaining quota buckets from `~/.config/opencode/antigravity-accounts.json` instead.
- The footer uses **today** (local midnight); `/usage` defaults to 30 days.

## Configuration

All optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENCODE_USAGE_REPORT_DIR` | `~/.cache/opencode/usage-report` | Where `status.json` (the footer snapshot) is written |
| `OPENCODE_USAGE_REPORT_STATUS` | `<dir>/status.json` | Exact snapshot path read by the footer |
| `OPENCODE_USAGE_REPORT_ANTIGRAVITY_ACCOUNTS` | `~/.config/opencode/antigravity-accounts.json` | Quota source |

Refresh intervals: footer re-reads every 15s; the snapshot is recomputed every 5 minutes and whenever `/usage` runs.

## Uninstall

```bash
rm -rf ~/.config/opencode/plugins/usage-report
rm -rf ~/.cache/opencode/usage-report
```

If you installed the package form, also run `opencode plugin remove opencode-usage-report`.

## License

MIT — see [LICENSE](LICENSE).

[繁體中文說明](README.zh-TW.md)
