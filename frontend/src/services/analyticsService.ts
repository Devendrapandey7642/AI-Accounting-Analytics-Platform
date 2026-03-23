import { defaultDashboardRequest, AnalyticsData, DashboardRequest } from '../store/useAppStore'
import { getAnalysisStatus, getInteractiveAnalytics, runAnalysis } from './apiService'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

export const waitForAnalysisCompletion = async (uploadId: string): Promise<void> => {
  await runAnalysis(uploadId)

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = await getAnalysisStatus(uploadId)

    if (status.status === 'completed') {
      return
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Analysis failed')
    }

    await delay(1200)
  }

  throw new Error('Analysis timed out')
}

export const fetchAnalytics = async (
  uploadId: string,
  request: DashboardRequest = defaultDashboardRequest
): Promise<AnalyticsData> => {
  await waitForAnalysisCompletion(uploadId)
  return getInteractiveAnalytics(uploadId, request)
}
