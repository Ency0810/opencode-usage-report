# opencode-usage-report

Per-model token usage, cost and Antigravity quota for [OpenCode](https://opencode.ai) — one click away in the TUI footer menu row, plus a `/usage` command.

```
today · $0.20 · 379 calls · claude 80%
```

## Features

- **`Usage` on the bottom menu row** — styled like the host's own menu items (same spacing, muted color, hover); click it for a compact popover anchored just above the footer: today's cost/calls plus the top 5 models (names left, calls/cost right-aligned) and a **Details** button.
- **Details on demand** — the popover's **Details** button, or `Ctrl+P` → **Usage: show report** (the default command palette, no extra keybind), opens the full dialog with quota and aligned model rows; `/usage` posts the 30-day table.
- **No chat/sidebar duplication** — the conversation footer and the task-detail sidebar stay clean.
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

This installs the package into OpenCode's plugin cache and loads its `./tui` export for the bottom-row entry (verified: the server entrypoint loads and writes the snapshot; restart the TUI to attach the entry). The two-file method above is the most predictable if the entry does not appear.

## Usage

| What | How |
| --- | --- |
| Compact popover | Click `Usage` (right after `Experiments`) — models left, usage right |
| Full dialog | Click **▸ Details** in the popover |
| Detailed dialog | `Ctrl+P` → **Usage: show report** (default command palette) |
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

- **Bottom menu row** (`✓ Server  ○ UI  Theme  Tools  Experiments  Usage`): the host owns that row and exposes no plugin slot for it, so the plugin draws an absolute overlay after `Experiments`, with the same two-space gap, muted color and hover highlight as the host items. It is hidden on terminals narrower than 60 columns.
- **Click** opens a compact popover anchored above the footer (like the host's `UI` menu) with a **▸ Details** button; clicking outside or pressing `Esc` closes it.
- **Conversation footer and task-detail sidebar**: intentionally untouched (`prompt.footer.status` and `sidebar.footer` are not used).
- **Command palette**: `Ctrl+P` → “Usage: show report” works anywhere and does not depend on the overlay.
- **Data**: the entry only opens a dialog; the numbers live in the dialog and in `/usage`.

## How cost is calculated

- Token counts and `cost` come from the assistant messages OpenCode stores for every session.
- For normal providers, `cost` is OpenCode's estimate using [models.dev](https://models.dev) pricing — a reference value, not an invoice.
- For `google/antigravity-*` models, cost is always `$0`: they consume the Google Antigravity subscription quota, not API billing. The report and the dialog show the remaining quota buckets from `~/.config/opencode/antigravity-accounts.json` instead.
- The dialog uses **today** (local midnight); `/usage` defaults to 30 days.

## Configuration

All optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENCODE_USAGE_REPORT_DIR` | `~/.cache/opencode/usage-report` | Where `status.json` (the TUI snapshot) is written |
| `OPENCODE_USAGE_REPORT_STATUS` | `<dir>/status.json` | Exact snapshot path read by the TUI entry |
| `OPENCODE_USAGE_REPORT_ANTIGRAVITY_ACCOUNTS` | `~/.config/opencode/antigravity-accounts.json` | Quota source |

Refresh intervals: the TUI re-reads the snapshot every 15s; the snapshot is recomputed every 5 minutes and whenever `/usage` runs.

## Uninstall

```bash
rm -rf ~/.config/opencode/plugins/usage-report
rm -rf ~/.cache/opencode/usage-report
```

If you installed the package form, also run `opencode plugin remove opencode-usage-report`.

## License

MIT — see [LICENSE](LICENSE).

[繁體中文說明](README.zh-TW.md)
