import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface ChartCardProps {
  title: string
  description?: string
  caption?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
  contentClassName?: string
  contentId?: string
  actions?: React.ReactNode
}

const ChartCard = ({
  title,
  description,
  caption,
  icon: Icon,
  children,
  className = '',
  contentClassName = '',
  contentId,
  actions,
}: ChartCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    className={`overflow-hidden rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] shadow-[var(--app-shadow)] backdrop-blur-xl ${className}`}
  >
    <div className="border-b border-[color:var(--app-panel-border)] bg-gradient-to-r from-white/40 to-transparent p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start space-x-3">
          {Icon && (
            <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-2.5 text-[color:var(--app-highlight-strong)]">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--app-ink)]">{title}</h3>
            {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--app-muted)]">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </div>
    <div id={contentId} className={`p-4 sm:p-6 ${contentClassName || 'h-80'}`}>
      {children}
    </div>
    {caption && (
      <div className="border-t border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-5 py-4 text-sm leading-6 text-[color:var(--app-muted)] sm:px-6">
        {caption}
      </div>
    )}
  </motion.div>
)

export default ChartCard
