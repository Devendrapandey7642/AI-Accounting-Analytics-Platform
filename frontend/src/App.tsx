import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'

const UploadPage = lazy(() => import('./pages/UploadPage'))
const ProcessingPage = lazy(() => import('./pages/ProcessingPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const PredictionsPage = lazy(() => import('./pages/PredictionsPage'))
const ReportPage = lazy(() => import('./pages/ReportPage'))

function App() {
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('advanced-dashboard-theme')
    if (storedTheme === 'light' || storedTheme === 'slate') {
      setTheme(storedTheme)
    }
  }, [setTheme])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('advanced-dashboard-theme', theme)
  }, [theme])

  return (
    <Router>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[color:var(--app-bg)] px-6 text-[color:var(--app-ink)]">
            <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-8 shadow-[var(--app-shadow)]">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 shadow-lg" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                    AI Accounting Analytics
                  </p>
                  <h2 className="text-2xl font-semibold">Loading workspace</h2>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 overflow-hidden rounded-full bg-[color:var(--app-panel-strong)]">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-sky-500 to-teal-500" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="h-24 rounded-3xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)]" />
                  <div className="h-24 rounded-3xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)]" />
                  <div className="h-24 rounded-3xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)]" />
                </div>
                <p className="text-sm text-[color:var(--app-muted)]">
                  Preparing charts, commands, and saved workspace context.
                </p>
              </div>
            </div>
          </div>
        }
      >
        <div className="min-h-screen bg-[color:var(--app-bg)]">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/processing/:uploadId" element={<ProcessingPage />} />
            <Route path="/dashboard/:uploadId" element={<DashboardPage />} />
            <Route path="/predictions/:uploadId" element={<PredictionsPage />} />
            <Route path="/report/:uploadId" element={<ReportPage />} />
          </Routes>
        </div>
      </Suspense>
    </Router>
  )
}

export default App
