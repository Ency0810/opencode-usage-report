/**
 * usage-report TUI — a `Usage` entry on the bottom-most menu row.
 *
 * Click: a small popover anchored just above the footer (like the host's `UI`
 * menu), with a Details button that opens the full dialog.
 *
 * The host owns that row and exposes no plugin slot, so the entry is drawn as an
 * absolute overlay one cell after `Experiments`.
 */
import { Plugin } from "@opencode/plugin/tui"
import { BoxRenderable, TextRenderable } from "@opentui/core"

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
const shortModel = (key: string) => key.replace(/^[^/]+\//, "").replace(/^antigravity-/, "")
const NAME_WIDTH = 28
const row = (name: string, calls: number, cost: number) =>
  name.slice(0, NAME_WIDTH).padEnd(NAME_WIDTH) + count(calls).padStart(6) + "  " + money(cost).padStart(7)

// " ✓ Server  ○ UI  Theme  Tools  Experiments" ends at column 41.
const MENU_END = 42
const MIN_COLUMNS = 60

export default Plugin.define({
  id: "usage-report.tui",
  async setup(context) {
    const renderer: any = context.renderer
    const theme: any = context.theme
    const muted = theme?.text?.muted
    const base = theme?.text?.base
    const borderColor = theme?.border?.base
    const raised = theme?.background?.raised?.base

    let current: Snapshot | null = null
    let timer: ReturnType<typeof setInterval> | undefined
    let popupOpen = false
    let popup: any = null
    let backdrop: any = null

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
        out.push("Models".padEnd(NAME_WIDTH) + "Calls".padStart(6) + "     Cost")
        for (const m of top) out.push(row(shortModel(m.key), m.calls, m.cost))
        out.push("")
      }

      out.push("Full 30-day table: /usage")
      return out.join("\n")
    }

    const showDetails = async () => {
      if (!current) await refresh()
      if (!current) {
        context.ui.toast.show({ message: "Usage snapshot is not ready yet", variant: "warning" })
        return
      }
      await context.ui.dialog.alert({ title: "Model usage — today", message: summary(current) })
    }

    const closePopup = () => {
      if (backdrop) {
        try {
          renderer.root.remove?.(backdrop)
          backdrop.destroy?.()
        } catch {
          // best effort
        }
        backdrop = null
      }
      if (popup) {
        try {
          renderer.root.remove?.(popup)
          popup.destroy?.()
        } catch {
          // best effort
        }
        popup = null
      }
      popupOpen = false
      renderer.requestRender?.()
    }

    const openPopup = async () => {
      closePopup()
      if (!current) await refresh()

      const s = current
      const top = [...(s?.models ?? [])].sort((a, b) => b.calls - a.calls).slice(0, 5)
      const lines = [
        `Today   ${money(s?.cost ?? 0)} · ${count(s?.calls ?? 0)} calls`,
        ...top.map((m) => row(shortModel(m.key), m.calls, m.cost)),
      ]
      const width = Math.max(...lines.map((line) => line.length), "▸ Details".length) + 4
      const cols = (process.stdout as any).columns ?? 80
      const left = Math.max(1, Math.min(MENU_END + 2, cols - width - 1))

      backdrop = new BoxRenderable(renderer, {
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        zIndex: 1000,
        onMouseUp: () => closePopup(),
      })

      popup = new BoxRenderable(renderer, {
        position: "absolute",
        left,
        bottom: 1,
        width,
        height: lines.length + 3,
        zIndex: 1001,
        border: true,
        flexDirection: "column",
        paddingLeft: 1,
        paddingRight: 1,
        ...(borderColor ? { borderColor } : {}),
        ...(raised ? { backgroundColor: raised } : {}),
      })

      for (const line of lines) {
        popup.add(
          new TextRenderable(renderer, {
            content: line,
            selectable: false,
            ...(base ? { fg: base } : {}),
          }),
        )
      }

      const details = new TextRenderable(renderer, {
        content: "▸ Details",
        selectable: false,
        ...(muted ? { fg: muted } : {}),
        onMouseOver: () => {
          if (base) details.fg = base
          renderer.requestRender?.()
        },
        onMouseOut: () => {
          if (muted) details.fg = muted
          renderer.requestRender?.()
        },
        onMouseUp: (event: any) => {
          event?.preventDefault?.()
          closePopup()
          void showDetails()
        },
      })
      popup.add(details)

      renderer.root.add(backdrop)
      renderer.root.add(popup)
      popupOpen = true
      renderer.requestRender?.()
    }

    await refresh()
    timer = setInterval(() => void refresh(), 15_000)

    const entry = new TextRenderable(renderer, {
      content: "Usage",
      position: "absolute",
      left: MENU_END + 2,
      bottom: 0,
      zIndex: 999,
      selectable: false,
      ...(muted ? { fg: muted } : {}),
      onMouseOver: () => {
        if (base) entry.fg = base
        renderer.requestRender?.()
      },
      onMouseOut: () => {
        if (muted) entry.fg = muted
        renderer.requestRender?.()
      },
      onMouseUp: (event: any) => {
        event?.preventDefault?.()
        if (popupOpen) closePopup()
        else void openPopup()
      },
    })

    const place = () => {
      const cols = (process.stdout as any).columns ?? 80
      entry.visible = cols >= MIN_COLUMNS
      entry.left = MENU_END + 2
      entry.bottom = 0
      if (popupOpen) {
        closePopup()
      }
      renderer.requestRender?.()
    }

    renderer.root.add(entry)
    place()
    const onResize = () => place()
    process.stdout.on("resize", onResize)

    context.keymap.layer(() => ({
      mode: "global",
      priority: 5,
      commands: [
        {
          id: "usage-report.close",
          bind: "escape",
          enabled: () => popupOpen,
          run: () => {
            closePopup()
            return false
          },
        },
      ],
    }))

    return () => {
      if (timer) clearInterval(timer)
      process.stdout.off("resize", onResize)
      closePopup()
      try {
        renderer.root.remove?.(entry)
        entry.destroy?.()
        renderer.requestRender?.()
      } catch {
        // best effort
      }
    }
  },
})
