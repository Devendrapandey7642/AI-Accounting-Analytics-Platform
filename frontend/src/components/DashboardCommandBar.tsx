import { Clock3, Command, Filter, Loader2, Sparkles, Wand2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DashboardCommandDetails, DashboardRequest, DatasetSummary } from '../store/useAppStore'

interface DashboardCommandBarProps {
  onRun: (query: string, mode: 'manual' | 'live') => Promise<void>
  loading: boolean
  resultMessage: string
  commandDetails: DashboardCommandDetails | null
  lastAppliedCommand: string
  recentCommands: string[]
  suggestions: string[]
  activeRequest: DashboardRequest | null
  dataset: DatasetSummary | null
  chartCount: number
}

const fallbackSuggestions = [
  'last 90 days average sales, founder view',
  'show top 5 categories by revenue',
  'profit kyu gira',
  'top 3 loss making categories',
  'compare with upload 1 and manager view',
  'increase sales by 12 and make a line chart',
]

const DashboardCommandBar = ({
  onRun,
  loading,
  resultMessage,
  commandDetails,
  lastAppliedCommand,
  recentCommands,
  suggestions,
  activeRequest,
  dataset,
  chartCount,
}: DashboardCommandBarProps) => {
  const [query, setQuery] = useState('')
  const latestOnRunRef = useRef(onRun)
  const lastAutoQueryRef = useRef('')

  useEffect(() => {
    latestOnRunRef.current = onRun
  }, [onRun])

  const executeCommand = async (value: string, mode: 'manual' | 'live') => {
    const normalized = value.trim()
    if (!normalized || loading) {
      return
    }

    lastAutoQueryRef.current = normalized
    await latestOnRunRef.current(normalized, mode)
  }

  useEffect(() => {
    const normalized = query.trim()
    if (!normalized || normalized.length < 5 || loading || normalized === lastAutoQueryRef.current) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      lastAutoQueryRef.current = normalized
      void latestOnRunRef.current(normalized, 'live')
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [query, loading])

  const liveRows = dataset ? dataset.filteredRows || dataset.rows : null
  const summaryItems = [
    { label: 'Rows', value: liveRows ? `${liveRows}` : 'Live' },
    { label: 'Charts', value: `${chartCount}` },
    { label: 'Metric', value: activeRequest?.preferences.metric || 'Auto' },
    { label: 'Role', value: activeRequest?.preferences.dashboardRole || 'Analyst' },
    { label: 'Workspace', value: activeRequest?.workspace.mode || 'compare' },
    {
      label: 'Chart style',
      value:
        (activeRequest?.chartBuilder.enabled && activeRequest.chartBuilder.chartType) ||
        activeRequest?.preferences.chartPreference ||
        'auto',
    },
  ]

  const helperMessage = query.trim()
    ? loading
      ? 'Updating charts, insights, filters, and workspace panels from your command...'
      : 'Pause typing for a live preview, or press Enter to lock the command in.'
    : 'Type a question or instruction here. The dashboard updates below without leaving the page.'

  const historyItems = recentCommands.length ? recentCommands : fallbackSuggestions.slice(0, 4)
  const suggestionPool = suggestions.length ? suggestions : fallbackSuggestions
  const filteredSuggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return suggestionPool.slice(0, 6)
    }

    const matches = suggestionPool.filter((item) => item.toLowerCase().includes(normalized))
    return (matches.length ? matches : suggestionPool).slice(0, 6)
  }, [query, suggestionPool])

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] shadow-[var(--app-shadow)]">
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(340px,1fr)]">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-[color:var(--app-panel-strong)] p-3 text-[color:var(--app-highlight-strong)]">
              <Command className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--app-ink)]">Natural Language Command Bar</h2>
              <p className="text-sm text-[color:var(--app-muted)]">Tell the dashboard what to analyze, filter, compare, or clean.</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void executeCommand(query, 'manual')
                    }
                  }}
                  placeholder="Example: last 30 days average sales, compare with upload 3, founder view"
                  className="w-full rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] px-4 py-4 pr-12 text-sm text-[color:var(--app-ink)] outline-none transition focus:border-[color:var(--app-highlight-strong)]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      lastAutoQueryRef.current = ''
                    }}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[color:var(--app-muted)] transition hover:bg-white/60 hover:text-[color:var(--app-ink)]"
                    aria-label="Clear command"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => void executeCommand(query, 'manual')}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--app-highlight-strong)] px-5 py-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60 xl:w-auto"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Run Command
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-[color:var(--app-muted)]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{helperMessage}</span>
            </div>

            <div className="mt-4 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">
                <Sparkles className="h-3.5 w-3.5" />
                Live Suggestions
              </div>
              <div className="flex flex-wrap gap-2">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion)
                      void executeCommand(suggestion, 'manual')
                    }}
                    className="rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-3 py-2 text-xs text-[color:var(--app-muted)] transition hover:border-[color:var(--app-highlight-strong)] hover:text-[color:var(--app-highlight-strong)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--app-ink)]">
                <Clock3 className="h-4 w-4" />
                Recent Commands
              </div>
              <div className="flex flex-wrap gap-2">
                {historyItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item)
                      void executeCommand(item, 'manual')
                    }}
                    className="rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] px-3 py-2 text-xs text-[color:var(--app-muted)] transition hover:border-[color:var(--app-highlight-strong)] hover:text-[color:var(--app-highlight-strong)]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--app-ink)]">
                <Filter className="h-4 w-4" />
                Suggested Follow-ups
              </div>
              <div className="flex flex-wrap gap-2">
                {(commandDetails?.followUpSuggestions.length
                  ? commandDetails.followUpSuggestions
                  : suggestionPool.slice(0, 4)
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item)
                      void executeCommand(item, 'manual')
                    }}
                    className="rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] px-3 py-2 text-xs text-[color:var(--app-muted)] transition hover:border-[color:var(--app-highlight-strong)] hover:text-[color:var(--app-highlight-strong)]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">
            <Sparkles className="h-4 w-4" />
            Live Result
          </div>

          <div className="mt-4 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--app-ink)]">
                  {lastAppliedCommand || 'Start typing to drive the workspace'}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--app-muted)]">
                  {commandDetails?.summary ||
                    resultMessage ||
                    'Charts, KPIs, filters, and workspace panels will refresh here as commands are applied.'}
                </p>
              </div>
              {commandDetails?.usedExistingContext && (
                <span className="rounded-full bg-[color:var(--app-panel-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--app-highlight-strong)]">
                  Context used
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold capitalize text-[color:var(--app-ink)]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">What Changed</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(commandDetails?.appliedChanges.length ? commandDetails.appliedChanges : ['Waiting for a command']).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-[color:var(--app-panel-strong)] px-3 py-2 text-xs text-[color:var(--app-muted)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">Applied Filters</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(commandDetails?.activeFilters.length ? commandDetails.activeFilters : ['No active command filters']).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-[color:var(--app-panel-strong)] px-3 py-2 text-xs text-[color:var(--app-muted)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">Generated Charts</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(commandDetails?.generatedCharts.length ? commandDetails.generatedCharts : ['Charts will appear here']).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-[color:var(--app-panel-strong)] px-3 py-2 text-xs text-[color:var(--app-muted)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default DashboardCommandBar
