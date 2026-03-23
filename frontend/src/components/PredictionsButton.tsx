import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Brain } from 'lucide-react'

const PredictionsButton = () => {
  const { uploadId } = useParams<{ uploadId: string }>()
  const navigate = useNavigate()
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePredictions = async () => {
    if (!uploadId) return

    setIsGenerating(true)
    setErrorMessage(null)
    try {
      navigate(`/predictions/${uploadId}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to open the predictions view.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePredictions}
        disabled={isGenerating}
        className="inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-base font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <Brain className="h-5 w-5 mr-2" />
        {isGenerating ? 'Loading AI...' : 'AI Predictions'}
      </button>
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
    </div>
  )
}

export default PredictionsButton
