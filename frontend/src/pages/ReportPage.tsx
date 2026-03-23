import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, FileText, Printer } from 'lucide-react'
import TopNavbar from '../components/TopNavbar'
import Sidebar from '../components/Sidebar'
import DashboardExportTools from '../components/DashboardExportTools'
import MobileTabBar from '../components/MobileTabBar'
import { useAnalytics } from '../hooks/useAnalytics'
import { generateReport } from '../services/apiService'
import { defaultDashboardRequest, useAppStore } from '../store/useAppStore'

const formatValue = (value: number, unit: 'currency' | 'number' | 'percentage') => {
  if (unit === 'percentage') {
    return `${value.toFixed(1)}%`
  }

  if (unit === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

const ReportPage = () => {
  const { uploadId } = useParams<{ uploadId: string }>()
  const setUploadId = useAppStore((state) => state.setUploadId)
  const analyticsData = useAppStore((state) => state.analyticsData)
  const { loading, error } = useAnalytics(defaultDashboardRequest)
  const [downloading, setDownloading] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null)

  useEffect(() => {
    if (uploadId) {
      setUploadId(uploadId)
    }
  }, [setUploadId, uploadId])

  const handleDownload = async () => {
    if (!uploadId) {
      return
    }

    setDownloading(true)
    setDownloadMessage(null)
    try {
      const blob = await generateReport(uploadId)
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `consulting-analytics-report-${uploadId}.pdf`
      anchor.click()
      window.URL.revokeObjectURL(url)
      setDownloadMessage('PDF report downloaded')
      window.setTimeout(() => setDownloadMessage(null), 2400)
    } catch (downloadError) {
      setDownloadMessage(downloadError instanceof Error ? downloadError.message : 'Unable to generate the PDF report.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="app-page-shell bg-[color:var(--app-bg)] text-[color:var(--app-ink)]">
      <TopNavbar />

      <div className="app-page-frame relative">
        <Sidebar />

        <main className="app-page-scroll px-3 py-5 sm:px-6 sm:py-8 lg:ml-64 lg:px-8">
          <div className="mobile-safe-offset mx-auto max-w-[1560px] space-y-6 pb-10 sm:space-y-8 sm:pb-16">
            <section className="rounded-[2.25rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                    <FileText className="h-4 w-4 text-[color:var(--app-highlight-strong)]" />
                    Consulting-style output
                  </div>
                  <h1 className="text-2xl font-bold sm:text-4xl">Comprehensive report workspace</h1>
                  <p className="mt-4 text-sm leading-7 text-[color:var(--app-muted)] sm:text-lg">
                    Review a polished summary of the current dataset, export the full PDF, and share the live workspace
                    state without leaving the reporting route.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    disabled={!uploadId || downloading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--app-highlight-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    <Download className="h-4 w-4" />
                    {downloading ? 'Generating PDF...' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-5 py-3 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] sm:w-auto"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <Link
                    to={uploadId ? `/dashboard/${uploadId}` : '/'}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] px-5 py-3 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] sm:w-auto"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </div>
              {downloadMessage && (
                <p className="mt-4 text-sm font-medium text-[color:var(--app-highlight-strong)]">{downloadMessage}</p>
              )}
            </section>

            {loading && !analyticsData ? (
              <section className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                  Loading report data
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-[color:var(--app-panel-strong)]">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-sky-500 to-teal-500" />
                </div>
              </section>
            ) : error ? (
              <section className="rounded-[2rem] border border-red-200 bg-red-50 p-5 text-red-700 shadow-[var(--app-shadow)] sm:p-8">
                <h2 className="text-2xl font-semibold">Report load failed</h2>
                <p className="mt-3 text-base">{error}</p>
              </section>
            ) : !analyticsData ? (
              <section className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
                <h2 className="text-2xl font-semibold">No report data yet</h2>
                <p className="mt-3 max-w-2xl text-base text-[color:var(--app-muted)]">
                  Upload a dataset and open the dashboard once so the platform can generate the analysis layer used by the report.
                </p>
              </section>
            ) : (
              <>
                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                  <div className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                      Report summary
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">{analyticsData.fileName}</h2>
                    <p className="mt-3 text-base leading-7 text-[color:var(--app-muted)]">
                      {analyticsData.dataset.filteredRows || analyticsData.dataset.rows} active rows, {analyticsData.dataset.columns} columns,
                      {` ${analyticsData.dataset.completeness}%`} completeness, and a {analyticsData.dataset.datasetType} dataset profile.
                    </p>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {analyticsData.kpis.cards.slice(0, 4).map((card) => (
                        <div
                          key={card.id}
                          className="rounded-[1.5rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">
                            {card.title}
                          </p>
                          <p className="mt-3 text-3xl font-bold text-[color:var(--app-ink)]">
                            {formatValue(card.value, card.unit)}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--app-muted)]">{card.subtitle}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                      Executive takeaways
                    </p>
                    <div className="mt-4 space-y-4">
                      {analyticsData.insightCards.slice(0, 4).map((insight) => (
                        <div
                          key={insight.id}
                          className="rounded-[1.5rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5"
                        >
                          <h3 className="text-lg font-semibold text-[color:var(--app-ink)]">{insight.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--app-muted)]">{insight.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                  <div className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                      Narrative
                    </p>
                    <div className="mt-5 space-y-5">
                      {analyticsData.narrative.sections.slice(0, 4).map((section) => (
                        <article key={section.id} className="rounded-[1.5rem] bg-[color:var(--app-panel-strong)] p-5">
                          <h3 className="text-lg font-semibold text-[color:var(--app-ink)]">{section.heading}</h3>
                          <p className="mt-2 text-sm leading-7 text-[color:var(--app-muted)]">{section.body}</p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                      Risk and alerts
                    </p>
                    <div className="mt-5 space-y-4">
                      {analyticsData.alerts.slice(0, 5).map((alert) => (
                        <div
                          key={alert.id}
                          className="rounded-[1.5rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base font-semibold text-[color:var(--app-ink)]">{alert.title}</h3>
                            <span className="rounded-full bg-[color:var(--app-panel)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--app-muted)]">
                              {alert.severity}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--app-muted)]">{alert.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <DashboardExportTools analyticsData={analyticsData} request={analyticsData.activeRequest} />
              </>
            )}
          </div>
        </main>
      </div>

      <MobileTabBar uploadId={uploadId} />
    </div>
  )
}

export default ReportPage
