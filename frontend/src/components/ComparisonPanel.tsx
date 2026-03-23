import { GitCompareArrows } from 'lucide-react'
import { ComparisonSummary, KpiUnit } from '../store/useAppStore'

interface ComparisonPanelProps {
  comparison: ComparisonSummary
}

const formatValue = (value: number, unit: KpiUnit) => {
  if (unit === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (unit === 'percentage') {
    return `${value.toFixed(1)}%`
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

const ComparisonPanel = ({ comparison }: ComparisonPanelProps) => {
  if (!comparison.enabled || comparison.cards.length === 0) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <GitCompareArrows className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Compare Mode</h2>
          <p className="text-sm text-slate-600">
            {comparison.label} against {comparison.baselineLabel.toLowerCase()}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {comparison.cards.map((card) => (
          <article key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.title}</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{formatValue(card.current, card.unit)}</p>
            <p className="mt-2 text-sm text-slate-600">Baseline: {formatValue(card.previous, card.unit)}</p>
            <p className={`mt-3 text-sm font-semibold ${card.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {card.delta >= 0 ? '+' : ''}
              {card.deltaPercent.toFixed(1)}%
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ComparisonPanel
