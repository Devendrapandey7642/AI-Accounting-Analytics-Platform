import { BarChart3, Brain, FileText } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface MobileTabBarProps {
  uploadId?: string
}

const MobileTabBar = ({ uploadId }: MobileTabBarProps) => {
  if (!uploadId) {
    return null
  }

  const items = [
    { label: 'Dashboard', icon: BarChart3, path: `/dashboard/${uploadId}` },
    { label: 'Predict', icon: Brain, path: `/predictions/${uploadId}` },
    { label: 'Report', icon: FileText, path: `/report/${uploadId}` },
  ]

  return (
    <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 w-[calc(100%-1.25rem)] max-w-md -translate-x-1/2 rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)]/95 p-2 shadow-[var(--app-shadow)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                isActive
                  ? 'bg-[color:var(--app-highlight-strong)] text-white'
                  : 'text-[color:var(--app-muted)] hover:bg-[color:var(--app-panel-strong)] hover:text-[color:var(--app-highlight-strong)]'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default MobileTabBar
