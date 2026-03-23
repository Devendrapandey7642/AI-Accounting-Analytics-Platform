import { Calculator, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KpiUnit, NumericSummaryEntry } from '../store/useAppStore'

export interface CustomKpiDefinition {
  id: string
  name: string
  formula: string
  aggregation: 'sum' | 'mean'
}

interface CustomKpiBuilderProps {
  numericSummary: Record<string, NumericSummaryEntry>
  definitions: CustomKpiDefinition[]
  onAdd: (definition: CustomKpiDefinition) => void
  onRemove: (id: string) => void
}

const formatValue = (value: number, unit: KpiUnit) => {
  if (unit === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1,
    }).format(value)
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

const evaluateFormula = (
  formula: string,
  aggregation: 'sum' | 'mean',
  numericSummary: Record<string, NumericSummaryEntry>
) => {
  const references = formula.match(/\[[^\]]+\]/g) || []
  let expression = formula
  let inferredUnit: KpiUnit = 'number'

  references.forEach((reference) => {
    const metricName = reference.slice(1, -1)
    const metricSummary = numericSummary[metricName]
    const value = metricSummary?.[aggregation] ?? 0
    inferredUnit = metricSummary?.unit === inferredUnit ? inferredUnit : 'number'
    expression = expression.split(reference).join(String(value))
  })

  if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
    throw new Error('Formula may only contain numbers, brackets, parentheses, and operators.')
  }

  const result = Function(`"use strict"; return (${expression});`)() as number
  return {
    value: Number.isFinite(result) ? result : 0,
    unit: formula.includes('/') ? 'number' : inferredUnit,
  }
}

const CustomKpiBuilder = ({
  numericSummary,
  definitions,
  onAdd,
  onRemove,
}: CustomKpiBuilderProps) => {
  const metricOptions = Object.keys(numericSummary)
  const [name, setName] = useState('')
  const [formula, setFormula] = useState(metricOptions[0] ? `[${metricOptions[0]}]` : '')
  const [aggregation, setAggregation] = useState<'sum' | 'mean'>('sum')
  const [error, setError] = useState<string | null>(null)

  const computedKpis = useMemo(
    () =>
      definitions.map((definition) => {
        try {
          const result = evaluateFormula(definition.formula, definition.aggregation, numericSummary)
          return {
            ...definition,
            value: result.value,
            unit: result.unit,
            error: null,
          }
        } catch (err) {
          return {
            ...definition,
            value: 0,
            unit: 'number' as KpiUnit,
            error: err instanceof Error ? err.message : 'Formula error',
          }
        }
      }),
    [definitions, numericSummary]
  )

  const addDefinition = () => {
    if (!name.trim() || !formula.trim()) {
      setError('Please provide both a KPI name and a formula.')
      return
    }

    try {
      evaluateFormula(formula, aggregation, numericSummary)
      onAdd({
        id: `${Date.now()}`,
        name: name.trim(),
        formula: formula.trim(),
        aggregation,
      })
      setName('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Formula error')
    }
  }

  if (!metricOptions.length) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Formula Engine</h2>
          <p className="text-sm text-slate-600">Use bracket references like [Sales] - [Expense] or ([Revenue] - [Cost]) / [Revenue].</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.5fr_180px_120px]">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="KPI name"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
        />
        <input
          type="text"
          value={formula}
          onChange={(event) => setFormula(event.target.value)}
          placeholder="[Sales] - [Expense]"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
        />
        <select
          value={aggregation}
          onChange={(event) => setAggregation(event.target.value as 'sum' | 'mean')}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
        >
          <option value="sum">sum</option>
          <option value="mean">mean</option>
        </select>
        <button
          type="button"
          onClick={addDefinition}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {metricOptions.map((metric) => (
          <button
            key={metric}
            type="button"
            onClick={() => setFormula((current) => `${current}${current ? ' ' : ''}[${metric}]`)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-white"
          >
            [{metric}]
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {computedKpis.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {computedKpis.map((kpi) => (
            <article key={kpi.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{kpi.name}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatValue(kpi.value, kpi.unit)}</p>
                  <p className="mt-2 break-all text-xs uppercase tracking-[0.16em] text-slate-500">
                    {kpi.formula} / {kpi.aggregation}
                  </p>
                  {kpi.error && <p className="mt-2 text-xs text-rose-600">{kpi.error}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(kpi.id)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default CustomKpiBuilder
