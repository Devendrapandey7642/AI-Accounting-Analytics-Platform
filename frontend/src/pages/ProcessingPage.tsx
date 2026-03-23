import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, BarChart3, Brain, CheckCircle2, FileText, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import TopNavbar from '../components/TopNavbar'
import { useAppStore } from '../store/useAppStore'
import { AnalysisStep, getAnalysisStatus, runAnalysis } from '../services/apiService'

const iconMap = {
  load_data: FileText,
  detect_schema: Brain,
  clean_values: Loader2,
  build_kpis: BarChart3,
  build_charts: Sparkles,
  finalize: CheckCircle2,
} as const

const ProcessingPage = () => {
  const { uploadId } = useParams<{ uploadId: string }>()
  const navigate = useNavigate()
  const setUploadId = useAppStore((state) => state.setUploadId)
  const [steps, setSteps] = useState<AnalysisStep[]>([])
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Starting analysis...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (uploadId) {
      setUploadId(uploadId)
    }
  }, [setUploadId, uploadId])

  useEffect(() => {
    if (!uploadId) {
      return undefined
    }

    let cancelled = false
    let intervalId: number | undefined
    let eventSource: EventSource | undefined

    const syncStatus = async () => {
      try {
        const status = await getAnalysisStatus(uploadId)

        if (cancelled) {
          return
        }

        setSteps(status.steps || [])
        setProgress(status.progress || 0)
        setStatusMessage(status.message)

        if (status.status === 'completed') {
          window.clearInterval(intervalId)
          window.setTimeout(() => navigate(`/dashboard/${uploadId}`), 800)
        }

        if (status.status === 'failed') {
          window.clearInterval(intervalId)
          setError(status.error || 'Analysis failed')
        }
      } catch {
        if (!cancelled) {
          setError('Unable to fetch realtime analysis status.')
        }
      }
    }

    const start = async () => {
      try {
        const initial = await runAnalysis(uploadId)
        if (cancelled) {
          return
        }

        setSteps(initial.steps || [])
        setProgress(initial.progress || 0)
        setStatusMessage(initial.message)
        eventSource = new EventSource(`/api/analysis-status-stream/${uploadId}`)
        eventSource.onmessage = (event) => {
          if (cancelled) {
            return
          }

          const status = JSON.parse(event.data) as {
            status: string
            progress: number
            message: string
            error?: string | null
            steps?: AnalysisStep[]
          }

          setSteps(status.steps || [])
          setProgress(status.progress || 0)
          setStatusMessage(status.message)

          if (status.status === 'completed') {
            eventSource?.close()
            window.setTimeout(() => navigate(`/dashboard/${uploadId}`), 800)
          }

          if (status.status === 'failed') {
            eventSource?.close()
            setError(status.error || 'Analysis failed')
          }
        }
        eventSource.onerror = () => {
          eventSource?.close()
          intervalId = window.setInterval(syncStatus, 1200)
          void syncStatus()
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to start analysis.'
          setError(message)
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      eventSource?.close()
      window.clearInterval(intervalId)
    }
  }, [navigate, uploadId])

  return (
    <div className="app-page-shell bg-gradient-to-br from-slate-100 via-white to-cyan-50">
      <TopNavbar />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-8 inline-flex items-center rounded-3xl border border-white/50 bg-white/80 px-5 py-3 shadow-2xl backdrop-blur-xl sm:mb-10 sm:px-8 sm:py-4">
            <div className="mr-4 h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse" />
            <span className="text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">Realtime Dataset Processing</span>
          </div>

          <div className="mx-auto mb-10 max-w-2xl rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-8">
            <div className="mb-4 flex items-center justify-between text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-4 text-base text-slate-600">{statusMessage}</p>
            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
            {steps.map((step) => {
              const Icon = iconMap[step.key as keyof typeof iconMap] || FileText
              const isActive = step.status === 'in_progress'
              const isCompleted = step.status === 'completed'

              return (
                <motion.div
                  key={step.key}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 text-left shadow-lg backdrop-blur-sm transition-all hover:shadow-xl sm:gap-4 sm:p-6"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 sm:h-12 sm:w-12">
                    {isCompleted ? (
                      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    ) : (
                      <Icon className={`h-7 w-7 ${isActive ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-lg font-semibold sm:text-xl ${isCompleted ? 'text-emerald-700' : isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                      {step.title}
                    </h4>
                    <p className="mt-1 text-slate-600">{step.description}</p>
                  </div>
                  {isActive && <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default ProcessingPage
