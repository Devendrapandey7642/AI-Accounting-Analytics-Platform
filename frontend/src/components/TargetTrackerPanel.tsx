import { Target } from 'lucide-react'
import { DashboardRequest, TargetTrackingSummary } from '../store/useAppStore'

interface TargetTrackerPanelProps {
  request: DashboardRequest
  metrics: string[]
  targetTracking: TargetTrackingSummary
  onChange: (request: DashboardRequest) => void
  onApply: () => void
}

const statusStyles = {
  ahead: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  behind: 'border-rose-200 bg-rose-50 text-rose-700',
  on_track: 'border-sky-200 bg-sky-50 text-sky-700',
} as const

const TargetTrackerPanel = ({
  request,
  metrics,
  targetTracking,
  onChange,
  onApply,
}: TargetTrackerPanelProps) => {
  const updateTargets = (patch: Partial<DashboardRequest['targets']>) => {
    onChange({
      ...request,
      targets: {
        ...request.targets,
        ...patch,
      },
    })
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Target vs Actual</h2>
          <p className="text-sm text-slate-600">Define a metric target and track whether the active view is ahead or behind.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={request.targets.enabled}
            onChange={(event) => updateTargets({ enabled: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Enable target tracking
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Metric</span>
          <select
            value={request.targets.metric || ''}
            onChange={(event) => updateTargets({ metric: event.target.value || null })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="">Use active metric</option>
            {metrics.map((metric) => (
              <option key={metric} value={metric}>
                {metric}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Target Value</span>
          <input
            type="number"
            value={request.targets.targetValue}
            onChange={(event) => updateTargets({ targetValue: Number(event.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
      </div>

      {targetTracking.enabled && (
        <div className={`mt-5 rounded-2xl border p-4 ${statusStyles[targetTracking.status]}`}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em]">{targetTracking.status.replace('_', ' ')}</p>
          <p className="mt-3 text-sm leading-6">
            Actual {targetTracking.metric}: {targetTracking.actualValue.toFixed(2)} against target {targetTracking.targetValue.toFixed(2)}.
            Variance: {targetTracking.variance.toFixed(2)} ({targetTracking.variancePercent.toFixed(1)}%).
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onApply}
        className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Apply Target
      </button>
    </section>
  )
}

export default TargetTrackerPanel
