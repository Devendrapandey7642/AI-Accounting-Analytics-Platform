import { ClipboardList } from 'lucide-react'
import { NarrativeSummary } from '../store/useAppStore'

interface NarrativePanelProps {
  narrative: NarrativeSummary
}

const NarrativePanel = ({ narrative }: NarrativePanelProps) => {
  const copyNarrative = async () => {
    const text = [
      narrative.title,
      '',
      ...narrative.sections.map((section) => `${section.heading}\n${section.body}`),
      '',
      'Recommendations:',
      ...narrative.recommendations.map((item) => `- ${item}`),
    ].join('\n')

    await navigator.clipboard.writeText(text)
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{narrative.title}</h2>
            <p className="text-sm text-slate-600">AI-written executive narrative for the active dashboard view.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void copyNarrative()}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
        >
          Copy
        </button>
      </div>

      <div className="space-y-4">
        {narrative.sections.map((section) => (
          <article key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{section.heading}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">{section.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recommendations</p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          {narrative.recommendations.map((recommendation) => (
            <p key={recommendation}>{recommendation}</p>
          ))}
        </div>
      </div>
    </section>
  )
}

export default NarrativePanel
