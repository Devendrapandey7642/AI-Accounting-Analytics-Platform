import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchAnalytics } from '../services/analyticsService'
import { DashboardRequest, useAppStore } from '../store/useAppStore'

export const useAnalytics = (request: DashboardRequest) => {
  const { uploadId } = useParams<{ uploadId: string }>()
  const setAnalyticsData = useAppStore((state) => state.setAnalyticsData)
  const setUploadId = useAppStore((state) => state.setUploadId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestKey = useMemo(() => JSON.stringify(request), [request])

  useEffect(() => {
    let cancelled = false

    if (!uploadId) {
      setLoading(false)
      return undefined
    }

    setUploadId(uploadId)
    setLoading(true)
    setError(null)

    const parsedRequest = JSON.parse(requestKey) as DashboardRequest

    fetchAnalytics(uploadId, parsedRequest)
      .then((data) => {
        if (!cancelled) {
          setAnalyticsData(data)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestKey, setAnalyticsData, setUploadId, uploadId])

  return { loading, error }
}
