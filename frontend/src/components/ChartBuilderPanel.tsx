import { BarChart3 } from 'lucide-react'
import { DashboardRequest } from '../store/useAppStore'

interface ChartBuilderPanelProps {
  request: DashboardRequest
  xAxisOptions: string[]
  metrics: string[]
  onChange: (request: DashboardRequest) => void
  onApply: () => void
}

const ChartBuilderPanel = ({
  request,
  xAxisOptions,
  metrics,
  onChange,
  onApply,
}: ChartBuilderPanelProps) => {
  const updateChartBuilder = (patch: Partial<DashboardRequest['chartBuilder']>) => {
    onChange({
      ...request,
      chartBuilder: {
        ...request.chartBuilder,
        ...patch,
      },
    })
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Custom Chart Builder</h2>
          <p className="text-sm text-slate-600">Choose your own axes and chart type to pin a custom view to the dashboard.</p>
        </div>
      </div>

      <label className="mb-4 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={request.chartBuilder.enabled}
          onChange={(event) => updateChartBuilder({ enabled: event.target.checked })}
          className="h-4 w-4 rounded border-slate-300"
        />
        Enable custom chart
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Title</span>
          <input
            type="text"
            value={request.chartBuilder.title}
            onChange={(event) => updateChartBuilder({ title: event.target.value })}
            placeholder="Custom chart title"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chart Type</span>
          <select
            value={request.chartBuilder.chartType}
            onChange={(event) =>
              updateChartBuilder({
                chartType: event.target.value as DashboardRequest['chartBuilder']['chartType'],
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="bar">bar</option>
            <option value="line">line</option>
            <option value="pie">pie</option>
            <option value="scatter">scatter</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">X Axis</span>
          <select
            value={request.chartBuilder.xColumn || ''}
            onChange={(event) => updateChartBuilder({ xColumn: event.target.value || null })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="">Select axis</option>
            {xAxisOptions.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Primary Y Metric</span>
          <select
            value={request.chartBuilder.yColumns[0] || ''}
            onChange={(event) =>
              updateChartBuilder({
                yColumns: [event.target.value, request.chartBuilder.yColumns[1]].filter(Boolean),
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="">Select metric</option>
            {metrics.map((metric) => (
              <option key={metric} value={metric}>
                {metric}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Secondary Y Metric</span>
          <select
            value={request.chartBuilder.yColumns[1] || ''}
            onChange={(event) =>
              updateChartBuilder({
                yColumns: [
                  request.chartBuilder.yColumns[0],
                  event.target.value || null,
                ].filter(Boolean) as string[],
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="">Optional second metric</option>
            {metrics
              .filter((metric) => metric !== request.chartBuilder.yColumns[0])
              .map((metric) => (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={onApply}
        className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Apply Custom Chart
      </button>
    </section>
  )
}

export default ChartBuilderPanel
