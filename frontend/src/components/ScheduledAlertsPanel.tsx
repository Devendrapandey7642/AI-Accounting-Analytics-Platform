import { BellDot } from 'lucide-react'
import { AlertItem, NumericSummaryEntry } from '../store/useAppStore'

export interface ScheduledAlertRule {
  id: string
  name: string
  metric: string | null
  condition: 'above' | 'below' | 'alert'
  threshold: number
  channel: 'email' | 'webhook' | 'slack'
  frequency: 'hourly' | 'daily' | 'weekly'
  active: boolean
}

interface ScheduledAlertsPanelProps {
  rules: ScheduledAlertRule[]
  metrics: string[]
  numericSummary: Record<string, NumericSummaryEntry>
  alerts: AlertItem[]
  onAdd: (rule: ScheduledAlertRule) => void
  onUpdate: (id: string, updates: Partial<ScheduledAlertRule>) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

const ScheduledAlertsPanel = ({
  rules,
  metrics,
  numericSummary,
  alerts,
  onAdd,
  onUpdate,
  onToggle,
  onDelete,
}: ScheduledAlertsPanelProps) => {
  const createRule = () => {
    const defaultMetric = metrics[0] || null
    onAdd({
      id: `${Date.now()}`,
      name: defaultMetric ? `${defaultMetric} watch` : 'Alert rule',
      metric: defaultMetric,
      condition: 'alert',
      threshold: 0,
      channel: 'email',
      frequency: 'daily',
      active: true,
    })
  }

  const isTriggered = (rule: ScheduledAlertRule) => {
    if (!rule.active) {
      return false
    }
    if (rule.condition === 'alert') {
      return alerts.length > 0
    }
    if (!rule.metric) {
      return false
    }
    const currentValue = numericSummary[rule.metric]?.sum ?? 0
    return rule.condition === 'above' ? currentValue >= rule.threshold : currentValue <= rule.threshold
  }

  const triggeredCount = rules.filter(isTriggered).length
  const activeCount = rules.filter((rule) => rule.active).length

  return (
    <section className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-6 shadow-[var(--app-shadow)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-3 text-[color:var(--app-highlight-strong)]">
            <BellDot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--app-ink)]">Scheduled Alerts</h2>
            <p className="text-sm text-[color:var(--app-muted)]">Create alert rules, tune delivery settings, and preview whether they trigger on the current dashboard state.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={createRule}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Rule
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">Active</p>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--app-ink)]">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">Triggered</p>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--app-ink)]">{triggeredCount}</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">Live alerts</p>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--app-ink)]">{alerts.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {rules.length === 0 ? (
          <p className="text-sm text-[color:var(--app-muted)]">No scheduled alerts yet.</p>
        ) : (
          rules.map((rule) => (
            <article key={rule.id} className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--app-ink)]">{rule.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--app-muted)]">
                    {rule.frequency} / {rule.channel} / {rule.condition}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                    isTriggered(rule) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isTriggered(rule) ? 'triggered' : 'clear'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={rule.name}
                  onChange={(event) => onUpdate(rule.id, { name: event.target.value })}
                  placeholder="Rule name"
                  className="rounded-xl border border-[color:var(--app-panel-border)] bg-white/70 px-4 py-3 text-sm text-[color:var(--app-ink)] outline-none focus:border-[color:var(--app-highlight-strong)]"
                />
                <select
                  value={rule.metric || ''}
                  onChange={(event) =>
                    onUpdate(rule.id, {
                      metric: event.target.value || null,
                      name: event.target.value ? `${event.target.value} watch` : rule.name,
                    })
                  }
                  className="rounded-xl border border-[color:var(--app-panel-border)] bg-white/70 px-4 py-3 text-sm text-[color:var(--app-ink)] outline-none focus:border-[color:var(--app-highlight-strong)]"
                >
                  <option value="">Any live alert</option>
                  {metrics.map((metric) => (
                    <option key={metric} value={metric}>
                      {metric}
                    </option>
                  ))}
                </select>
                <select
                  value={rule.condition}
                  onChange={(event) =>
                    onUpdate(rule.id, {
                      condition: event.target.value as ScheduledAlertRule['condition'],
                    })
                  }
                  className="rounded-xl border border-[color:var(--app-panel-border)] bg-white/70 px-4 py-3 text-sm text-[color:var(--app-ink)] outline-none focus:border-[color:var(--app-highlight-strong)]"
                >
                  <option value="alert">Any alert</option>
                  <option value="above">Above threshold</option>
                  <option value="below">Below threshold</option>
                </select>
                <input
                  type="number"
                  value={rule.threshold}
                  disabled={rule.condition === 'alert'}
                  onChange={(event) => onUpdate(rule.id, { threshold: Number(event.target.value) || 0 })}
                  className="rounded-xl border border-[color:var(--app-panel-border)] bg-white/70 px-4 py-3 text-sm text-[color:var(--app-ink)] outline-none focus:border-[color:var(--app-highlight-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <select
                  value={rule.channel}
                  onChange={(event) =>
                    onUpdate(rule.id, {
                      channel: event.target.value as ScheduledAlertRule['channel'],
                    })
                  }
                  className="rounded-xl border border-[color:var(--app-panel-border)] bg-white/70 px-4 py-3 text-sm text-[color:var(--app-ink)] outline-none focus:border-[color:var(--app-highlight-strong)]"
                >
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                  <option value="slack">Slack</option>
                </select>
                <select
                  value={rule.frequency}
                  onChange={(event) =>
                    onUpdate(rule.id, {
                      frequency: event.target.value as ScheduledAlertRule['frequency'],
                    })
                  }
                  className="rounded-xl border border-[color:var(--app-panel-border)] bg-white/70 px-4 py-3 text-sm text-[color:var(--app-ink)] outline-none focus:border-[color:var(--app-highlight-strong)]"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {rule.metric && (
                <p className="mt-3 text-sm text-[color:var(--app-muted)]">
                  Current value for {rule.metric}: {(numericSummary[rule.metric]?.sum ?? 0).toLocaleString()} / threshold: {rule.threshold}
                </p>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => onToggle(rule.id)}
                  className="rounded-xl border border-[color:var(--app-panel-border)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--app-muted)] transition hover:border-[color:var(--app-highlight-strong)]"
                >
                  {rule.active ? 'Pause' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(rule.id)}
                  className="rounded-xl border border-[color:var(--app-panel-border)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--app-muted)] transition hover:border-[color:var(--app-highlight-strong)]"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default ScheduledAlertsPanel
