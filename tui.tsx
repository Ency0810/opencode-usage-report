/**
 * usage-report TUI — compact usage/cost in the task-detail sidebar, plus a
 * clickable `usage` entry in the home footer status row.
 *
 * Reads the snapshot written by ./index.ts; no network or server calls.
 */
import { Plugin } from "@opencode/plugin/tui"

type QuotaBucket = { name: string; percent: number; reset: string }
type QuotaAccount = { email: string; buckets: QuotaBucket[] }
type ModelUsage = { key: string; calls: number; cost: number; tokens: number }
type Snapshot = {
  at: number
  days: number
  calls: number
  cost: number
  tokens: number
  models: ModelUsage[]
  quota: QuotaAccount[]
}

const money = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`)
const count = (n: number) => Math.round(n).toLocaleString("en-US")
const compactTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n)
const shortModel = (key: string) => key.replace("google/antigravity-", "").replace(/^google\//, "")

export default Plugin.define({
  id: "usage-report.tui",
  async setup(context) {
    const [view, updateView] = context.storage.memory("usage-status", {
      initial: { ready: false, text: "usage …" },
    })

    let current: Snapshot | null = null
    let timer: ReturnType<typeof setInterval> | undefined

    const line = (s: Snapshot): string => {
      const claude = s.quota
        ?.flatMap((a) => a.buckets ?? [])
        .find((b) => b.name === "claude" && typeof b.percent === "number")
      const parts = ["today", money(s.cost), `${count(s.calls)} calls`]
      if (claude) parts.push(`claude ${claude.percent}%`)
      return parts.join(" · ")
    }

    const summary = (s: Snapshot): string => {
      const out: string[] = []
      out.push(`Today · ${money(s.cost)} · ${count(s.calls)} calls · ${compactTokens(s.tokens)} tokens`)
      out.push("")

      const buckets = (s.quota ?? []).flatMap((a) => a.buckets ?? [])
      if (buckets.length > 0) {
        out.push("Antigravity quota")
        for (const b of buckets) out.push(`  ${b.name}: ${b.percent}%${b.reset ? ` (resets ${b.reset})` : ""}`)
        out.push("")
      }

      const top = [...(s.models ?? [])].sort((a, b) => b.calls - a.calls).slice(0, 8)
      if (top.length > 0) {
        out.push("Models (calls / cost)")
        for (const m of top) {
          out.push(`  ${shortModel(m.key)}  ${count(m.calls)} / ${money(m.cost)}`)
        }
        out.push("")
      }

      out.push("Full 30-day table: /usage")
      return out.join("\n")
    }

    const refresh = async () => {
      try {
        const fs = await import("node:fs/promises")
        const os = await import("node:os")
        const path = await import("node:path")
        const dir =
          process.env.OPENCODE_USAGE_REPORT_DIR ??
          path.join(os.homedir(), ".cache", "opencode", "usage-report")
        const file = process.env.OPENCODE_USAGE_REPORT_STATUS ?? path.join(dir, "status.json")
        const data: Snapshot = JSON.parse(await fs.readFile(file, "utf8"))
        current = data
        updateView((draft) => {
          draft.ready = true
          draft.text = line(data)
        })
      } catch {
        updateView((draft) => {
          draft.ready = false
          draft.text = "usage …"
        })
      }
    }

    const showReport = async () => {
      if (!current) await refresh()
      if (!current) {
        context.ui.toast.show({ message: "Usage snapshot is not ready yet", variant: "warning" })
        return
      }
      await context.ui.dialog.alert({ title: "Model usage — today", message: summary(current) })
    }

    await refresh()
    timer = setInterval(() => void refresh(), 15_000)

    const UsageEntry = () => (
      <text
        selectable={false}
        onMouseDown={(event: any) => {
          event?.preventDefault?.()
          void showReport()
        }}
      >
        usage
      </text>
    )

    const UsageLine = () => (
      <text
        selectable={false}
        onMouseDown={(event: any) => {
          event?.preventDefault?.()
          void showReport()
        }}
      >
        {view.text}
      </text>
    )

    const unregisterHome = context.ui.slot({
      append: "home.footer.status",
      render: () => <UsageEntry />,
    })
    const unregisterSidebar = context.ui.slot({
      append: "sidebar.footer",
      render: () => <UsageLine />,
    })

    context.keymap.layer(() => ({
      mode: "global",
      priority: 5,
      commands: [
        {
          id: "usage-report.show",
          title: "Usage: show report",
          group: "Usage",
          palette: true,
          run: () => void showReport(),
        },
      ],
    }))

    return () => {
      if (timer) clearInterval(timer)
      unregisterHome?.()
      unregisterSidebar?.()
    }
  },
})
