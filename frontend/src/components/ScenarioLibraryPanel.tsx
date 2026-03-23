import { LibraryBig } from 'lucide-react'
import { DashboardRequest } from '../store/useAppStore'

export interface SavedScenarioTemplate {
  id: string
  name: string
  scenario: DashboardRequest['scenario']
}

interface ScenarioLibraryPanelProps {
  request: DashboardRequest
  items: SavedScenarioTemplate[]
  onSave: (item: SavedScenarioTemplate) => void
  onApply: (item: SavedScenarioTemplate) => void
  onDelete: (id: string) => void
}

const ScenarioLibraryPanel = ({
  request,
  items,
  onSave,
  onApply,
  onDelete,
}: ScenarioLibraryPanelProps) => {
  const saveCurrentScenario = () => {
    const name = window.prompt('Save this scenario as:')
    if (!name) {
      return
    }

    onSave({
      id: `${Date.now()}`,
      name,
      scenario: request.scenario,
    })
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <LibraryBig className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Scenario Library</h2>
            <p className="text-sm text-slate-600">Save reusable what-if scenarios and reapply them in one click.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={saveCurrentScenario}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Save Scenario
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No scenarios saved yet.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{item.name}</p>
              <p className="mt-2 text-sm text-slate-600">
                {item.scenario.metric || 'Active metric'} / {item.scenario.adjustmentPercent}% / {item.scenario.enabled ? 'enabled' : 'disabled'}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => onApply(item)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default ScenarioLibraryPanel
