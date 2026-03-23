import { Activity, BarChart3, Database, DollarSign, Percent, Shapes, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { KpiCard, KpiUnit, useAppStore } from '../store/useAppStore'

interface KPIProps {
  card: KpiCard
}

const formatValue = (value: number, unit: KpiUnit) => {
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

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

const pickIcon = (card: KpiCard) => {
  const title = card.title.toLowerCase()

  if (title.includes('row')) return Database
  if (title.includes('complete')) return Percent
  if (title.includes('category')) return Shapes
  if (card.unit === 'currency') return DollarSign
  if (title.includes('date')) return BarChart3
  if (title.includes('profit')) return TrendingUp
  return Activity
}

const KPICard = ({ card }: KPIProps) => {
  const Icon = pickIcon(card)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{card.title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{formatValue(card.value, card.unit)}</p>
          <p className="mt-2 text-sm text-slate-600">{card.subtitle}</p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${card.color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  )
}

const KPIStats = () => {
  const analyticsData = useAppStore((state) => state.analyticsData)

  if (!analyticsData) return null

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
      {analyticsData.kpis.cards.map((card) => (
        <KPICard key={card.id} card={card} />
      ))}
    </div>
  )
}

export default KPIStats
