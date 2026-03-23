import { LucideIcon, BarChart3, FileText, Brain, Menu, SunMoon } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Link, NavLink } from 'react-router-dom'

interface NavItem {
  label: string
  icon: LucideIcon
  path: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: BarChart3, path: '/dashboard/:uploadId' },
  { label: 'Predictions', icon: Brain, path: '/predictions/:uploadId' },
  { label: 'Reports', icon: FileText, path: '/report/:uploadId' },
]

const TopNavbar = () => {
  const uploadId = useAppStore((state) => state.uploadId)
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  const setMobileNavOpen = useAppStore((state) => state.setMobileNavOpen)

  return (
    <nav className="sticky top-0 z-40 border-b border-[color:var(--app-panel-border)] bg-[color:var(--app-navbar)] shadow-[var(--app-shadow)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1680px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="flex min-w-0 items-center space-x-3">
              <div className="rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 p-2.5 text-white shadow-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-base font-bold text-[color:var(--app-ink)] sm:hidden">
                  AI Analytics
                </span>
                <span className="hidden text-lg font-bold text-[color:var(--app-ink)] sm:block sm:text-xl">
                  AI Accounting Analytics
                </span>
                <span className="hidden text-xs uppercase tracking-[0.18em] text-[color:var(--app-muted)] sm:block">
                  Responsive workspace
                </span>
              </div>
            </Link>
          </div>

          {uploadId && (
            <div className="hidden min-w-0 items-center gap-2 overflow-x-auto md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path.replace(':uploadId', uploadId)}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[color:var(--app-panel)] text-[color:var(--app-highlight-strong)]'
                        : 'text-[color:var(--app-muted)] hover:bg-white/70 hover:text-[color:var(--app-highlight-strong)]'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'slate' : 'light')}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] px-2.5 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] sm:px-3"
              aria-label="Toggle theme"
            >
              <SunMoon className="h-4 w-4" />
              <span className="hidden sm:inline">{theme === 'light' ? 'Slate' : 'Light'}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default TopNavbar
