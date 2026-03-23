import { MessageSquarePlus } from 'lucide-react'
import { useState } from 'react'

export interface DashboardComment {
  id: string
  author: string
  body: string
  createdAt: string
}

interface CommentBoardProps {
  comments: DashboardComment[]
  onAdd: (comment: DashboardComment) => void
  onDelete: (id: string) => void
}

const CommentBoard = ({ comments, onAdd, onDelete }: CommentBoardProps) => {
  const [author, setAuthor] = useState('Team')
  const [body, setBody] = useState('')

  const submit = () => {
    const normalized = body.trim()
    if (!normalized) {
      return
    }

    onAdd({
      id: `${Date.now()}`,
      author: author.trim() || 'Team',
      body: normalized,
      createdAt: new Date().toISOString(),
    })
    setBody('')
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <MessageSquarePlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Team Notes</h2>
          <p className="text-sm text-slate-600">Leave local workspace comments, decisions, and follow-up actions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_120px]">
        <input
          type="text"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Name"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
        />
        <input
          type="text"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment or action item"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Note
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{comment.author}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{comment.body}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default CommentBoard
