import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { BarChart3, Brain, DollarSign, Info, Target, TrendingUp } from 'lucide-react'
import TopNavbar from '../components/TopNavbar'
import Sidebar from '../components/Sidebar'
import MobileTabBar from '../components/MobileTabBar'
import { useAppStore } from '../store/useAppStore'

interface Prediction {
  prediction: number
  confidence: number
  model_type: string
  next_period: string
  error?: string
}

interface Explanation {
  top_factors: string[]
  model_type: string
  confidence: number
}

interface PredictionData {
  sales_forecast: Prediction
  expense_forecast: Prediction
  profit_forecast: Prediction
  explanation_summary: {
    sales: Explanation
    expenses: Explanation
    profit: Explanation
  }
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)

const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`

const PredictionsPage = () => {
  const { uploadId } = useParams<{ uploadId: string }>()
  const setUploadId = useAppStore((state) => state.setUploadId)
  const [predictions, setPredictions] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (uploadId) {
      setUploadId(uploadId)
    }
  }, [setUploadId, uploadId])

  useEffect(() => {
    let cancelled = false

    const fetchPredictions = async () => {
      try {
        const response = await axios.get(`/api/prediction-insights/${uploadId}`)
        if (!cancelled) {
          setPredictions(response.data)
        }
      } catch (predictionError) {
        if (!cancelled) {
          setError(
            predictionError instanceof Error ? predictionError.message : 'Failed to load predictions.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (uploadId) {
      void fetchPredictions()
    } else {
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [uploadId])

  const predictionCards = predictions
    ? [
        {
          id: 'sales',
          title: 'Sales forecast',
          icon: TrendingUp,
          tone: 'text-emerald-600',
          badge: 'bg-emerald-100 text-emerald-700',
          payload: predictions.sales_forecast,
          factors: predictions.explanation_summary.sales?.top_factors || [],
        },
        {
          id: 'expenses',
          title: 'Expense forecast',
          icon: DollarSign,
          tone: 'text-rose-600',
          badge: 'bg-rose-100 text-rose-700',
          payload: predictions.expense_forecast,
          factors: predictions.explanation_summary.expenses?.top_factors || [],
        },
        {
          id: 'profit',
          title: 'Profit forecast',
          icon: Target,
          tone: 'text-sky-600',
          badge: 'bg-sky-100 text-sky-700',
          payload: predictions.profit_forecast,
          factors: predictions.explanation_summary.profit?.top_factors || [],
        },
      ]
    : []

  return (
    <div className="app-page-shell bg-[color:var(--app-bg)] text-[color:var(--app-ink)]">
      <TopNavbar />

      <div className="app-page-frame relative">
        <Sidebar />

        <main className="app-page-scroll px-3 py-5 sm:px-6 sm:py-8 lg:ml-64 lg:px-8">
          <div className="mobile-safe-offset mx-auto max-w-[1560px] space-y-6 pb-10 sm:space-y-8 sm:pb-16">
            <section className="rounded-[2.25rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                    <Brain className="h-4 w-4 text-[color:var(--app-highlight-strong)]" />
                    Explainable AI forecast
                  </div>
                  <h1 className="text-2xl font-bold sm:text-4xl">Prediction workspace</h1>
                  <p className="mt-4 text-sm leading-7 text-[color:var(--app-muted)] sm:text-lg">
                    Forecast the next period, review confidence, and surface the strongest drivers behind each estimate.
                  </p>
                </div>
                <Link
                  to={uploadId ? `/dashboard/${uploadId}` : '/'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-5 py-3 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] sm:w-auto"
                >
                  Back to Dashboard
                </Link>
              </div>
            </section>

            {loading ? (
              <section className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
                <div className="flex items-center gap-4">
                  <Brain className="h-10 w-10 animate-pulse text-[color:var(--app-highlight-strong)]" />
                  <div>
                    <h2 className="text-2xl font-semibold">Generating AI predictions</h2>
                    <p className="mt-2 text-sm text-[color:var(--app-muted)]">
                      Building forecast outputs and explanation signals from the uploaded dataset.
                    </p>
                  </div>
                </div>
              </section>
            ) : error || !predictions ? (
              <section className="rounded-[2rem] border border-red-200 bg-red-50 p-5 shadow-[var(--app-shadow)] sm:p-8">
                <div className="flex items-start gap-3 text-red-700">
                  <Info className="mt-0.5 h-6 w-6 flex-shrink-0" />
                  <div>
                    <h2 className="text-2xl font-semibold">Prediction error</h2>
                    <p className="mt-2 text-base">{error || 'Unable to generate predictions.'}</p>
                  </div>
                </div>
              </section>
            ) : (
              <>
                <section className="grid gap-6 xl:grid-cols-3">
                  {predictionCards.map((item) => {
                    const Icon = item.icon
                    return (
                      <article
                        key={item.id}
                        className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-6"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-[color:var(--app-panel-strong)] p-3">
                              <Icon className={`h-6 w-6 ${item.tone}`} />
                            </div>
                            <h2 className="text-xl font-semibold text-[color:var(--app-ink)]">{item.title}</h2>
                          </div>
                          {!item.payload.error && (
                            <span className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${item.badge}`}>
                              {formatPercentage(item.payload.confidence)}
                            </span>
                          )}
                        </div>

                        {item.payload.error ? (
                          <p className="mt-5 text-sm text-red-600">{item.payload.error}</p>
                        ) : (
                          <>
                            <p className="mt-6 text-3xl font-bold text-[color:var(--app-ink)] sm:text-4xl">
                              {formatCurrency(item.payload.prediction)}
                            </p>
                            <p className="mt-2 text-sm text-[color:var(--app-muted)]">
                              {item.payload.next_period} / {item.payload.model_type}
                            </p>

                            <div className="mt-6 space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">
                                Key factors
                              </p>
                              {item.factors.slice(0, 3).map((factor) => (
                                <div
                                  key={factor}
                                  className="rounded-[1.25rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-3 text-sm leading-6 text-[color:var(--app-muted)]"
                                >
                                  {factor}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </article>
                    )
                  })}
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
                  <div className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-6 w-6 text-[color:var(--app-highlight-strong)]" />
                      <h2 className="text-2xl font-semibold">Model reading guide</h2>
                    </div>
                    <div className="mt-6 space-y-4">
                      {[
                        ['Confidence', 'Higher confidence usually means the dataset has stronger, cleaner trend signals.'],
                        ['Drivers', 'Top factors explain which columns most influenced the forecast for each metric.'],
                        ['Next period', 'The system predicts the next available time window based on the uploaded dataset cadence.'],
                      ].map(([title, body]) => (
                        <div
                          key={title}
                          className="rounded-[1.5rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-5"
                        >
                          <h3 className="text-base font-semibold text-[color:var(--app-ink)]">{title}</h3>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--app-muted)]">{body}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-5 shadow-[var(--app-shadow)] sm:p-8">
                    <div className="flex items-center gap-3">
                      <Info className="h-6 w-6 text-[color:var(--app-highlight-strong)]" />
                      <h2 className="text-2xl font-semibold">Methodology</h2>
                    </div>
                    <div className="mt-6 space-y-4 text-sm leading-7 text-[color:var(--app-muted)]">
                      <p>
                        Forecasts are generated from the uploaded historical dataset and tuned to the strongest metric patterns available.
                      </p>
                      <p>
                        Confidence scores and top drivers are surfaced so the output feels explainable instead of a black-box number.
                      </p>
                      <p>
                        Predictions should be treated as decision support. They work best when the uploaded data includes consistent dates and business metrics.
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <MobileTabBar uploadId={uploadId} />
    </div>
  )
}

export default PredictionsPage
