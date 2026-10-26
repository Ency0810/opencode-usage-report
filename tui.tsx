/**
 * usage-report TUI — shows a compact usage/cost line in the footer status row.
 * Reads the snapshot written by ./index.ts; no network or server calls.
 */
import { Plugin } from "@opencode/plugin/tui"

type QuotaBucket = { name: string; percent: number; reset: string }
type QuotaAccount = { email: string; buckets: QuotaBucket[] }
type Snapshot = {
  at: number
  days: number
  calls: number
  cost: number
  tokens: number
  models: { key: string; calls: number; cost: number; tokens: number }[]
  quota: QuotaAccount[]
}

export default Plugin.define({
  id: "usage-report.tui",
  async setup(context) {
    const [view, updateView] = context.storage.memory("usage-status", {
      initial: { ready: false, text: "usage …" },
    })

    let timer: ReturnType<typeof setInterval> | undefined

    const format = (s: Snapshot): string => {
      const claude = s.quota
        ?.flatMap((a) => a.buckets ?? [])
        .find((b) => b.name === "claude" && typeof b.percent === "number")
      const cost = s.cost === 0 ? "$0" : s.cost < 0.01 ? `$${s.cost.toFixed(4)}` : `$${s.cost.toFixed(2)}`
      const parts = ["today", cost, `${s.calls} calls`]
      if (claude) parts.push(`claude ${claude.percent}%`)
      return parts.join(" · ")
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
        updateView((draft) => {
          draft.ready = true
          draft.text = format(data)
        })
      } catch {
        updateView((draft) => {
          draft.ready = false
          draft.text = "usage …"
        })
      }
    }

    await refresh()
    timer = setInterval(() => void refresh(), 15_000)

    const View = () => <text>{view.text}</text>

    const unregisterPrompt = context.ui.slot({
      append: "prompt.footer.status",
      render: () => <View />,
    })
    const unregisterHome = context.ui.slot({
      append: "home.footer.status",
      render: () => <View />,
    })
    const unregisterSidebar = context.ui.slot({
      append: "sidebar.footer",
      render: () => <View />,
    })

    return () => {
      if (timer) clearInterval(timer)
      unregisterPrompt?.()
      unregisterHome?.()
      unregisterSidebar?.()
    }
  },
})
