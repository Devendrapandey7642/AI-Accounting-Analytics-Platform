import { Download } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { generateReport } from '../services/apiService'
import { useState } from 'react'

const ReportButton = () => {
  const uploadId = useAppStore((state) => state.uploadId)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDownload = async () => {
    if (!uploadId) return
    setLoading(true)
    setErrorMessage(null)
    try {
      const blob = await generateReport(uploadId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `accounting-report-${uploadId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Report download failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        disabled={!uploadId || loading}
        className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-medium text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="31.4" />
          </svg>
        ) : (
          <>
            <Download className="h-5 w-5" />
            <span>{loading ? 'Generating...' : 'Download PDF Report'}</span>
          </>
        )}
      </button>
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
    </div>
  )
}

export default ReportButton
