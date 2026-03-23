import { Gauge } from 'lucide-react'
import { BenchmarkSummary } from '../store/useAppStore'

interface BenchmarkPanelProps {
  benchmark: BenchmarkSummary
}

const BenchmarkPanel = ({ benchmark }: BenchmarkPanelProps) => {
  if (!benchmark.enabled) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Benchmark Mode</h2>
          <p className="text-sm text-slate-600">Compare the active view against a benchmark upload.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{benchmark.baselineLabel}</p>
        <p className="mt-3 text-2xl font-bold text-slate-900">
          {benchmark.deltaPercent.toFixed(1)}%
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {benchmark.metric || 'Selected metric'} current {benchmark.current.toFixed(2)} vs baseline {benchmark.baseline.toFixed(2)}.
        </p>
      </div>
    </section>
  )
}

export default BenchmarkPanel
