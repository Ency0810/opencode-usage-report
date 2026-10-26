/**
 * usage-report TUI — a clickable `usage` entry on the bottom-most menu row.
 *
 * The host owns that row (`Server / UI / Theme / Tools / Experiments`) and does
 * not expose a slot for it, so this draws an absolute overlay right after the
 * menu text. Everything else lives behind the click / palette command.
 *
 * Reads the snapshot written by ./index.ts; no network or server calls.
 */
import { Plugin } from "@opencode/plugin/tui"
import { TextRenderable } from "@opentui/core"

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

// " ✓ Server  ○ UI  Theme  Tools  Experiments" occupies columns 0..41 in the
// host footer row. Draw one cell after it.
const MENU_END = 42
const MIN_COLUMNS = 60

export default Plugin.define({
  id: "usage-report.tui",
  async setup(context) {
    let current: Snapshot | null = null
    let timer: ReturnType<typeof setInterval> | undefined
    const renderer: any = context.renderer

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
        for (const m of top) out.push(`  ${shortModel(m.key)}  ${count(m.calls)} / ${money(m.cost)}`)
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
        current = JSON.parse(await fs.readFile(file, "utf8"))
      } catch {
        current = null
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

    const overlay = new TextRenderable(renderer, {
      content: "usage",
      position: "absolute",
      left: MENU_END + 1,
      bottom: 0,
      zIndex: 999,
      selectable: false,
      onMouseUp: (event: any) => {
        event?.preventDefault?.()
        void showReport()
      },
    })

    const place = () => {
      const cols = (process.stdout as any).columns ?? 80
      overlay.visible = cols >= MIN_COLUMNS
      overlay.left = MENU_END + 1
      overlay.bottom = 0
      renderer.requestRender?.()
    }

    renderer.root.add(overlay)
    place()
    const onResize = () => place()
    process.stdout.on("resize", onResize)

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
      process.stdout.off("resize", onResize)
      try {
        renderer.root.remove?.(overlay)
        overlay.destroy?.()
        renderer.requestRender?.()
      } catch {
        // best effort
      }
    }
  },
})
