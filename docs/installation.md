# Installation

Agent-facing installation guide for **opencode-usage-report** — a read-only OpenCode plugin that shows per-model token usage, estimated cost, and Antigravity quota.

It has two parts that must both land on disk:

| File | Role |
| --- | --- |
| `index.ts` | Server plugin: `usage_report` tool, `/usage` command, writes the footer snapshot |
| `tui.tsx` | CLI/TUI plugin: renders the footer status line |

OpenCode discovers a plugin directory under `~/.config/opencode/plugins/<name>/` automatically. **Do not** add anything to `opencode.json` for this method.

---

## For LLM agents

If a user asks you to install this plugin, follow the steps in order and verify each one. Do not skip Step 3.

### Step 0 — Prerequisites

```bash
opencode --version
```

- Requires **OpenCode 2.x** (the plugin uses the V2 server `Plugin.define` API and the `@opencode/plugin/tui` CLI API).
- If OpenCode is 1.x, **stop** and tell the user this plugin is OpenCode 2 only.
- The quota section needs `opencode-antigravity-auth`; everything else works without it.

### Step 1 — Install the two files

```bash
mkdir -p ~/.config/opencode/plugins/usage-report

curl -fsSL https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/index.ts \
  -o ~/.config/opencode/plugins/usage-report/index.ts

curl -fsSL https://raw.githubusercontent.com/Ency0810/opencode-usage-report/main/tui.tsx \
  -o ~/.config/opencode/plugins/usage-report/tui.tsx
```

Check both files are non-empty TypeScript:

```bash
wc -l ~/.config/opencode/plugins/usage-report/index.ts \
      ~/.config/opencode/plugins/usage-report/tui.tsx
```

Expected: roughly 250+ lines and 90+ lines.

**Alternative (package install).** If the user prefers OpenCode's package manager:

```bash
opencode plugin add github:Ency0810/opencode-usage-report
```

This installs the package into OpenCode's plugin cache and loads its `./tui` export. Use this **instead of** the two-file copy, not in addition to it, or the plugin will be registered twice.

### Step 2 — Reload

```bash
opencode reload
```

A full restart of the TUI is required for the CLI (footer) plugin to attach. Tell the user to restart OpenCode after this step.

### Step 3 — Verify

The server half is working when the snapshot file appears after the server loads or after `/usage` runs:

```bash
ls -l ~/.cache/opencode/usage-report/status.json
head -c 200 ~/.cache/opencode/usage-report/status.json
```

Expected shape:

```json
{"at":1792991321547,"days":0,"calls":376,"cost":0.19497081,"tokens":1289610,"models":[...],"quota":[{"email":"...","buckets":[{"name":"claude","percent":80,...}]}]}
```

Then verify in the TUI:

1. The footer shows a segment like `today · $0.20 · 379 calls · claude 80%` (home screen, session screen, and sidebar footer).
2. In a session, run `/usage` — a per-model table is posted directly into the conversation.
3. Optionally ask the agent: "show my model usage" — it should call `usage_report`.

If the footer is missing but `status.json` exists, the CLI plugin didn't load — see Troubleshooting.

### Step 4 — Optional configuration

Only needed when the defaults don't fit:

| Variable | Default |
| --- | --- |
| `OPENCODE_USAGE_REPORT_DIR` | `~/.cache/opencode/usage-report` |
| `OPENCODE_USAGE_REPORT_STATUS` | `<dir>/status.json` |
| `OPENCODE_USAGE_REPORT_ANTIGRAVITY_ACCOUNTS` | `~/.config/opencode/antigravity-accounts.json` |

Set them in the user's shell startup file if they want a different location.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Footer shows `usage …` forever | Snapshot not written yet, or `index.ts` not loaded | Run `/usage` once, then check `status.json`; restart OpenCode |
| Footer missing entirely | CLI plugin not loaded (CLI plugins attach at TUI startup) | Fully restart OpenCode, not just reload |
| `/usage` says command not found | Server plugin not discovered | Confirm the files are at `~/.config/opencode/plugins/usage-report/{index.ts,tui.tsx}` and restart |
| No quota line | `opencode-antigravity-auth` not installed, or accounts file missing | Install that plugin and sign in; or ignore, usage still works |
| Costs all `$0` | Only Antigravity/subscription models used | Expected — check the quota line instead |
| Duplicate reports / duplicated footer | Both the two-file copy and the package install are active | Remove one: `opencode plugin remove opencode-usage-report` or delete the directory |

## Uninstall

```bash
rm -rf ~/.config/opencode/plugins/usage-report
rm -rf ~/.cache/opencode/usage-report
```

Package install:

```bash
opencode plugin remove opencode-usage-report
```

Then restart OpenCode.

## Notes

- The plugin is read-only: it reads session messages and the Antigravity accounts file, and writes one JSON snapshot under `~/.cache`.
- `cost` for non-Antigravity providers is OpenCode's estimate from models.dev pricing, not an invoice.
- `google/antigravity-*` calls are reported as `$0` because they consume the Google subscription quota, not API billing.
