import { ChevronRight, Filter, Focus, X } from 'lucide-react'
import { DashboardRequest } from '../store/useAppStore'

interface DrilldownPanelProps {
  request: DashboardRequest
  onClearCategories: () => void
  onClearDrilldown: () => void
  onClearAll: () => void
}

const DrilldownPanel = ({
  request,
  onClearCategories,
  onClearDrilldown,
  onClearAll,
}: DrilldownPanelProps) => {
  const categoryColumn = request.filters.categoryColumn
  const categories = request.filters.categories
  const drilldownValue = request.filters.drilldownValue
  const dateRange = request.filters.startDate || request.filters.endDate

  const breadcrumbItems = [
    'All data',
    request.preferences.metric || 'Auto metric',
    categoryColumn || request.filters.dateColumn || 'Current view',
    ...(categories.length ? categories : []),
    ...(drilldownValue ? [drilldownValue] : []),
  ]

  if (!categories.length && !drilldownValue && !dateRange) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-6 shadow-[var(--app-shadow)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-[color:var(--app-panel-strong)] p-3 text-[color:var(--app-highlight-strong)]">
          <Focus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--app-ink)]">Drill-down Focus</h2>
          <p className="text-sm text-[color:var(--app-muted)]">Chart clicks and commands are narrowing the workspace in real time.</p>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-2 text-sm font-medium text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] hover:text-[color:var(--app-highlight-strong)]"
        >
          <Filter className="h-4 w-4" />
          Clear all
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[color:var(--app-muted)]">
        {breadcrumbItems.map((item, index) => (
          <div key={`${item}-${index}`} className="inline-flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4 opacity-50" />}
            <span className="rounded-full bg-[color:var(--app-panel-strong)] px-3 py-1.5">{item}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {dateRange && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-2 text-sm text-[color:var(--app-muted)]">
            Date: {request.filters.startDate || 'Start'} to {request.filters.endDate || 'Latest'}
          </div>
        )}
        {categories.length > 0 && (
          <button
            type="button"
            onClick={onClearCategories}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-2 text-sm text-[color:var(--app-ink)]"
          >
            {categoryColumn}: {categories.join(', ')}
            <X className="h-4 w-4" />
          </button>
        )}
        {drilldownValue && (
          <button
            type="button"
            onClick={onClearDrilldown}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-2 text-sm text-[color:var(--app-ink)]"
          >
            Drill-down: {drilldownValue}
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  )
}

export default DrilldownPanel
