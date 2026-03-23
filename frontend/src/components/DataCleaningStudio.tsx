import { Eraser, Sparkles } from 'lucide-react'
import { DashboardRequest, QualityReport } from '../store/useAppStore'

interface DataCleaningStudioProps {
  request: DashboardRequest
  qualityReport: QualityReport
  onChange: (request: DashboardRequest) => void
  onApply: () => void
}

const DataCleaningStudio = ({ request, qualityReport, onChange, onApply }: DataCleaningStudioProps) => {
  const updateCleaning = (
    patch: Partial<DashboardRequest['cleaning']>
  ) => {
    onChange({
      ...request,
      cleaning: {
        ...request.cleaning,
        ...patch,
      },
    })
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Eraser className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Data Cleaning Studio</h2>
          <p className="text-sm text-slate-600">Tune duplicate handling, null filling, and text cleanup before analysis.</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Drop duplicates
          <input
            type="checkbox"
            checked={request.cleaning.dropDuplicates}
            onChange={(event) => updateCleaning({ dropDuplicates: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Remove empty columns
          <input
            type="checkbox"
            checked={request.cleaning.removeEmptyColumns}
            onChange={(event) => updateCleaning({ removeEmptyColumns: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Trim text fields
          <input
            type="checkbox"
            checked={request.cleaning.trimText}
            onChange={(event) => updateCleaning({ trimText: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
        </label>
        <label className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Numeric nulls</span>
          <select
            value={request.cleaning.numericNullStrategy}
            onChange={(event) =>
              updateCleaning({
                numericNullStrategy: event.target.value as DashboardRequest['cleaning']['numericNullStrategy'],
              })
            }
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          >
            <option value="keep">keep</option>
            <option value="zero">fill with 0</option>
            <option value="mean">fill with mean</option>
          </select>
        </label>
        <label className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Text nulls</span>
          <select
            value={request.cleaning.textNullStrategy}
            onChange={(event) =>
              updateCleaning({
                textNullStrategy: event.target.value as DashboardRequest['cleaning']['textNullStrategy'],
              })
            }
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          >
            <option value="keep">keep</option>
            <option value="empty">replace with empty text</option>
            <option value="drop">drop rows with missing text</option>
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Sparkles className="h-4 w-4" />
          Current issues detected
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>{qualityReport.duplicateRows} duplicate rows detected before cleaning</li>
          <li>{qualityReport.emptyColumns.length} empty columns detected</li>
          <li>{qualityReport.highNullColumns.length} columns have 20%+ null values</li>
        </ul>

        {qualityReport.recommendations.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
            {qualityReport.recommendations.map((recommendation) => (
              <p key={recommendation} className="text-sm text-slate-600">
                {recommendation}
              </p>
            ))}
          </div>
        )}

        {qualityReport.coercionCandidates.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Type suggestions</p>
            <div className="space-y-2 text-sm text-slate-600">
              {qualityReport.coercionCandidates.map((candidate) => (
                <div key={candidate.column} className="rounded-xl bg-white px-3 py-2">
                  {candidate.column} looks like {candidate.suggestedType} data. Sample: {candidate.sample}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onApply}
        className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Apply Cleaning Rules
      </button>
    </section>
  )
}

export default DataCleaningStudio
