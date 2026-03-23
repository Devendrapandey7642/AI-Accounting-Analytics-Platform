import { startTransition, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Download, Loader2, Maximize2, X } from 'lucide-react'
import TopNavbar from '../components/TopNavbar'
import Sidebar from '../components/Sidebar'
import KPIStats from '../components/KPIStats'
import ChartCard from '../components/ChartCard'
import ReportButton from '../components/ReportButton'
import PredictionsButton from '../components/PredictionsButton'
import MobileTabBar from '../components/MobileTabBar'
import DynamicChart from '../components/DynamicChart'
import AnalyticsFilterBar from '../components/AnalyticsFilterBar'
import InsightCards from '../components/InsightCards'
import SchemaExplorer from '../components/SchemaExplorer'
import AnomalyPanel from '../components/AnomalyPanel'
import ComparisonPanel from '../components/ComparisonPanel'
import DataPreviewTable from '../components/DataPreviewTable'
import DrilldownPanel from '../components/DrilldownPanel'
import SavedViewsPanel, { SavedView } from '../components/SavedViewsPanel'
import CustomKpiBuilder, { CustomKpiDefinition } from '../components/CustomKpiBuilder'
import AlertCenter from '../components/AlertCenter'
import BenchmarkPanel from '../components/BenchmarkPanel'
import ChartLibraryPanel, { SavedChartTemplate } from '../components/ChartLibraryPanel'
import DataCleaningStudio from '../components/DataCleaningStudio'
import DashboardCommandBar from '../components/DashboardCommandBar'
import WorkspaceComparePanel from '../components/WorkspaceComparePanel'
import DashboardExportTools from '../components/DashboardExportTools'
import ChartBuilderPanel from '../components/ChartBuilderPanel'
import ColumnMappingPanel from '../components/ColumnMappingPanel'
import DrillthroughTable from '../components/DrillthroughTable'
import ForecastScenarioPanel from '../components/ForecastScenarioPanel'
import NarrativePanel from '../components/NarrativePanel'
import CommentBoard, { DashboardComment } from '../components/CommentBoard'
import ScheduledAlertsPanel, { ScheduledAlertRule } from '../components/ScheduledAlertsPanel'
import ScenarioLibraryPanel, { SavedScenarioTemplate } from '../components/ScenarioLibraryPanel'
import TargetTrackerPanel from '../components/TargetTrackerPanel'
import TeamWorkflowPanel, { WorkflowTask } from '../components/TeamWorkflowPanel'
import { useAnalytics } from '../hooks/useAnalytics'
import {
  WorkspaceStatePayload,
  getUploads,
  getWorkspaceShare,
  getWorkspaceState,
  runDashboardCommand,
  saveWorkspaceState,
} from '../services/apiService'
import {
  AnalyticsData,
  ChartDefinition,
  DashboardCommandDetails,
  DashboardRequest,
  UploadSummary,
  defaultDashboardRequest,
  useAppStore,
} from '../store/useAppStore'

const hydrateRequest = (request: Partial<DashboardRequest> | DashboardRequest): DashboardRequest => ({
  filters: {
    ...defaultDashboardRequest.filters,
    ...(request.filters || {}),
  },
  preferences: {
    ...defaultDashboardRequest.preferences,
    ...(request.preferences || {}),
  },
  cleaning: {
    ...defaultDashboardRequest.cleaning,
    ...(request.cleaning || {}),
  },
  workspace: {
    ...defaultDashboardRequest.workspace,
    ...(request.workspace || {}),
    joinKeys: [...((request.workspace?.joinKeys as string[] | undefined) || defaultDashboardRequest.workspace.joinKeys)],
  },
  chartBuilder: {
    ...defaultDashboardRequest.chartBuilder,
    ...(request.chartBuilder || {}),
    yColumns: [...((request.chartBuilder?.yColumns as string[] | undefined) || defaultDashboardRequest.chartBuilder.yColumns)],
  },
  scenario: {
    ...defaultDashboardRequest.scenario,
    ...(request.scenario || {}),
  },
  targets: {
    ...defaultDashboardRequest.targets,
    ...(request.targets || {}),
  },
  transformations: {
    ...defaultDashboardRequest.transformations,
    ...(request.transformations || {}),
    renameColumns: [
      ...((request.transformations?.renameColumns as DashboardRequest['transformations']['renameColumns'] | undefined) ||
        defaultDashboardRequest.transformations.renameColumns),
    ],
  },
})

const sanitizeFileName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart'
const getChartSurfaceId = (chartId: string, scope: 'grid' | 'modal') => `chart-${scope}-surface-${sanitizeFileName(chartId)}`

const uniqueStrings = (values: string[]) => [...new Set(values.filter(Boolean))]

const buildCommandSuggestions = (
  uploads: UploadSummary[],
  recentCommands: string[],
  details: DashboardCommandDetails | null,
  draftRequest: DashboardRequest,
  analyticsData: AnalyticsData | null,
  currentUploadId?: string
) => {
  if (!analyticsData) {
    return recentCommands
  }

  const metric = draftRequest.preferences.metric || analyticsData.dataset.activeMetric || analyticsData.filterOptions.metrics[0] || 'sales'
  const categoryColumn =
    draftRequest.filters.categoryColumn ||
    analyticsData.dataset.activeCategoryColumn ||
    analyticsData.filterOptions.categoricalColumns[0] ||
    'category'
  const firstCategory =
    (categoryColumn && analyticsData.filterOptions.categoryValues[categoryColumn]?.[0]) ||
    analyticsData.filterOptions.categoryValues[analyticsData.filterOptions.categoricalColumns[0] || '']?.[0]
  const compareUpload = uploads.find((item) => `${item.id}` !== currentUploadId)

  return uniqueStrings([
    ...recentCommands,
    ...(details?.followUpSuggestions || []),
    `show top 5 ${categoryColumn.toLowerCase()} by ${metric.toLowerCase()}`,
    `make it a pie chart by ${categoryColumn.toLowerCase()}`,
    `show anomalies for ${metric.toLowerCase()}`,
    `last 90 days average ${metric.toLowerCase()}`,
    compareUpload ? `compare with upload ${compareUpload.id} and manager view` : '',
    firstCategory ? `only ${firstCategory}` : '',
    analyticsData.filterOptions.metrics.includes('Profit') ? 'profit kyu gira' : '',
    analyticsData.filterOptions.metrics.includes('Profit') ? 'top 3 loss making categories' : '',
  ]).slice(0, 10)
}

const readStoredJson = <T,>(key: string, fallback: T): T => {
  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? (JSON.parse(rawValue) as T) : fallback
  } catch {
    return fallback
  }
}

const emptyWorkspaceState = (): WorkspaceStatePayload => ({
  savedViews: [],
  customKpis: [],
  comments: [],
  scenarioTemplates: [],
  chartTemplates: [],
  alertRules: [],
  workflowTasks: [],
  recentCommands: [],
  lastRequest: null,
})

const DashboardPage = () => {
  const { uploadId } = useParams<{ uploadId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const analyticsData = useAppStore((state) => state.analyticsData)
  const setMobileNavOpen = useAppStore((state) => state.setMobileNavOpen)
  const [draftRequest, setDraftRequest] = useState<DashboardRequest>(defaultDashboardRequest)
  const [appliedRequest, setAppliedRequest] = useState<DashboardRequest>(defaultDashboardRequest)
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [customKpis, setCustomKpis] = useState<CustomKpiDefinition[]>([])
  const [comments, setComments] = useState<DashboardComment[]>([])
  const [scenarioTemplates, setScenarioTemplates] = useState<SavedScenarioTemplate[]>([])
  const [chartTemplates, setChartTemplates] = useState<SavedChartTemplate[]>([])
  const [alertRules, setAlertRules] = useState<ScheduledAlertRule[]>([])
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTask[]>([])
  const [uploads, setUploads] = useState<UploadSummary[]>([])
  const [commandLoading, setCommandLoading] = useState(false)
  const [commandMessage, setCommandMessage] = useState('')
  const [commandDetails, setCommandDetails] = useState<DashboardCommandDetails | null>(null)
  const [lastAppliedCommand, setLastAppliedCommand] = useState('')
  const [recentCommands, setRecentCommands] = useState<string[]>([])
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null)
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false)
  const [workspaceSyncState, setWorkspaceSyncState] = useState<'loading' | 'saving' | 'synced' | 'error'>('loading')
  const [sharedWorkspaceLabel, setSharedWorkspaceLabel] = useState<string | null>(null)
  const { loading, error } = useAnalytics(appliedRequest)

  const savedViewKey = useMemo(() => `advanced-dashboard-views-${uploadId || 'default'}`, [uploadId])
  const customKpiKey = useMemo(() => `advanced-dashboard-kpis-${uploadId || 'default'}`, [uploadId])
  const commentKey = useMemo(() => `advanced-dashboard-comments-${uploadId || 'default'}`, [uploadId])
  const scenarioKey = useMemo(() => `advanced-dashboard-scenarios-${uploadId || 'default'}`, [uploadId])
  const chartLibraryKey = useMemo(() => `advanced-dashboard-chart-library-${uploadId || 'default'}`, [uploadId])
  const alertRuleKey = useMemo(() => `advanced-dashboard-alert-rules-${uploadId || 'default'}`, [uploadId])
  const workflowKey = useMemo(() => `advanced-dashboard-workflow-${uploadId || 'default'}`, [uploadId])
  const recentCommandKey = useMemo(() => `advanced-dashboard-recent-commands-${uploadId || 'default'}`, [uploadId])
  const hasExplicitView = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.has('view') || searchParams.has('share')
  }, [location.search])

  useEffect(() => {
    let cancelled = false

    const applyWorkspaceState = (payload: WorkspaceStatePayload) => {
      const normalizedRequest = payload.lastRequest ? hydrateRequest(payload.lastRequest) : null
      setSavedViews(
        (payload.savedViews || []).map((view) => ({
          ...view,
          request: hydrateRequest(view.request),
        }))
      )
      setCustomKpis(payload.customKpis || [])
      setComments(payload.comments || [])
      setScenarioTemplates(payload.scenarioTemplates || [])
      setChartTemplates(payload.chartTemplates || [])
      setAlertRules(payload.alertRules || [])
      setWorkflowTasks(payload.workflowTasks || [])
      setRecentCommands(payload.recentCommands || [])

      if (!hasExplicitView && normalizedRequest) {
        setDraftRequest(normalizedRequest)
        setAppliedRequest(normalizedRequest)
      }
    }

    const localFallback: WorkspaceStatePayload = {
      savedViews: readStoredJson<SavedView[]>(savedViewKey, []).map((view) => ({
        ...view,
        request: hydrateRequest(view.request),
      })),
      customKpis: readStoredJson<CustomKpiDefinition[]>(customKpiKey, []),
      comments: readStoredJson<DashboardComment[]>(commentKey, []),
      scenarioTemplates: readStoredJson<SavedScenarioTemplate[]>(scenarioKey, []),
      chartTemplates: readStoredJson<SavedChartTemplate[]>(chartLibraryKey, []),
      alertRules: readStoredJson<ScheduledAlertRule[]>(alertRuleKey, []),
      workflowTasks: readStoredJson<WorkflowTask[]>(workflowKey, []),
      recentCommands: readStoredJson<string[]>(recentCommandKey, []),
      lastRequest: null,
    }

    const loadWorkspace = async () => {
      if (!uploadId) {
        setWorkspaceHydrated(true)
        setWorkspaceSyncState('synced')
        return
      }

      setWorkspaceHydrated(false)
      setWorkspaceSyncState('loading')

      try {
        const remote = await getWorkspaceState(uploadId)
        if (cancelled) {
          return
        }

        const merged: WorkspaceStatePayload = {
          ...emptyWorkspaceState(),
          ...remote,
          savedViews: remote.savedViews.length > 0 ? remote.savedViews : localFallback.savedViews,
          customKpis: remote.customKpis.length > 0 ? remote.customKpis : localFallback.customKpis,
          comments: remote.comments.length > 0 ? remote.comments : localFallback.comments,
          scenarioTemplates:
            remote.scenarioTemplates.length > 0 ? remote.scenarioTemplates : localFallback.scenarioTemplates,
          chartTemplates: remote.chartTemplates.length > 0 ? remote.chartTemplates : localFallback.chartTemplates,
          alertRules: remote.alertRules.length > 0 ? remote.alertRules : localFallback.alertRules,
          workflowTasks: remote.workflowTasks.length > 0 ? remote.workflowTasks : localFallback.workflowTasks,
          recentCommands: remote.recentCommands.length > 0 ? remote.recentCommands : localFallback.recentCommands,
          lastRequest: remote.lastRequest || localFallback.lastRequest,
        }

        applyWorkspaceState(merged)
        setWorkspaceHydrated(true)
        setWorkspaceSyncState('synced')

        if (JSON.stringify(remote) !== JSON.stringify(merged)) {
          void saveWorkspaceState(uploadId, merged).catch(() => {
            // Keep local fallback intact if migration fails.
          })
        }
        return
      } catch {
        if (cancelled) {
          return
        }
      }

      applyWorkspaceState(localFallback)
      setWorkspaceHydrated(true)
      setWorkspaceSyncState('synced')
    }

    void loadWorkspace()

    return () => {
      cancelled = true
    }
  }, [
    alertRuleKey,
    chartLibraryKey,
    commentKey,
    customKpiKey,
    hasExplicitView,
    recentCommandKey,
    savedViewKey,
    scenarioKey,
    uploadId,
    workflowKey,
  ])

  useEffect(() => {
    window.localStorage.setItem(savedViewKey, JSON.stringify(savedViews))
  }, [savedViewKey, savedViews])

  useEffect(() => {
    window.localStorage.setItem(customKpiKey, JSON.stringify(customKpis))
  }, [customKpiKey, customKpis])

  useEffect(() => {
    window.localStorage.setItem(commentKey, JSON.stringify(comments))
  }, [commentKey, comments])

  useEffect(() => {
    window.localStorage.setItem(scenarioKey, JSON.stringify(scenarioTemplates))
  }, [scenarioKey, scenarioTemplates])

  useEffect(() => {
    window.localStorage.setItem(chartLibraryKey, JSON.stringify(chartTemplates))
  }, [chartLibraryKey, chartTemplates])

  useEffect(() => {
    window.localStorage.setItem(alertRuleKey, JSON.stringify(alertRules))
  }, [alertRuleKey, alertRules])

  useEffect(() => {
    window.localStorage.setItem(workflowKey, JSON.stringify(workflowTasks))
  }, [workflowKey, workflowTasks])

  useEffect(() => {
    window.localStorage.setItem(recentCommandKey, JSON.stringify(recentCommands))
  }, [recentCommandKey, recentCommands])

  useEffect(() => {
    void getUploads().then(setUploads).catch(() => setUploads([]))
  }, [])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [setMobileNavOpen, uploadId])

  useEffect(() => {
    let cancelled = false

    const loadSharedState = async () => {
      const searchParams = new URLSearchParams(location.search)
      const shareToken = searchParams.get('share')
      const viewParam = searchParams.get('view')

      if (!shareToken && !viewParam) {
        setSharedWorkspaceLabel(null)
        return
      }

      if (shareToken) {
        try {
          const sharedPayload = await getWorkspaceShare(shareToken)
          if (cancelled) {
            return
          }

          if (uploadId && `${sharedPayload.upload_id}` !== uploadId) {
            navigate(`/dashboard/${sharedPayload.upload_id}?share=${shareToken}`, { replace: true })
            return
          }

          const hydrated = hydrateRequest(sharedPayload.request)
          setDraftRequest(hydrated)
          setAppliedRequest(hydrated)
          setSharedWorkspaceLabel(sharedPayload.label || 'Shared workspace')
          setCommandMessage(sharedPayload.label ? `Loaded shared view: ${sharedPayload.label}` : 'Loaded shared workspace view.')
          return
        } catch {
          if (!cancelled) {
            setSharedWorkspaceLabel(null)
            setCommandMessage('Unable to load the shared workspace.')
          }
        }
      }

      if (viewParam) {
        try {
          const decoded = hydrateRequest(JSON.parse(decodeURIComponent(viewParam)) as DashboardRequest)
          setDraftRequest(decoded)
          setAppliedRequest(decoded)
          setSharedWorkspaceLabel('Shared URL view')
        } catch {
          if (!cancelled) {
            setSharedWorkspaceLabel(null)
          }
        }
      }
    }

    void loadSharedState()

    return () => {
      cancelled = true
    }
  }, [location.search, navigate, uploadId])

  useEffect(() => {
    if (analyticsData) {
      const hydratedRequest = hydrateRequest(analyticsData.activeRequest)
      setDraftRequest(hydratedRequest)
      setAppliedRequest(hydratedRequest)
    }
  }, [analyticsData])

  const expandedChart = useMemo(
    () => analyticsData?.charts.find((chart) => chart.id === expandedChartId) ?? null,
    [analyticsData, expandedChartId]
  )
  const commandSuggestions = useMemo(
    () => buildCommandSuggestions(uploads, recentCommands, commandDetails, draftRequest, analyticsData, uploadId),
    [analyticsData, commandDetails, draftRequest, recentCommands, uploadId, uploads]
  )
  const workspacePayload = useMemo<WorkspaceStatePayload>(
    () => ({
      savedViews: savedViews.map((view) => ({
        ...view,
        request: hydrateRequest(view.request),
      })),
      customKpis,
      comments,
      scenarioTemplates,
      chartTemplates,
      alertRules,
      workflowTasks,
      recentCommands,
      lastRequest: hydrateRequest(draftRequest),
    }),
    [
      alertRules,
      chartTemplates,
      comments,
      customKpis,
      draftRequest,
      recentCommands,
      savedViews,
      scenarioTemplates,
      workflowTasks,
    ]
  )

  useEffect(() => {
    if (expandedChartId && !expandedChart) {
      setExpandedChartId(null)
    }
  }, [expandedChart, expandedChartId])

  useEffect(() => {
    if (!uploadId || !workspaceHydrated) {
      return undefined
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setWorkspaceSyncState('saving')
      void saveWorkspaceState(uploadId, workspacePayload)
        .then(() => {
          if (!cancelled) {
            setWorkspaceSyncState('synced')
          }
        })
        .catch(() => {
          if (!cancelled) {
            setWorkspaceSyncState('error')
          }
        })
    }, 800)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [uploadId, workspaceHydrated, workspacePayload])

  useEffect(() => {
    if (!expandedChartId) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedChartId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expandedChartId])

  const applyRequest = (request: DashboardRequest) => {
    startTransition(() => {
      const hydratedRequest = hydrateRequest(request)
      setDraftRequest(hydratedRequest)
      setAppliedRequest(hydratedRequest)
    })
  }

  const applyDraftRequest = () => {
    applyRequest(hydrateRequest({
      filters: { ...draftRequest.filters },
      preferences: { ...draftRequest.preferences },
      cleaning: { ...draftRequest.cleaning },
      workspace: { ...draftRequest.workspace, joinKeys: [...draftRequest.workspace.joinKeys] },
      chartBuilder: { ...draftRequest.chartBuilder, yColumns: [...draftRequest.chartBuilder.yColumns] },
      scenario: { ...draftRequest.scenario },
      targets: { ...draftRequest.targets },
      transformations: {
        ...draftRequest.transformations,
        renameColumns: [...draftRequest.transformations.renameColumns],
      },
    }))
  }

  const resetRequest = () => {
    applyRequest(defaultDashboardRequest)
    setCommandMessage('')
    setCommandDetails(null)
  }

  const saveCurrentView = () => {
    const name = window.prompt('Save this dashboard view as:')
    if (!name) {
      return
    }

    const nextView: SavedView = {
      id: `${Date.now()}`,
      name,
      request: hydrateRequest(draftRequest),
    }
    setSavedViews((current) => [nextView, ...current])
  }

  const handleCommandRun = async (query: string, mode: 'manual' | 'live' = 'manual') => {
    if (!uploadId) {
      return
    }

    setCommandLoading(true)
    try {
      const result = await runDashboardCommand(uploadId, query, draftRequest)
      applyRequest(result.dashboard_action)
      setCommandMessage(result.response)
      setCommandDetails(result.details)
      setLastAppliedCommand(query)
      if (mode === 'manual') {
        setRecentCommands((current) => [query, ...current.filter((item) => item !== query)].slice(0, 6))
      }
    } catch (commandError) {
      setCommandDetails(null)
      setCommandMessage(
        commandError instanceof Error ? commandError.message : 'Unable to apply that dashboard command.'
      )
    } finally {
      setCommandLoading(false)
    }
  }

  const handleChartSelect = (value: string, filterColumn?: string) => {
    if (!filterColumn) {
      return
    }

    applyRequest({
      ...draftRequest,
      filters: {
        ...draftRequest.filters,
        categoryColumn: filterColumn,
        categories: [value],
        drilldownColumn: filterColumn,
        drilldownValue: value,
      },
    })
  }

  const applyScenarioTemplate = (item: SavedScenarioTemplate) => {
    applyRequest({
      ...draftRequest,
      scenario: { ...item.scenario },
    })
  }

  const applyChartTemplate = (item: SavedChartTemplate) => {
    applyRequest({
      ...draftRequest,
      chartBuilder: {
        ...item.config,
        yColumns: [...item.config.yColumns],
      },
    })
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const exportChart = (chart: ChartDefinition) => {
    const surfaceIds = [getChartSurfaceId(chart.id, 'modal'), getChartSurfaceId(chart.id, 'grid')]
    const svgElement = surfaceIds
      .map((id) => document.getElementById(id)?.querySelector('svg'))
      .find(Boolean) as SVGSVGElement | undefined

    if (svgElement) {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement

      if (!clonedSvg.getAttribute('xmlns')) {
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      }
      if (!clonedSvg.getAttribute('xmlns:xlink')) {
        clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      }

      const serialized = new XMLSerializer().serializeToString(clonedSvg)
      downloadBlob(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }), `${sanitizeFileName(chart.title)}.svg`)
      return
    }

    const dataKeys = Object.keys(chart.data[0] || {})
    const csv = [
      dataKeys.join(','),
      ...chart.data.map((entry) =>
        dataKeys.map((key) => `"${String(entry[key] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${sanitizeFileName(chart.title)}-data.csv`)
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--app-bg)]">
        <div className="p-12 text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
            <Loader2 className="h-12 w-12 animate-spin text-red-500" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-[color:var(--app-ink)]">Analysis Error</h1>
          <p className="mb-8 text-xl text-[color:var(--app-muted)]">Please try uploading again.</p>
          <a href="/" className="rounded-xl bg-blue-600 px-8 py-4 font-bold text-white transition-colors hover:bg-blue-700">
            Upload New File
          </a>
        </div>
      </div>
    )
  }

  const xAxisOptions = analyticsData
    ? [
        ...analyticsData.dataset.dateColumns,
        ...analyticsData.dataset.categoricalColumns,
        ...analyticsData.dataset.numericColumns,
      ]
    : []
  const columnOptions = analyticsData ? analyticsData.columnSummary.map((column) => column.name) : []

  return (
    <div className="dashboard-shell app-page-shell bg-[color:var(--app-bg)] text-[color:var(--app-ink)]">
      <TopNavbar />

      <div className="app-page-frame relative">
        <Sidebar />

        <main className="app-page-scroll px-3 py-5 sm:px-6 sm:py-8 lg:ml-64 lg:px-8">
          <div className="mobile-safe-offset mx-auto max-w-[1760px] pb-10 sm:pb-16">
            {!analyticsData ? (
              <div className="flex h-72 items-center justify-center sm:h-96">
                <Loader2 className="h-16 w-16 animate-spin text-[color:var(--app-highlight-strong)]" />
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                  <div>
                    <h1 className="mb-2 text-2xl font-bold text-[color:var(--app-ink)] sm:text-4xl">Advanced Analytics Workspace</h1>
                    <p className="text-sm text-[color:var(--app-muted)] sm:text-xl">
                      {analyticsData.fileName} / {analyticsData.dataset.filteredRows || analyticsData.dataset.rows} active rows / {analyticsData.dataset.columns} columns
                    </p>
                    <p className="mt-3 text-sm uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                      {analyticsData.dataset.datasetType} dataset / {analyticsData.dataset.completeness}% completeness / {analyticsData.dataset.dashboardRole} preset
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {sharedWorkspaceLabel && (
                        <span className="rounded-full border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--app-highlight-strong)]">
                          {sharedWorkspaceLabel}
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                          workspaceSyncState === 'error'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] text-[color:var(--app-muted)]'
                        }`}
                      >
                        {workspaceSyncState === 'loading'
                          ? 'Loading workspace'
                          : workspaceSyncState === 'saving'
                            ? 'Saving workspace'
                            : workspaceSyncState === 'error'
                              ? 'Local backup only'
                              : 'Workspace synced'}
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <PredictionsButton />
                    <ReportButton />
                  </div>
                </div>

                <DashboardCommandBar
                  onRun={handleCommandRun}
                  loading={commandLoading || loading}
                  resultMessage={commandMessage}
                  commandDetails={commandDetails}
                  lastAppliedCommand={lastAppliedCommand}
                  recentCommands={recentCommands}
                  suggestions={commandSuggestions}
                  activeRequest={analyticsData.activeRequest}
                  dataset={analyticsData.dataset}
                  chartCount={analyticsData.charts.length}
                />

                <AnalyticsFilterBar
                  draftRequest={draftRequest}
                  filterOptions={analyticsData.filterOptions}
                  onChange={setDraftRequest}
                  onApply={applyDraftRequest}
                  onReset={resetRequest}
                  onSaveView={saveCurrentView}
                />

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
                  <WorkspaceComparePanel
                    uploads={uploads}
                    currentUploadId={uploadId ? Number(uploadId) : undefined}
                    request={draftRequest}
                    externalComparison={analyticsData.externalComparison}
                    mergeSummary={analyticsData.mergeSummary}
                    joinSummary={analyticsData.joinSummary}
                    benchmark={analyticsData.benchmark}
                    onChange={setDraftRequest}
                    onApply={applyDraftRequest}
                  />
                  <DashboardExportTools analyticsData={analyticsData} request={draftRequest} />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
                  <ChartBuilderPanel
                    request={draftRequest}
                    xAxisOptions={xAxisOptions}
                    metrics={analyticsData.filterOptions.metrics}
                    onChange={setDraftRequest}
                    onApply={applyDraftRequest}
                  />
                  <ForecastScenarioPanel
                    request={draftRequest}
                    forecast={analyticsData.forecast}
                    metrics={analyticsData.filterOptions.metrics}
                    onChange={setDraftRequest}
                    onApply={applyDraftRequest}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
                  <ColumnMappingPanel
                    request={draftRequest}
                    columns={columnOptions}
                    onChange={setDraftRequest}
                    onApply={applyDraftRequest}
                  />
                  <TargetTrackerPanel
                    request={draftRequest}
                    metrics={analyticsData.filterOptions.metrics}
                    targetTracking={analyticsData.targetTracking}
                    onChange={setDraftRequest}
                    onApply={applyDraftRequest}
                  />
                </div>

                <DrilldownPanel
                  request={draftRequest}
                  onClearCategories={() =>
                    applyRequest({
                      ...draftRequest,
                      filters: { ...draftRequest.filters, categories: [] },
                    })
                  }
                  onClearDrilldown={() =>
                    applyRequest({
                      ...draftRequest,
                      filters: { ...draftRequest.filters, drilldownColumn: null, drilldownValue: '' },
                    })
                  }
                  onClearAll={() =>
                    applyRequest({
                      ...draftRequest,
                      filters: {
                        ...draftRequest.filters,
                        startDate: '',
                        endDate: '',
                        categories: [],
                        drilldownColumn: null,
                        drilldownValue: '',
                      },
                    })
                  }
                />

                <KPIStats />

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
                  <div className="space-y-6">
                    <InsightCards insights={analyticsData.insightCards} />
                    <NarrativePanel narrative={analyticsData.narrative} />
                  </div>
                  <div className="space-y-6">
                    <ComparisonPanel comparison={analyticsData.comparison} />
                    <BenchmarkPanel benchmark={analyticsData.benchmark} />
                    <AlertCenter alerts={analyticsData.alerts} />
                    <SavedViewsPanel
                      savedViews={savedViews}
                      onApply={(view) => applyRequest(view.request)}
                      onDelete={(id) => setSavedViews((current) => current.filter((view) => view.id !== id))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                      {analyticsData.charts.map((chart) => (
                        <ChartCard
                          key={chart.id}
                          title={chart.title}
                          description={chart.description}
                          caption={chart.caption}
                          className="glass-panel"
                          contentClassName="h-72 sm:h-80"
                          contentId={getChartSurfaceId(chart.id, 'grid')}
                          actions={
                            <>
                              <button
                                type="button"
                                onClick={() => exportChart(chart)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-3 py-2 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] hover:text-[color:var(--app-highlight-strong)]"
                              >
                                <Download className="h-4 w-4" />
                                Export
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedChartId(chart.id)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-3 py-2 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] hover:text-[color:var(--app-highlight-strong)]"
                              >
                                <Maximize2 className="h-4 w-4" />
                                Expand
                              </button>
                            </>
                          }
                        >
                          <DynamicChart
                            chart={chart}
                            onSelectSegment={(selectedChart, value) =>
                              handleChartSelect(value, selectedChart.interaction?.filterColumn)
                            }
                          />
                        </ChartCard>
                      ))}
                    </div>

                    <DataPreviewTable preview={analyticsData.dataPreview} />
                    <DrillthroughTable drillthrough={analyticsData.drillthrough} />
                  </div>

                  <div className="space-y-6">
                    <AnomalyPanel anomalies={analyticsData.anomalies} />
                    <DataCleaningStudio
                      request={draftRequest}
                      qualityReport={analyticsData.qualityReport}
                      onChange={setDraftRequest}
                      onApply={applyDraftRequest}
                    />
                    <CustomKpiBuilder
                      numericSummary={analyticsData.numericSummary}
                      definitions={customKpis}
                      onAdd={(definition) => setCustomKpis((current) => [definition, ...current])}
                      onRemove={(id) => setCustomKpis((current) => current.filter((item) => item.id !== id))}
                    />
                    <ScheduledAlertsPanel
                      rules={alertRules}
                      metrics={analyticsData.filterOptions.metrics}
                      numericSummary={analyticsData.numericSummary}
                      alerts={analyticsData.alerts}
                      onAdd={(rule) => setAlertRules((current) => [rule, ...current])}
                      onUpdate={(id, updates) =>
                        setAlertRules((current) =>
                          current.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
                        )
                      }
                      onToggle={(id) =>
                        setAlertRules((current) =>
                          current.map((rule) =>
                            rule.id === id ? { ...rule, active: !rule.active } : rule
                          )
                        )
                      }
                      onDelete={(id) => setAlertRules((current) => current.filter((rule) => rule.id !== id))}
                    />
                    <ScenarioLibraryPanel
                      request={draftRequest}
                      items={scenarioTemplates}
                      onSave={(item) => setScenarioTemplates((current) => [item, ...current])}
                      onApply={applyScenarioTemplate}
                      onDelete={(id) => setScenarioTemplates((current) => current.filter((item) => item.id !== id))}
                    />
                    <ChartLibraryPanel
                      config={draftRequest.chartBuilder}
                      items={chartTemplates}
                      onSave={(item) => setChartTemplates((current) => [item, ...current])}
                      onApply={applyChartTemplate}
                      onDelete={(id) => setChartTemplates((current) => current.filter((item) => item.id !== id))}
                    />
                    <TeamWorkflowPanel
                      tasks={workflowTasks}
                      onAdd={(task) => setWorkflowTasks((current) => [task, ...current])}
                      onUpdateStatus={(id, status) =>
                        setWorkflowTasks((current) =>
                          current.map((task) => (task.id === id ? { ...task, status } : task))
                        )
                      }
                      onDelete={(id) => setWorkflowTasks((current) => current.filter((task) => task.id !== id))}
                    />
                    <CommentBoard
                      comments={comments}
                      onAdd={(comment) => setComments((current) => [comment, ...current])}
                      onDelete={(id) => setComments((current) => current.filter((comment) => comment.id !== id))}
                    />
                    <SchemaExplorer columns={analyticsData.columnSummary} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

      </div>

      <MobileTabBar uploadId={uploadId} />

      {expandedChart && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            onClick={() => setExpandedChartId(null)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            aria-label="Close expanded chart"
          />
          <div className="relative w-full max-w-none sm:max-w-6xl">
            <ChartCard
              title={expandedChart.title}
              description={expandedChart.description}
              caption={expandedChart.caption}
              className="glass-panel"
              contentClassName="h-[58vh] sm:h-[68vh]"
              contentId={getChartSurfaceId(expandedChart.id, 'modal')}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => exportChart(expandedChart)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-3 py-2 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] hover:text-[color:var(--app-highlight-strong)]"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedChartId(null)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-panel-border)] bg-[color:var(--app-panel-strong)] px-3 py-2 text-sm font-semibold text-[color:var(--app-ink)] transition hover:border-[color:var(--app-highlight-strong)] hover:text-[color:var(--app-highlight-strong)]"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </button>
                </>
              }
            >
              <DynamicChart
                chart={expandedChart}
                onSelectSegment={(selectedChart, value) =>
                  handleChartSelect(value, selectedChart.interaction?.filterColumn)
                }
              />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
