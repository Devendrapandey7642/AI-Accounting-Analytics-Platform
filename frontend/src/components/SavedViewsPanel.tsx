import { Bookmark, Trash2 } from 'lucide-react'
import { DashboardRequest } from '../store/useAppStore'

export interface SavedView {
  id: string
  name: string
  request: DashboardRequest
}

interface SavedViewsPanelProps {
  savedViews: SavedView[]
  onApply: (view: SavedView) => void
  onDelete: (id: string) => void
}

const SavedViewsPanel = ({ savedViews, onApply, onDelete }: SavedViewsPanelProps) => {
  if (!savedViews.length) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Bookmark className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Saved Views</h2>
          <p className="text-sm text-slate-600">Reuse dashboard presets with one click.</p>
        </div>
      </div>

      <div className="space-y-3">
        {savedViews.map((view) => (
          <div key={view.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <button type="button" onClick={() => onApply(view)} className="text-left">
              <p className="font-semibold text-slate-900">{view.name}</p>
              <p className="text-sm text-slate-600">
                {view.request.preferences.metric || 'No metric'} • {view.request.preferences.aggregation}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onDelete(view.id)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SavedViewsPanel
