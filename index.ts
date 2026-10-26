/**
 * usage-report — per-model token usage and cost, plus Antigravity quota.
 *
 * Server-side part:
 *   tool    usage_report   (the agent can ask for the table)
 *   command /usage         (prints the table into the session)
 *   snapshot               (writes today's totals for the TUI status slot)
 */
import { Plugin } from "@opencode/plugin"

type Bucket = {
  model: string
  provider: string
  steps: number
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  cost: number
}

type QuotaBucket = { name: string; percent: number; reset: string }
type QuotaAccount = { email: string; buckets: QuotaBucket[] }

type Report = {
  text: string
  days: number
  rows: Bucket[]
  quota: QuotaAccount[]
  totals: { steps: number; tokens: number; cost: number; models: number; sessions: number }
}

const DAY_MS = 86_400_000

const fmt = (n: number) => Math.round(n).toLocaleString("en-US")
const usd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`)

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export default Plugin.define({
  id: "usage-report",
  async setup(ctx) {
    let cache: { at: number; report: Report } | undefined

    async function readQuota(): Promise<QuotaAccount[]> {
      try {
        const fs = await import("node:fs/promises")
        const os = await import("node:os")
        const path = await import("node:path")
        const file =
          process.env.OPENCODE_USAGE_REPORT_ANTIGRAVITY_ACCOUNTS ??
          path.join(os.homedir(), ".config", "opencode", "antigravity-accounts.json")
        const raw = JSON.parse(await fs.readFile(file, "utf8"))
        const accounts = (raw.accounts ?? []).filter((a: any) => a.enabled !== false)
        return accounts.map((a: any) => {
          const quota = a.cachedQuota ?? {}
          const buckets: QuotaBucket[] = Object.entries(quota).map(([name, v]: [string, any]) => ({
            name,
            percent: Math.round((v?.remainingFraction ?? 0) * 100),
            reset: v?.resetTime
              ? new Date(v.resetTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
              : "?",
          }))
          return { email: a.email ?? "account", buckets }
        })
      } catch {
        return []
      }
    }

    async function build(days: number, force = false): Promise<Report> {
      if (!force && cache && Date.now() - cache.at < 30_000) return cache.report

      const cutoff = days <= 0 ? startOfToday() : Date.now() - days * DAY_MS
      const byModel = new Map<string, Bucket>()
      let sessions = 0
      let cursor: string | undefined

      do {
        const page: any = await ctx.session.list({ limit: 100, ...(cursor ? { cursor } : {}) })
        const items: any[] = page?.data ?? page?.items ?? []
        for (const s of items) {
          const updated: number = s?.time?.updated ?? s?.time?.created ?? 0
          if (updated < cutoff) continue
          sessions++

          const messages: any[] = await ctx.session.context({ sessionID: s.id })
          for (const m of messages) {
            if (m?.type !== "assistant" || !m?.model) continue
            const created: number = m?.time?.created ?? 0
            if (created < cutoff) continue

            const provider: string = m.model.providerID ?? "?"
            const modelID: string = m.model.id ?? "?"
            const variant: string | undefined = m.model.variant
            const key =
              variant && variant !== "default" ? `${provider}/${modelID}#${variant}` : `${provider}/${modelID}`

            const t = m.tokens ?? {}
            const b = byModel.get(key) ?? {
              model: modelID,
              provider,
              steps: 0,
              input: 0,
              output: 0,
              reasoning: 0,
              cacheRead: 0,
              cacheWrite: 0,
              cost: 0,
            }
            b.steps++
            b.input += t.input ?? 0
            b.output += t.output ?? 0
            b.reasoning += t.reasoning ?? 0
            b.cacheRead += t.cache?.read ?? 0
            b.cacheWrite += t.cache?.write ?? 0
            b.cost += m.cost ?? 0
            byModel.set(key, b)
          }
        }
        const next = page?.cursor?.next ?? page?.next
        cursor = typeof next === "string" && next.length > 0 ? next : undefined
      } while (cursor)

      const rows = [...byModel.values()].sort((a, b) => b.cost - a.cost || b.input + b.output - (a.input + a.output))
      const totals = rows.reduce(
        (acc, r) => {
          acc.steps += r.steps
          acc.tokens += r.input + r.output + r.reasoning
          acc.cost += r.cost
          return acc
        },
        { steps: 0, tokens: 0, cost: 0, models: rows.length, sessions },
      )
      const quota = await readQuota()
      const report = { text: render(days, rows, totals, quota), days, rows, quota, totals }
      cache = { at: Date.now(), report }
      return report
    }

    function render(
      days: number,
      rows: Bucket[],
      totals: Report["totals"],
      quota: QuotaAccount[],
    ): string {
      const label = (r: Bucket) =>
        r.provider === "google" && r.model.startsWith("antigravity-") ? `\`${r.model}\`（訂閱）` : `\`${r.provider}/${r.model}\``

      if (rows.length === 0) {
        return `### 模型用量\n\n最近 ${days <= 0 ? "今天" : `${days} 天`} 沒有可統計的對話紀錄。`
      }

      const lines: string[] = []
      lines.push(`### 模型用量（${days <= 0 ? "今天" : `最近 ${days} 天`}）`)
      lines.push("")
      lines.push("| 模型 | 呼叫 | Input | Output | Reasoning | Cache read | Cache write | 成本 |")
      lines.push("|---|---:|---:|---:|---:|---:|---:|---:|")
      for (const r of rows) {
        lines.push(
          `| ${label(r)} | ${fmt(r.steps)} | ${fmt(r.input)} | ${fmt(r.output)} | ${fmt(r.reasoning)} | ${fmt(r.cacheRead)} | ${fmt(r.cacheWrite)} | ${usd(r.cost)} |`,
        )
      }
      lines.push(`| **合計** | **${fmt(totals.steps)}** | | | | | | **${usd(totals.cost)}** |`)
      lines.push("")
      lines.push(
        `共 ${totals.sessions} 個 session、${totals.models} 個模型、${fmt(totals.tokens)} tokens（input+output+reasoning）。`,
      )

      const subscription = rows.filter((r) => r.provider === "google" && r.model.startsWith("antigravity-"))
      if (subscription.length > 0) {
        lines.push("")
        lines.push("> Antigravity 模型走 Google 訂閱配額，OpenCode 端成本一律記為 $0，**不會產生 API 費用**；用量請看下方配額。")
      }
      if (rows.some((r) => !(r.provider === "google" && r.model.startsWith("antigravity-")))) {
        lines.push("> 其他 provider 的金額是 OpenCode 依 models.dev 公開單價估算的參考值。")
      }

      if (quota.length > 0) {
        lines.push("")
        lines.push("**Antigravity 剩餘配額**")
        for (const a of quota) {
          const parts = a.buckets.map((b) => `${b.name} ${b.percent}%（${b.reset} 重置）`)
          lines.push(`- ${a.email}：${parts.length ? parts.join("、") : "無配額資料"}`)
        }
      }
      return lines.join("\n")
    }

    async function writeStatus(report: Report) {
      try {
        const fs = await import("node:fs/promises")
        const os = await import("node:os")
        const path = await import("node:path")
        const dir =
          process.env.OPENCODE_USAGE_REPORT_DIR ??
          path.join(os.homedir(), ".cache", "opencode", "usage-report")
        await fs.mkdir(dir, { recursive: true })
        const payload = {
          at: Date.now(),
          days: report.days,
          calls: report.totals.steps,
          cost: report.totals.cost,
          tokens: report.totals.tokens,
          models: report.rows.map((r) => ({
            key: `${r.provider}/${r.model}`,
            calls: r.steps,
            cost: r.cost,
            tokens: r.input + r.output + r.reasoning,
          })),
          quota: report.quota,
        }
        await fs.writeFile(path.join(dir, "status.json"), JSON.stringify(payload))
      } catch {
        // status snapshot is best effort
      }
    }

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "usage_report",
        description:
          "Show per-model token usage, request counts and estimated cost for this machine, optionally limited to the last N days, plus remaining Antigravity quota. Use when the user asks about usage, tokens, cost or billing.",
        input: {
          type: "object",
          properties: {
            days: {
              type: "number",
              description: "Only include the last N days. Use 0 for today only. Defaults to 30.",
            },
            refresh: { type: "boolean", description: "Bypass the 30 second cache." },
          },
          additionalProperties: false,
        },
        execute: async (input: any) => {
          const days = typeof input?.days === "number" && input.days >= 0 ? input.days : 30
          const report = await build(days, input?.refresh === true)
          return { content: report.text }
        },
      })
    })

    await ctx.command.transform((editor) => {
      editor.add({
        name: "usage",
        description: "Show per-model token usage, cost and Antigravity quota",
        execute: async ({ sessionID, prompt }: any) => {
          const text = prompt?.text ?? ""
          const days = /--days\s+(\d+)|(\d+)\s*d\b|(\d+)\s*天/.exec(text)
          const parsed = days ? Number(days[1] ?? days[2] ?? days[3]) : 30
          const report = await build(Number.isFinite(parsed) ? parsed : 30, true)
          await ctx.session.synthetic({ sessionID, text: report.text, description: "usage report" })
        },
      })
    })

    const tick = async () => {
      try {
        await writeStatus(await build(0, true))
      } catch {
        // ignore background refresh failures
      }
    }
    void tick()
    const timer = setInterval(() => void tick(), 300_000)
    return () => clearInterval(timer)
  },
})
