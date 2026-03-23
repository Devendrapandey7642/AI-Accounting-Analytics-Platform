import { Columns3 } from 'lucide-react'
import { DashboardRequest } from '../store/useAppStore'

interface ColumnMappingPanelProps {
  request: DashboardRequest
  columns: string[]
  onChange: (request: DashboardRequest) => void
  onApply: () => void
}

const ColumnMappingPanel = ({
  request,
  columns,
  onChange,
  onApply,
}: ColumnMappingPanelProps) => {
  const addRule = () => {
    const source = columns[0]
    if (!source) {
      return
    }

    onChange({
      ...request,
      transformations: {
        ...request.transformations,
        renameColumns: [
          ...request.transformations.renameColumns,
          { source, target: `${source}_renamed` },
        ],
      },
    })
  }

  const updateRule = (index: number, patch: { source?: string; target?: string }) => {
    const nextRules = request.transformations.renameColumns.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, ...patch } : rule
    )

    onChange({
      ...request,
      transformations: {
        ...request.transformations,
        renameColumns: nextRules,
      },
    })
  }

  const removeRule = (index: number) => {
    onChange({
      ...request,
      transformations: {
        ...request.transformations,
        renameColumns: request.transformations.renameColumns.filter((_, ruleIndex) => ruleIndex !== index),
      },
    })
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <Columns3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Column Mapping Studio</h2>
            <p className="text-sm text-slate-600">Rename columns into business-friendly labels before analysis.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={addRule}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Mapping
        </button>
      </div>

      <div className="space-y-3">
        {request.transformations.renameColumns.length === 0 ? (
          <p className="text-sm text-slate-500">No column rename rules yet.</p>
        ) : (
          request.transformations.renameColumns.map((rule, index) => (
            <div key={`${rule.source}-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_100px]">
              <select
                value={rule.source}
                onChange={(event) => updateRule(index, { source: event.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              >
                {columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={rule.target}
                onChange={(event) => updateRule(index, { target: event.target.value })}
                placeholder="New column label"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => removeRule(index)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onApply}
        className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Apply Column Mapping
      </button>
    </section>
  )
}

export default ColumnMappingPanel
