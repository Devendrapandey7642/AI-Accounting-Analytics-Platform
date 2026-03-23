import { Search, TableProperties } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'

interface SchemaExplorerProps {
  columns: Array<{
    name: string
    type: string
    nonNullCount: number
    uniqueCount: number
    sampleValues: string[]
  }>
}

const SchemaExplorer = ({ columns }: SchemaExplorerProps) => {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filteredColumns = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()
    if (!normalized) {
      return columns
    }

    return columns.filter(
      (column) =>
        column.name.toLowerCase().includes(normalized) || column.type.toLowerCase().includes(normalized)
    )
  }, [columns, deferredQuery])

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <TableProperties className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Schema Explorer</h2>
          <p className="text-sm text-slate-600">Inspect the detected columns, data types, and sample values.</p>
        </div>
      </div>

      <label className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search columns or types..."
          className="w-full bg-transparent text-sm text-slate-900 outline-none"
        />
      </label>

      <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {filteredColumns.map((column) => (
          <article key={column.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{column.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{column.type}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{column.nonNullCount} filled</p>
                <p>{column.uniqueCount} unique</p>
              </div>
            </div>
            {column.sampleValues.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {column.sampleValues.map((sample) => (
                  <span key={`${column.name}-${sample}`} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 border border-slate-200">
                    {sample}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

export default SchemaExplorer
