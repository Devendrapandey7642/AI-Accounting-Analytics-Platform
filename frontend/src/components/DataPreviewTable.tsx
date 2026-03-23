import { Eye } from 'lucide-react'
import { DataPreview } from '../store/useAppStore'

interface DataPreviewTableProps {
  preview: DataPreview
}

const DataPreviewTable = ({ preview }: DataPreviewTableProps) => {
  if (!preview.columns.length) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Data Preview</h2>
            <p className="text-sm text-slate-600">Quick look at the rows behind the current dashboard state.</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {preview.totalRows} rows {preview.sampled ? '• sampled preview' : ''}
        </p>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {preview.columns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold text-slate-700">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {preview.rows.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50">
                {preview.columns.map((column) => (
                  <td key={`${index}-${column}`} className="px-4 py-3 text-slate-600">
                    {String(row[column] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default DataPreviewTable
