import { LayoutDashboard, FileDown, Brain, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  const uploadId = useAppStore((state) => state.uploadId)
  const mobileNavOpen = useAppStore((state) => state.mobileNavOpen)
  const setMobileNavOpen = useAppStore((state) => state.setMobileNavOpen)

  const navigationItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: uploadId ? `/dashboard/${uploadId}` : '/' },
    { label: 'Predictions', icon: Brain, path: uploadId ? `/predictions/${uploadId}` : '/' },
    { label: 'Report', icon: FileDown, path: uploadId ? `/report/${uploadId}` : '/' },
  ]

  return (
    <>
      {mobileNavOpen && (
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation overlay"
        />
      )}

      <aside
        className={`fixed bottom-3 left-3 top-[4.5rem] z-50 w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4 shadow-[var(--app-shadow)] transition-transform duration-300 lg:bottom-0 lg:left-0 lg:top-16 lg:z-20 lg:block lg:w-64 lg:max-w-none lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-r ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-4 lg:block">
            <div>
              <h3 className="font-semibold text-[color:var(--app-ink)]">Analytics Dashboard</h3>
              {uploadId && <p className="mt-1 text-sm text-[color:var(--app-muted)]">ID: {uploadId.slice(-8)}</p>}
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[color:var(--app-panel-border)] bg-white/70 text-[color:var(--app-ink)] lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">Workspace</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--app-muted)]">
              Switch views, open reports, and control the dashboard from one place.
            </p>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-2xl border p-3 transition-all ${
                    isActive
                      ? 'border-[color:var(--app-highlight-strong)] bg-[color:var(--app-panel)] text-[color:var(--app-highlight-strong)] shadow-sm'
                      : 'border-transparent text-[color:var(--app-muted)] hover:border-[color:var(--app-panel-border)] hover:bg-white/70 hover:text-[color:var(--app-highlight-strong)]'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
