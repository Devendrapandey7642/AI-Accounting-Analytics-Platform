import { LineChart } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart as RechartsLineChart,
} from 'recharts'
import { DashboardRequest, ForecastSummary } from '../store/useAppStore'

interface ForecastScenarioPanelProps {
  request: DashboardRequest
  forecast: ForecastSummary
  metrics: string[]
  onChange: (request: DashboardRequest) => void
  onApply: () => void
}

const ForecastScenarioPanel = ({
  request,
  forecast,
  metrics,
  onChange,
  onApply,
}: ForecastScenarioPanelProps) => {
  const updateScenario = (patch: Partial<DashboardRequest['scenario']>) => {
    onChange({
      ...request,
      scenario: {
        ...request.scenario,
        ...patch,
      },
    })
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <LineChart className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Forecast and What-if Studio</h2>
          <p className="text-sm text-slate-600">{forecast.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Scenario Metric</span>
          <select
            value={request.scenario.metric || ''}
            onChange={(event) => updateScenario({ metric: event.target.value || null })}
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
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Adjustment %</span>
          <input
            type="number"
            value={request.scenario.adjustmentPercent}
            onChange={(event) => updateScenario({ adjustmentPercent: Number(event.target.value) || 0 })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>

        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={request.scenario.enabled}
            onChange={(event) => updateScenario({ enabled: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Enable what-if scenario
        </label>
      </div>

      {forecast.enabled && (
        <div className="mt-5 h-64 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={forecast.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={3} />
              <Line type="monotone" dataKey="forecast" stroke="#f97316" strokeWidth={3} strokeDasharray="5 5" />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      )}

      {forecast.scenarioImpact && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Baseline {forecast.scenarioImpact.baseline.toFixed(2)} to projected {forecast.scenarioImpact.projected.toFixed(2)}.
        </div>
      )}

      <button
        type="button"
        onClick={onApply}
        className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Apply Scenario
      </button>
    </section>
  )
}

export default ForecastScenarioPanel
