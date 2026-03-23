import axios from 'axios'
import { AnalyticsData, DashboardCommandResponse, DashboardRequest, UploadSummary } from '../store/useAppStore'

const resolvedApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '/api'

const api = axios.create({
  baseURL: resolvedApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface UploadResponse {
  upload_id: number
  file_size?: number
  large_file?: boolean
  warnings?: string[]
  message: string
}

export interface AnalysisStep {
  key: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface AnalysisStatusResponse {
  upload_id: number
  status: 'not_started' | 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
  error?: string | null
  steps: AnalysisStep[]
}

export interface UploadsResponse {
  uploads: UploadSummary[]
}

export interface WorkspaceStatePayload {
  savedViews: Array<{
    id: string
    name: string
    request: DashboardRequest
  }>
  customKpis: Array<{
    id: string
    name: string
    formula: string
    aggregation: 'sum' | 'mean'
  }>
  comments: Array<{
    id: string
    author: string
    body: string
    createdAt: string
  }>
  scenarioTemplates: Array<{
    id: string
    name: string
    scenario: DashboardRequest['scenario']
  }>
  chartTemplates: Array<{
    id: string
    name: string
    config: DashboardRequest['chartBuilder']
  }>
  alertRules: Array<{
    id: string
    name: string
    metric: string | null
    condition: 'above' | 'below' | 'alert'
    threshold: number
    channel: 'email' | 'webhook' | 'slack'
    frequency: 'hourly' | 'daily' | 'weekly'
    active: boolean
  }>
  workflowTasks: Array<{
    id: string
    title: string
    owner: string
    status: 'open' | 'reviewed' | 'done'
    createdAt: string
  }>
  recentCommands: string[]
  lastRequest: DashboardRequest | null
  updated_at?: string | null
}

export interface WorkspaceShareResponse {
  upload_id: number
  share_token: string
  label?: string | null
  expires_at?: string | null
  shared_url_path: string
}

export interface WorkspaceSharePayload {
  upload_id: number
  label?: string | null
  request: DashboardRequest
  created_at?: string | null
  expires_at?: string | null
}

export const uploadFile = async (file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  if (onProgress) {
    onProgress(10)
  }

  const response = await api.post<UploadResponse>('/upload-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
    onUploadProgress: (progressEvent) => {
      if (!onProgress) {
        return
      }

      if (progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(Math.max(10, Math.min(90, progress)))
        return
      }

      if (progressEvent.loaded) {
        const estimatedProgress = Math.min(90, Math.round((progressEvent.loaded / file.size) * 80) + 10)
        onProgress(estimatedProgress)
      }
    },
  })

  if (onProgress) {
    onProgress(100)
  }

  return response.data
}

export const runAnalysis = async (uploadId: string) => {
  const response = await api.get<AnalysisStatusResponse>(`/run-analysis/${uploadId}`)
  return response.data
}

export const getAnalysisStatus = async (uploadId: string) => {
  const response = await api.get<AnalysisStatusResponse>(`/analysis-status/${uploadId}`)
  return response.data
}

export const getAnalytics = async (uploadId: string) => {
  const response = await api.get<AnalyticsData>(`/analytics/${uploadId}`, {
    validateStatus: (status) => status >= 200 && status < 300,
  })
  return response.data
}

export const getInteractiveAnalytics = async (uploadId: string, request: DashboardRequest) => {
  const response = await api.post<AnalyticsData>(`/analytics/${uploadId}/interactive`, request, {
    validateStatus: (status) => status >= 200 && status < 300,
  })
  return response.data
}

export const getUploads = async () => {
  const response = await api.get<UploadsResponse>('/uploads')
  return response.data.uploads
}

export const runDashboardCommand = async (
  uploadId: string,
  query: string,
  currentRequest: DashboardRequest
) => {
  const response = await api.post<DashboardCommandResponse>('/dashboard-command', {
    upload_id: uploadId,
    query,
    current_request: currentRequest,
  })
  return response.data
}

export const getWorkspaceState = async (uploadId: string) => {
  const response = await api.get<WorkspaceStatePayload>(`/workspace/${uploadId}`)
  return response.data
}

export const saveWorkspaceState = async (uploadId: string, payload: WorkspaceStatePayload) => {
  const response = await api.put<WorkspaceStatePayload>(`/workspace/${uploadId}`, payload)
  return response.data
}

export const createWorkspaceShare = async (
  uploadId: string,
  request: DashboardRequest,
  label?: string
) => {
  const response = await api.post<WorkspaceShareResponse>(`/workspace/${uploadId}/share`, {
    label,
    request,
  })
  return response.data
}

export const getWorkspaceShare = async (shareToken: string) => {
  const response = await api.get<WorkspaceSharePayload>(`/workspace-share/${shareToken}`)
  return response.data
}

export const askQuery = async (uploadId: string, query: string) => {
  const response = await api.post('/query', { upload_id: uploadId, query })
  return response.data
}

export const generateReport = async (uploadId: string) => {
  const response = await api.get(`/generate-consulting-report/${uploadId}`, { responseType: 'blob' })
  return response.data
}

export default api
