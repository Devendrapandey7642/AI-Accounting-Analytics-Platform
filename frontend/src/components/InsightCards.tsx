import { AlertTriangle, Info, Sparkles, TrendingUp } from 'lucide-react'
import { InsightCard } from '../store/useAppStore'

const toneStyles = {
  info: {
    icon: Info,
    wrapper: 'border-sky-200 bg-sky-50',
    iconColor: 'text-sky-600',
  },
  positive: {
    icon: TrendingUp,
    wrapper: 'border-emerald-200 bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  warning: {
    icon: AlertTriangle,
    wrapper: 'border-amber-200 bg-amber-50',
    iconColor: 'text-amber-600',
  },
} as const

interface InsightCardsProps {
  insights: InsightCard[]
}

const InsightCards = ({ insights }: InsightCardsProps) => {
  if (!insights.length) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">AI Insight Cards</h2>
          <p className="text-sm text-slate-600">Short explanations generated from the active view of your data.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {insights.map((insight) => {
          const tone = toneStyles[insight.tone]
          const Icon = tone.icon
          return (
            <article key={insight.id} className={`rounded-2xl border p-5 ${tone.wrapper}`}>
              <div className="mb-3 flex items-center gap-3">
                <div className={`rounded-xl bg-white p-2 ${tone.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{insight.title}</h3>
              </div>
              <p className="text-sm leading-6 text-slate-700">{insight.body}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default InsightCards
