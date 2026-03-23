import { AlertOctagon } from 'lucide-react'
import { AnomalyItem } from '../store/useAppStore'

interface AnomalyPanelProps {
  anomalies: AnomalyItem[]
}

const severityStyles = {
  high: 'border-rose-200 bg-rose-50 text-rose-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-sky-200 bg-sky-50 text-sky-700',
} as const

const AnomalyPanel = ({ anomalies }: AnomalyPanelProps) => {
  if (!anomalies.length) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <AlertOctagon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Anomaly Highlights</h2>
          <p className="text-sm text-slate-600">Potential spikes, drops, or outliers detected in the active analysis view.</p>
        </div>
      </div>

      <div className="space-y-3">
        {anomalies.map((anomaly) => (
          <article key={anomaly.id} className={`rounded-2xl border p-4 ${severityStyles[anomaly.severity]}`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{anomaly.title}</h3>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                {anomaly.severity}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6">{anomaly.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default AnomalyPanel
