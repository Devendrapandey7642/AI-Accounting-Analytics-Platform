import { FolderGit2, GitCompareArrows } from 'lucide-react'
import {
  BenchmarkSummary,
  DashboardRequest,
  ExternalComparisonSummary,
  JoinSummary,
  MergeSummary,
  UploadSummary,
} from '../store/useAppStore'

interface WorkspaceComparePanelProps {
  uploads: UploadSummary[]
  currentUploadId?: number
  request: DashboardRequest
  externalComparison: ExternalComparisonSummary
  mergeSummary: MergeSummary
  joinSummary: JoinSummary
  benchmark: BenchmarkSummary
  onChange: (request: DashboardRequest) => void
  onApply: () => void
}

const WorkspaceComparePanel = ({
  uploads,
  currentUploadId,
  request,
  externalComparison,
  mergeSummary,
  joinSummary,
  benchmark,
  onChange,
  onApply,
}: WorkspaceComparePanelProps) => {
  const availableUploads = uploads.filter(
    (upload) => upload.id !== request.workspace.compareUploadId && upload.id !== currentUploadId
  )

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <FolderGit2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Multi-file Workspace</h2>
          <p className="text-sm text-slate-600">Compare another upload or append matching rows into a combined workspace.</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="inline-flex flex-wrap rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {(['compare', 'append', 'join', 'benchmark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() =>
                onChange({
                  ...request,
                  workspace: {
                    ...request.workspace,
                    mode,
                  },
                })
              }
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                request.workspace.mode === mode ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <select
          value={request.workspace.compareUploadId || ''}
          onChange={(event) =>
            onChange({
              ...request,
              workspace: {
                ...request.workspace,
                compareUploadId: event.target.value ? Number(event.target.value) : null,
              },
            })
          }
          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-slate-400"
        >
          <option value="">Select uploaded file</option>
          {availableUploads.map((upload) => (
            <option key={upload.id} value={upload.id}>
              #{upload.id} - {upload.filename}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <GitCompareArrows className="h-4 w-4" />
          {request.workspace.mode === 'append'
            ? 'Append Workspace'
            : request.workspace.mode === 'join'
              ? 'Join Workspace'
              : request.workspace.mode === 'benchmark'
                ? 'Run Benchmark'
                : 'Compare Uploads'}
        </button>
      </div>

      {request.workspace.mode === 'join' && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Join Type</span>
            <select
              value={request.workspace.joinType}
              onChange={(event) =>
                onChange({
                  ...request,
                  workspace: {
                    ...request.workspace,
                    joinType: event.target.value as DashboardRequest['workspace']['joinType'],
                  },
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            >
              <option value="inner">inner</option>
              <option value="left">left</option>
              <option value="outer">outer</option>
            </select>
          </label>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Join Keys</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {joinSummary.availableKeys.map((key) => {
                const active = request.workspace.joinKeys.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...request,
                        workspace: {
                          ...request.workspace,
                          joinKeys: active
                            ? request.workspace.joinKeys.filter((item) => item !== key)
                            : [...request.workspace.joinKeys, key],
                        },
                      })
                    }
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {key}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {externalComparison.enabled && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Comparing against <span className="font-semibold">{externalComparison.fileName}</span> with{' '}
          {externalComparison.dataset?.rows || 0} rows.
        </div>
      )}

      {mergeSummary.enabled && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Appended {mergeSummary.rowsAdded || 0} rows from <span className="font-semibold">{mergeSummary.fileName}</span>.
        </div>
      )}

      {joinSummary.enabled && (
        <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-700">
          Joined on <span className="font-semibold">{joinSummary.joinKeys.join(', ')}</span> with {joinSummary.matchedRows} matched rows.
        </div>
      )}

      {benchmark.enabled && (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-700">
          Benchmark delta: {benchmark.deltaPercent.toFixed(1)}% vs <span className="font-semibold">{benchmark.baselineLabel}</span>.
        </div>
      )}
    </section>
  )
}

export default WorkspaceComparePanel
