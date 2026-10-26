# opencode-usage-report

Per-model token usage, cost and Antigravity quota for [OpenCode](https://opencode.ai) — a clickable `Usage` entry on the bottom menu row, a compact popover, and a details dialog.

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

## Features

- **`Usage` on the bottom menu row** — placed right after `Experiments`, with the same spacing, muted color and hover as the host items.
- **Click → compact popover** — today's cost, calls and the top 5 models (names left, calls/cost right-aligned), with a **▸ Details** button. Click outside or press `Esc` to close.
- **`▸ Details` → full dialog** — Antigravity quota, the top 8 models and a `/usage` hint.
- **`/usage` command** — the full 30-day table posted into the session (no extra model call).
- **`usage_report` tool** — the agent can answer "how much have I used / spent?".
- **Subscription aware** — `google/antigravity-*` models are reported as **$0** with their remaining quota, never as an API bill.
- Read-only: no network requests, no session writes.

## Requirements

- OpenCode **2.x** (uses the V2 server plugin and CLI plugin APIs).
- Optional: `opencode-antigravity-auth`, for the quota section.

## Install

### Let an agent do it (recommended)

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

Restart OpenCode. Plugins under `~/.config/opencode/plugins/` are discovered automatically — no `opencode.json` change needed.

### GitHub package install

```bash
opencode plugin add github:Ency0810/opencode-usage-report
```

Use this **instead of** the two-file copy, not in addition to it.

## Usage

| What | How |
| --- | --- |
| Compact popover | Click `Usage` (right after `Experiments`) |
| Full dialog | Click **▸ Details** in the popover |
| Full report (30 days) | `/usage` |
| Custom window | `/usage --days 7`, `/usage --days 0` (today) |
| Ask the agent | "show my model usage and cost" |
| Tool | `usage_report` with `days` and `refresh` |

## Where it appears

- **Bottom menu row** (`✓ Server  ○ UI  Theme  Tools  Experiments  Usage`): the host owns that row and exposes no plugin slot, so the plugin draws an absolute overlay after `Experiments`, matching the host's gap, muted color and hover. Hidden below 60 columns.
- **Conversation footer and task-detail sidebar**: intentionally untouched.
- **No extra keybind**: details open from the **▸ Details** button only.

## How cost is calculated

- Token counts and `cost` come from the assistant messages OpenCode stores per session.
- For normal providers, `cost` is OpenCode's estimate from [models.dev](https://models.dev) pricing — a reference value, not an invoice.
- For `google/antigravity-*`, cost is always `$0`: they consume the Google Antigravity subscription quota. The popover and dialog show the remaining quota buckets from `~/.config/opencode/antigravity-accounts.json` instead.
- The popover and dialog use **today** (local midnight); `/usage` defaults to 30 days.

## Configuration

All optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENCODE_USAGE_REPORT_DIR` | `~/.cache/opencode/usage-report` | Where `status.json` is written |
| `OPENCODE_USAGE_REPORT_STATUS` | `<dir>/status.json` | Exact snapshot path read by the TUI |
| `OPENCODE_USAGE_REPORT_ANTIGRAVITY_ACCOUNTS` | `~/.config/opencode/antigravity-accounts.json` | Quota source |

The TUI re-reads the snapshot every 15s; the snapshot is recomputed every 5 minutes and whenever `/usage` runs.

## Uninstall

```bash
rm -rf ~/.config/opencode/plugins/usage-report
rm -rf ~/.cache/opencode/usage-report
```

Package install: `opencode plugin remove opencode-usage-report`.

## Development and publishing

- CI: `.github/workflows/ci.yml` runs `bunx tsc --noEmit` on push and pull requests.
- Publish: `.github/workflows/publish.yml` runs on `v*` tags and requires an `NPM_TOKEN` repository secret; without it the job skips safely.

## License

MIT — see [LICENSE](LICENSE).

[繁體中文說明](README.md)
