import { CheckCircle2, Download, Printer, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createWorkspaceShare } from '../services/apiService'
import { AnalyticsData, DashboardRequest } from '../store/useAppStore'

interface DashboardExportToolsProps {
  analyticsData: AnalyticsData
  request: DashboardRequest
}

type NoticeState =
  | {
      tone: 'success' | 'error'
      message: string
    }
  | null

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const input = document.createElement('textarea')
  input.value = value
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.focus()
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

const DashboardExportTools = ({ analyticsData, request }: DashboardExportToolsProps) => {
  const [notice, setNotice] = useState<NoticeState>(null)
  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const activeSignals = useMemo(() => {
    const items = [
      request.preferences.metric || analyticsData.dataset.activeMetric
        ? `Metric: ${request.preferences.metric || analyticsData.dataset.activeMetric}`
        : '',
      request.filters.categoryColumn && request.filters.categories.length > 0
        ? `${request.filters.categoryColumn}: ${request.filters.categories.join(', ')}`
        : '',
      request.filters.startDate || request.filters.endDate
        ? `Window: ${request.filters.startDate || 'start'} to ${request.filters.endDate || 'latest'}`
        : '',
      request.preferences.compareMode ? 'Comparison enabled' : '',
      request.chartBuilder.enabled ? `${request.chartBuilder.chartType} chart focus` : '',
      request.scenario.enabled && request.scenario.metric
        ? `Scenario: ${request.scenario.adjustmentPercent}% ${request.scenario.metric}`
        : '',
    ]

    return items.filter(Boolean)
  }, [analyticsData.dataset.activeMetric, request])

  const shareUrl = useMemo(() => {
    const url = new URL(window.location.origin)
    url.pathname = `/dashboard/${analyticsData.uploadId}`
    url.searchParams.set('view', encodeURIComponent(JSON.stringify(request)))
    return url.toString()
  }, [analyticsData.uploadId, request])

  const setTemporaryNotice = (nextNotice: NoticeState) => {
    setNotice(nextNotice)
    window.setTimeout(() => setNotice(null), 2600)
  }

  const exportCsv = () => {
    const rows = analyticsData.dataPreview.rows
    const columns = analyticsData.dataPreview.columns
    const csv = [
      columns.join(','),
      ...rows.map((row) => columns.map((column) => JSON.stringify(row[column] ?? '')).join(',')),
    ].join('\n')

    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${analyticsData.fileName}-preview.csv`)
    setTemporaryNotice({ tone: 'success', message: 'CSV preview exported' })
  }

  const exportJson = () => {
    triggerDownload(
      new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' }),
      `${analyticsData.fileName}-dashboard.json`
    )
    setTemporaryNotice({ tone: 'success', message: 'JSON workspace exported' })
  }

  const exportSummary = () => {
    const lines = [
      `File: ${analyticsData.fileName}`,
      `Rows: ${analyticsData.dataset.filteredRows || analyticsData.dataset.rows}`,
      `Columns: ${analyticsData.dataset.columns}`,
      `Metric: ${request.preferences.metric || analyticsData.dataset.activeMetric || 'Auto'}`,
      `Dashboard role: ${request.preferences.dashboardRole}`,
      '',
      'Active workspace:',
      ...(activeSignals.length > 0 ? activeSignals.map((signal) => `- ${signal}`) : ['- Auto analysis view']),
      '',
      'Top insights:',
      ...analyticsData.insightCards.map((insight) => `- ${insight.title}: ${insight.body}`),
      '',
      'Alerts:',
      ...analyticsData.alerts.map((alert) => `- [${alert.severity}] ${alert.title}: ${alert.description}`),
      '',
      'Narrative:',
      ...analyticsData.narrative.sections.map((section) => `- ${section.heading}: ${section.body}`),
    ]

    triggerDownload(
      new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' }),
      `${analyticsData.fileName}-summary.txt`
    )
    setTemporaryNotice({ tone: 'success', message: 'Executive summary exported' })
  }

  const exportSnapshot = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${analyticsData.fileName} workspace snapshot</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #0f172a; background: #f8fafc; }
    .card { background: white; border-radius: 20px; padding: 24px; margin-bottom: 16px; border: 1px solid #e2e8f0; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08); }
    .chips span { display: inline-block; padding: 8px 12px; margin: 0 8px 8px 0; border-radius: 999px; background: #eff6ff; color: #0f172a; }
    h1, h2 { margin-top: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${analyticsData.fileName}</h1>
    <p>Rows: ${analyticsData.dataset.filteredRows || analyticsData.dataset.rows}</p>
    <p>Columns: ${analyticsData.dataset.columns}</p>
    <p>Metric: ${request.preferences.metric || analyticsData.dataset.activeMetric || 'Auto'}</p>
  </div>
  <div class="card chips">
    <h2>Workspace signals</h2>
    ${(activeSignals.length > 0 ? activeSignals : ['Auto analysis view']).map((signal) => `<span>${signal}</span>`).join('')}
  </div>
  <div class="card">
    <h2>Insights</h2>
    <ul>${analyticsData.insightCards.map((insight) => `<li>${insight.title}: ${insight.body}</li>`).join('')}</ul>
  </div>
  <div class="card chips">
    <h2>Charts</h2>
    ${analyticsData.charts.map((chart) => `<span>${chart.title}</span>`).join('')}
  </div>
</body>
</html>`

    triggerDownload(
      new Blob([html], { type: 'text/html;charset=utf-8;' }),
      `${analyticsData.fileName}-workspace-snapshot.html`
    )
    setTemporaryNotice({ tone: 'success', message: 'Snapshot HTML exported' })
  }

  const shareView = async () => {
    try {
      const share = await createWorkspaceShare(
        analyticsData.uploadId.toString(),
        request,
        `${analyticsData.fileName} workspace`
      )
      const durableShareUrl = new URL(window.location.origin)
      durableShareUrl.pathname = `/dashboard/${share.upload_id}`
      durableShareUrl.searchParams.set('share', share.share_token)

      if (hasNativeShare) {
        await navigator.share({
          title: `${analyticsData.fileName} workspace`,
          text: `Shared analytics view for ${analyticsData.fileName}`,
          url: durableShareUrl.toString(),
        })
        setTemporaryNotice({ tone: 'success', message: 'Workspace shared' })
        return
      }

      await copyText(durableShareUrl.toString())
      setTemporaryNotice({ tone: 'success', message: 'Share link copied' })
    } catch (error) {
      try {
        if (hasNativeShare) {
          await navigator.share({
            title: `${analyticsData.fileName} workspace`,
            text: `Shared analytics view for ${analyticsData.fileName}`,
            url: shareUrl,
          })
          setTemporaryNotice({ tone: 'success', message: 'Workspace shared' })
          return
        }

        await copyText(shareUrl)
        setTemporaryNotice({ tone: 'success', message: 'Share link copied' })
      } catch (fallbackError) {
        setTemporaryNotice({
          tone: 'error',
          message:
            fallbackError instanceof Error
              ? fallbackError.message
              : error instanceof Error
                ? error.message
                : 'Unable to share this workspace right now.',
        })
      }
    }
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-6 shadow-[var(--app-shadow)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--app-ink)]">Export and Share</h2>
          <p className="mt-1 text-sm text-[color:var(--app-muted)]">
            Turn the current command workspace into files, a printable summary, or a shareable view.
          </p>
        </div>
        {notice && (
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
              notice.tone === 'success'
                ? 'bg-[color:var(--app-panel-strong)] text-[color:var(--app-highlight-strong)]'
                : 'bg-red-100 text-red-700'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {notice.message}
          </div>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(activeSignals.length > 0 ? activeSignals : ['Auto analysis view']).map((signal) => (
          <span
            key={signal}
            className="rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--app-muted)]"
          >
            {signal}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-4 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)]"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-4 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)]"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </button>
        <button
          type="button"
          onClick={exportSummary}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-4 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)]"
        >
          <Download className="h-4 w-4" />
          Export Summary
        </button>
        <button
          type="button"
          onClick={exportSnapshot}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-4 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)]"
        >
          <Download className="h-4 w-4" />
          Snapshot HTML
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-4 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)]"
        >
          <Printer className="h-4 w-4" />
          Print View
        </button>
        <button
          type="button"
          onClick={() => void shareView()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-4 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)]"
        >
          <Share2 className="h-4 w-4" />
          {hasNativeShare ? 'Share View' : 'Copy Share Link'}
        </button>
      </div>
    </section>
  )
}

export default DashboardExportTools
