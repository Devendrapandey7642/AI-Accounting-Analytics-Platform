import { BellRing } from 'lucide-react'
import { AlertItem } from '../store/useAppStore'

interface AlertCenterProps {
  alerts: AlertItem[]
}

const severityStyles = {
  high: 'border-rose-200 bg-rose-50 text-rose-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-sky-200 bg-sky-50 text-sky-700',
} as const

const AlertCenter = ({ alerts }: AlertCenterProps) => {
  if (!alerts.length) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Alert Center</h2>
          <p className="text-sm text-slate-600">Operational alerts generated from anomalies, quality checks, and scenarios.</p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <article key={alert.id} className={`rounded-2xl border p-4 ${severityStyles[alert.severity]}`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{alert.title}</h3>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                {alert.kind}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6">{alert.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default AlertCenter
