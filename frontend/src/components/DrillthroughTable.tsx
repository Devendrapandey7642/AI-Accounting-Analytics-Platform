import { ArrowDownAZ, ArrowUpAZ, Download, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DrillthroughSummary } from '../store/useAppStore'

interface DrillthroughTableProps {
  drillthrough: DrillthroughSummary
}

const DrillthroughTable = ({ drillthrough }: DrillthroughTableProps) => {
  const [query, setQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const filteredRows = useMemo(() => {
    if (!drillthrough.enabled) {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()
    const rows = normalizedQuery
      ? drillthrough.rows.filter((row) =>
          drillthrough.columns.some((column) => String(row[column] ?? '').toLowerCase().includes(normalizedQuery))
        )
      : drillthrough.rows

    if (!sortColumn) {
      return rows
    }

    return [...rows].sort((left, right) => {
      const leftValue = left[sortColumn]
      const rightValue = right[sortColumn]

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue
      }

      const leftLabel = String(leftValue ?? '').toLowerCase()
      const rightLabel = String(rightValue ?? '').toLowerCase()
      const comparison = leftLabel.localeCompare(rightLabel)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [drillthrough.columns, drillthrough.enabled, drillthrough.rows, query, sortColumn, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page]
  )

  useEffect(() => {
    setPage(1)
  }, [query, sortColumn, sortDirection, drillthrough.title])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumn(column)
    setSortDirection('asc')
  }

  const exportCsv = () => {
    const headers = drillthrough.columns.join(',')
    const rows = filteredRows.map((row) =>
      drillthrough.columns
        .map((column) => `"${String(row[column] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${drillthrough.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'drillthrough'}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  if (!drillthrough.enabled) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-6 shadow-[var(--app-shadow)]">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-3 text-[color:var(--app-highlight-strong)]">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--app-ink)]">{drillthrough.title}</h2>
            <p className="text-sm text-[color:var(--app-muted)]">
              Showing {filteredRows.length} matched rows from {drillthrough.rows.length} loaded rows and {drillthrough.totalRows} total records.
              {drillthrough.sampled ? ' Results are sampled for faster review.' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex items-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-3 text-sm text-[color:var(--app-muted)]">
            <Search className="h-4 w-4" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search drill-through rows"
              className="w-full bg-transparent text-[color:var(--app-ink)] outline-none placeholder:text-[color:var(--app-muted)] sm:w-56"
            />
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] hover:text-[color:var(--app-highlight-strong)]"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[color:var(--app-panel-border)]">
        <table className="min-w-full divide-y divide-[color:var(--app-panel-border)] text-sm">
          <thead className="bg-[color:var(--app-panel-strong)]">
            <tr>
              {drillthrough.columns.map((column) => {
                const isSorted = sortColumn === column

                return (
                  <th key={column} className="px-4 py-3 text-left font-semibold text-[color:var(--app-muted)]">
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className="inline-flex items-center gap-2 transition hover:text-[color:var(--app-highlight-strong)]"
                    >
                      <span>{column}</span>
                      {isSorted ? (
                        sortDirection === 'asc' ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />
                      ) : (
                        <ArrowUpAZ className="h-4 w-4 opacity-40" />
                      )}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--app-panel-border)] bg-[color:var(--app-panel)]">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={drillthrough.columns.length} className="px-4 py-8 text-center text-[color:var(--app-muted)]">
                  No rows matched the current search.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIndex) => (
                <tr key={`${drillthrough.title}-${rowIndex}`} className="transition hover:bg-white/40">
                  {drillthrough.columns.map((column) => (
                    <td key={`${rowIndex}-${column}`} className="px-4 py-3 text-[color:var(--app-muted)]">
                      {String(row[column] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--app-muted)]">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-2 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded-xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-2 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}

export default DrillthroughTable
