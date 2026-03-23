import { KanbanSquare } from 'lucide-react'
import { useMemo, useState } from 'react'
import { WorkflowStatus } from '../store/useAppStore'

export interface WorkflowTask {
  id: string
  title: string
  owner: string
  status: WorkflowStatus
  createdAt: string
}

interface TeamWorkflowPanelProps {
  tasks: WorkflowTask[]
  onAdd: (task: WorkflowTask) => void
  onUpdateStatus: (id: string, status: WorkflowStatus) => void
  onDelete: (id: string) => void
}

const statusOptions: WorkflowStatus[] = ['open', 'reviewed', 'done']

const TeamWorkflowPanel = ({
  tasks,
  onAdd,
  onUpdateStatus,
  onDelete,
}: TeamWorkflowPanelProps) => {
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('Team')
  const [activeFilter, setActiveFilter] = useState<'all' | WorkflowStatus>('all')
  const [search, setSearch] = useState('')

  const submit = () => {
    const normalized = title.trim()
    if (!normalized) {
      return
    }

    onAdd({
      id: `${Date.now()}`,
      title: normalized,
      owner: owner.trim() || 'Team',
      status: 'open',
      createdAt: new Date().toISOString(),
    })
    setTitle('')
  }

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return tasks.filter((task) => {
      const matchesStatus = activeFilter === 'all' || task.status === activeFilter
      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.owner.toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [activeFilter, search, tasks])

  const groupedTasks = useMemo(
    () =>
      statusOptions.reduce(
        (accumulator, status) => ({
          ...accumulator,
          [status]: filteredTasks.filter((task) => task.status === status),
        }),
        {} as Record<WorkflowStatus, WorkflowTask[]>
      ),
    [filteredTasks]
  )

  const statusCount = (status: WorkflowStatus) => tasks.filter((task) => task.status === status).length

  return (
    <section className="rounded-[2rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel)] p-6 shadow-[var(--app-shadow)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-3 text-[color:var(--app-highlight-strong)]">
          <KanbanSquare className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--app-ink)]">Team Workflow</h2>
          <p className="text-sm text-[color:var(--app-muted)]">Track open, reviewed, and completed actions tied to this dashboard.</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {statusOptions.map((status) => (
          <div key={status} className="rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">{status}</p>
            <p className="mt-2 text-2xl font-semibold text-[color:var(--app-ink)]">{statusCount(status)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_120px]">
        <input
          type="text"
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
          placeholder="Owner"
          className="rounded-xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-3 text-sm text-[color:var(--app-ink)] outline-none focus:border-[color:var(--app-highlight-strong)]"
        />
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Create workflow item"
          className="rounded-xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-3 text-sm text-[color:var(--app-ink)] outline-none focus:border-[color:var(--app-highlight-strong)]"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Item
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['all', ...statusOptions] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveFilter(status)}
              className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                activeFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] text-[color:var(--app-muted)]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search task or owner"
          className="rounded-xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-4 py-3 text-sm text-[color:var(--app-ink)] outline-none focus:border-[color:var(--app-highlight-strong)]"
        />
      </div>

      {tasks.length === 0 ? (
        <p className="mt-5 text-sm text-[color:var(--app-muted)]">No workflow items yet.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {statusOptions.map((status) => (
            <div key={status} className="rounded-[1.75rem] border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)]">{status}</h3>
                  <p className="mt-1 text-sm text-[color:var(--app-muted)]">{groupedTasks[status].length} items</p>
                </div>
              </div>

              <div className="space-y-3">
                {groupedTasks[status].length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--app-panel-border)] px-4 py-6 text-sm text-[color:var(--app-muted)]">
                    No tasks in this lane.
                  </div>
                ) : (
                  groupedTasks[status].map((task) => (
                    <article key={task.id} className="rounded-2xl border border-[color:var(--app-panel-border)] bg-white/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--app-ink)]">{task.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--app-muted)]">
                            {task.owner} / {new Date(task.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onDelete(task.id)}
                          className="rounded-full border border-[color:var(--app-panel-border)] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-muted)] transition hover:border-[color:var(--app-highlight-strong)]"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {statusOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => onUpdateStatus(task.id, option)}
                            className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                              task.status === option
                                ? 'bg-slate-900 text-white'
                                : 'border border-[color:var(--app-panel-border)] bg-white text-[color:var(--app-muted)]'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default TeamWorkflowPanel
