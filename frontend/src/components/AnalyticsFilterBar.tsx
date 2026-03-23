import { Filter, RotateCcw, Save } from 'lucide-react'
import { DashboardRequest, FilterOptions } from '../store/useAppStore'

interface AnalyticsFilterBarProps {
  draftRequest: DashboardRequest
  filterOptions: FilterOptions
  onChange: (request: DashboardRequest) => void
  onApply: () => void
  onReset: () => void
  onSaveView: () => void
}

const AnalyticsFilterBar = ({
  draftRequest,
  filterOptions,
  onChange,
  onApply,
  onReset,
  onSaveView,
}: AnalyticsFilterBarProps) => {
  const selectedCategoryColumn = draftRequest.filters.categoryColumn || filterOptions.categoricalColumns[0] || null
  const categoryValues = selectedCategoryColumn ? filterOptions.categoryValues[selectedCategoryColumn] || [] : []
  const selectedDateColumn = draftRequest.filters.dateColumn || filterOptions.dateColumns[0] || null
  const selectedDateRange = selectedDateColumn ? filterOptions.dateRanges[selectedDateColumn] : undefined

  const updateRequest = (updater: (current: DashboardRequest) => DashboardRequest) => {
    onChange(updater(draftRequest))
  }

  const toggleCategory = (value: string) => {
    updateRequest((current) => {
      const categories = current.filters.categories.includes(value)
        ? current.filters.categories.filter((item) => item !== value)
        : [...current.filters.categories, value]

      return {
        ...current,
        filters: {
          ...current.filters,
          categoryColumn: selectedCategoryColumn,
          categories,
        },
      }
    })
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Smart Filters</h2>
            <p className="text-sm text-slate-600">Tune the dashboard by metric, time grain, categories, and compare mode.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onSaveView}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
          >
            <Save className="h-4 w-4" />
            Save View
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dashboard Role</span>
          <select
            value={draftRequest.preferences.dashboardRole}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                preferences: {
                  ...current.preferences,
                  dashboardRole: event.target.value as DashboardRequest['preferences']['dashboardRole'],
                },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            {filterOptions.dashboardRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Metric</span>
          <select
            value={draftRequest.preferences.metric || ''}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                preferences: { ...current.preferences, metric: event.target.value || null },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            {filterOptions.metrics.map((metric) => (
              <option key={metric} value={metric}>
                {metric}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Secondary Metric</span>
          <select
            value={draftRequest.preferences.secondaryMetric || ''}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                preferences: { ...current.preferences, secondaryMetric: event.target.value || null },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="">None</option>
            {filterOptions.metrics
              .filter((metric) => metric !== draftRequest.preferences.metric)
              .map((metric) => (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Aggregation</span>
          <select
            value={draftRequest.preferences.aggregation}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                preferences: { ...current.preferences, aggregation: event.target.value as DashboardRequest['preferences']['aggregation'] },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            {filterOptions.aggregations.map((aggregation) => (
              <option key={aggregation} value={aggregation}>
                {aggregation}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Granularity</span>
          <select
            value={draftRequest.preferences.granularity}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                preferences: { ...current.preferences, granularity: event.target.value as DashboardRequest['preferences']['granularity'] },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            {filterOptions.granularities.map((granularity) => (
              <option key={granularity} value={granularity}>
                {granularity}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chart Preference</span>
          <select
            value={draftRequest.preferences.chartPreference}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                preferences: {
                  ...current.preferences,
                  chartPreference: event.target.value as DashboardRequest['preferences']['chartPreference'],
                },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="auto">auto</option>
            <option value="line">line</option>
            <option value="bar">bar</option>
            <option value="pie">pie</option>
            <option value="scatter">scatter</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Date Column</span>
          <select
            value={selectedDateColumn || ''}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                filters: {
                  ...current.filters,
                  dateColumn: event.target.value || null,
                  startDate: '',
                  endDate: '',
                },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="">None</option>
            {filterOptions.dateColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Start Date</span>
          <input
            type="date"
            min={selectedDateRange?.min || undefined}
            max={selectedDateRange?.max || undefined}
            value={draftRequest.filters.startDate}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                filters: { ...current.filters, startDate: event.target.value },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">End Date</span>
          <input
            type="date"
            min={selectedDateRange?.min || undefined}
            max={selectedDateRange?.max || undefined}
            value={draftRequest.filters.endDate}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                filters: { ...current.filters, endDate: event.target.value },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Category Column</span>
          <select
            value={selectedCategoryColumn || ''}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                filters: {
                  ...current.filters,
                  categoryColumn: event.target.value || null,
                  categories: [],
                },
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="">None</option>
            {filterOptions.categoricalColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Top N</span>
            <input
              type="number"
              min={3}
              max={20}
              value={draftRequest.preferences.topN}
              onChange={(event) =>
                updateRequest((current) => ({
                  ...current,
                  preferences: { ...current.preferences, topN: Number(event.target.value) || 8 },
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sort</span>
            <select
              value={draftRequest.preferences.sortOrder}
              onChange={(event) =>
                updateRequest((current) => ({
                  ...current,
                  preferences: { ...current.preferences, sortOrder: event.target.value as DashboardRequest['preferences']['sortOrder'] },
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            >
              {filterOptions.sortOrders.map((sortOrder) => (
                <option key={sortOrder} value={sortOrder}>
                  {sortOrder}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-50 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cross Filter Categories</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {categoryValues.slice(0, 10).map((value) => {
              const active = draftRequest.filters.categories.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleCategory(value)}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>

        <label className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 xl:w-auto xl:justify-start">
          <input
            type="checkbox"
            checked={draftRequest.preferences.compareMode}
            onChange={(event) =>
              updateRequest((current) => ({
                ...current,
                preferences: { ...current.preferences, compareMode: event.target.checked },
              }))
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Compare with baseline
        </label>
      </div>
    </section>
  )
}

export default AnalyticsFilterBar
