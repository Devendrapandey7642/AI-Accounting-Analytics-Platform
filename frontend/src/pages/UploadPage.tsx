import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock3, DatabaseZap, FileClock, Sparkles } from 'lucide-react'
import TopNavbar from '../components/TopNavbar'
import FileUploader from '../components/FileUploader'
import { getUploads } from '../services/apiService'
import { UploadSummary } from '../store/useAppStore'

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) {
    return 'Unknown size'
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const formatUploadedAt = (value: string | null) => {
  if (!value) {
    return 'Just now'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Recently uploaded'
    : new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
}

const statusTone: Record<string, string> = {
  uploaded: 'bg-amber-100 text-amber-700',
  queued: 'bg-sky-100 text-sky-700',
  processing: 'bg-sky-100 text-sky-700',
  processed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
}

const UploadPage = () => {
  const [uploads, setUploads] = useState<UploadSummary[]>([])
  const [loadingUploads, setLoadingUploads] = useState(true)

  useEffect(() => {
    let cancelled = false

    getUploads()
      .then((items) => {
        if (!cancelled) {
          setUploads(items.slice(0, 6))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUploads([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingUploads(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="app-page-shell bg-[color:var(--app-bg)] text-[color:var(--app-ink)]">
      <TopNavbar />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
      >
        <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <div className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-6 shadow-[var(--app-shadow)] sm:p-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
              <Sparkles className="h-4 w-4 text-[color:var(--app-highlight-strong)]" />
              Command-first accounting workspace
            </div>
            <motion.h1
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08 }}
              className="max-w-4xl text-3xl font-bold leading-tight sm:text-5xl lg:text-6xl"
            >
              Upload your dataset and move straight into natural-language analysis.
            </motion.h1>
            <motion.p
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.16 }}
              className="mt-6 max-w-3xl text-base leading-7 text-[color:var(--app-muted)] sm:text-lg sm:leading-8"
            >
              CSV, Excel, TSV, TXT, and XML files flow into one responsive workspace with live command suggestions,
              auto-built charts, explainable KPI summaries, reports, and predictions.
            </motion.p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5">
                <DatabaseZap className="h-7 w-7 text-[color:var(--app-highlight-strong)]" />
                <h2 className="mt-4 text-lg font-semibold">Large-file ready</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--app-muted)]">
                  Streaming upload mode and chunk-aware CSV reads keep big accounting datasets usable.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5">
                <Clock3 className="h-7 w-7 text-[color:var(--app-highlight-strong)]" />
                <h2 className="mt-4 text-lg font-semibold">Realtime progress</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--app-muted)]">
                  Users can see validation, KPI generation, chart building, and finalization as they happen.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5">
                <FileClock className="h-7 w-7 text-[color:var(--app-highlight-strong)]" />
                <h2 className="mt-4 text-lg font-semibold">Recent workspaces</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--app-muted)]">
                  Re-open earlier uploads, continue processing, or jump back into the dashboard and report view.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                  Recent uploads
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Resume a workspace</h2>
              </div>
              <div className="rounded-full bg-[color:var(--app-panel-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--app-muted)]">
                {uploads.length} saved
              </div>
            </div>

            <div className="space-y-3">
              {loadingUploads && (
                <div className="rounded-[1.5rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5 text-sm text-[color:var(--app-muted)]">
                  Loading recent uploads...
                </div>
              )}

              {!loadingUploads && uploads.length === 0 && (
                <div className="rounded-[1.5rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5 text-sm leading-6 text-[color:var(--app-muted)]">
                  Upload your first accounting file to create a reusable workspace with dashboard, prediction, and report routes.
                </div>
              )}

              {uploads.map((upload) => {
                const readyForDashboard = upload.status === 'processed' || upload.status === 'completed'
                return (
                  <div
                    key={upload.id}
                    className="rounded-[1.5rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[color:var(--app-ink)]">{upload.filename}</h3>
                        <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                          {formatFileSize(upload.file_size)} / {upload.file_type.toUpperCase()} / {formatUploadedAt(upload.uploaded_at)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${statusTone[upload.status] || 'bg-slate-100 text-slate-700'}`}>
                        {upload.large_file ? `${upload.status} / large` : upload.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <Link
                        to={readyForDashboard ? `/dashboard/${upload.id}` : `/processing/${upload.id}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--app-highlight-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
                      >
                        {readyForDashboard ? 'Open Dashboard' : 'Continue Processing'}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/report/${upload.id}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] px-4 py-3 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] sm:w-auto"
                      >
                        Open Report
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.28 }}
        >
          <FileUploader />
        </motion.div>
      </motion.main>
    </div>
  )
}

export default UploadPage
