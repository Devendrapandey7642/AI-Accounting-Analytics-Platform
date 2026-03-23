import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type KpiUnit = 'currency' | 'number' | 'percentage'
export type InsightTone = 'info' | 'positive' | 'warning'
export type ChartType = 'line' | 'bar' | 'pie' | 'scatter'
export type ChartPreference = 'auto' | ChartType
export type AggregationType = 'sum' | 'mean' | 'count'
export type GranularityType = 'auto' | 'day' | 'week' | 'month'
export type SortOrder = 'desc' | 'asc'
export type DashboardRole = 'analyst' | 'accountant' | 'manager' | 'founder'
export type NumericNullStrategy = 'keep' | 'zero' | 'mean'
export type TextNullStrategy = 'keep' | 'empty' | 'drop'
export type WorkspaceMode = 'compare' | 'append' | 'join' | 'benchmark'
export type JoinType = 'inner' | 'left' | 'outer'
export type WorkflowStatus = 'open' | 'reviewed' | 'done'
export type ThemeMode = 'light' | 'slate'

export interface KpiCard {
  id: string
  title: string
  value: number
  unit: KpiUnit
  subtitle: string
  color: string
}

export interface DatasetSummary {
  rows: number
  columns: number
  datasetType: string
  completeness: number
  dateColumns: string[]
  numericColumns: string[]
  categoricalColumns: string[]
  filteredRows?: number
  activeMetric?: string | null
  activeSecondaryMetric?: string | null
  activeCategoryColumn?: string | null
  activeDateColumn?: string | null
  dashboardRole?: DashboardRole
}

export interface ChartInteraction {
  filterColumn?: string
  labelKey?: string
}

export interface ChartDefinition {
  id: string
  title: string
  role?: string
  chartType: ChartType
  description: string
  caption: string
  data: Array<Record<string, number | string | boolean>>
  xKey?: string
  yKeys?: string[]
  valueKey?: string
  nameKey?: string
  xLabel?: string
  yLabel?: string
  seriesLabels?: Record<string, string>
  interaction?: ChartInteraction
}

export interface FilterOptions {
  metrics: string[]
  categoricalColumns: string[]
  dateColumns: string[]
  categoryValues: Record<string, string[]>
  dateRanges: Record<string, { min: string | null; max: string | null }>
  aggregations: AggregationType[]
  granularities: GranularityType[]
  sortOrders: SortOrder[]
  dashboardRoles: DashboardRole[]
  numericNullStrategies: NumericNullStrategy[]
  textNullStrategies: TextNullStrategy[]
}

export interface NumericSummaryEntry {
  sum: number
  mean: number
  min: number
  max: number
  count: number
  unit: KpiUnit
}

export interface InsightCard {
  id: string
  title: string
  body: string
  tone: InsightTone
}

export interface AnomalyItem {
  id: string
  title: string
  description: string
  severity: 'medium' | 'high' | 'low'
  metric?: string
  label?: string
  value?: number
}

export interface ComparisonCard {
  id: string
  title: string
  current: number
  previous: number
  delta: number
  deltaPercent: number
  unit: KpiUnit
}

export interface ComparisonSummary {
  enabled: boolean
  label: string
  baselineLabel: string
  cards: ComparisonCard[]
}

export interface DataPreview {
  columns: string[]
  rows: Array<Record<string, string | number>>
  totalRows: number
  sampled: boolean
}

export interface UploadSummary {
  id: number
  filename: string
  file_type: string
  status: string
  uploaded_at: string | null
  file_size?: number | null
  large_file?: boolean
}

export interface QualityReport {
  duplicateRows: number
  emptyColumns: string[]
  highNullColumns: Array<{
    column: string
    nullPercent: number
  }>
  recommendations: string[]
  coercionCandidates: Array<{
    column: string
    suggestedType: string
    sample: string
  }>
}

export interface ExternalComparisonSummary {
  enabled: boolean
  uploadId?: number
  fileName?: string
  dataset?: DatasetSummary
  kpis?: AnalyticsData['kpis']
}

export interface MergeSummary {
  enabled: boolean
  mode: WorkspaceMode
  fileName?: string
  rowsAdded?: number
  totalRows?: number
  commonColumns?: string[]
}

export interface JoinSummary {
  enabled: boolean
  fileName?: string
  joinKeys: string[]
  joinType: JoinType
  matchedRows: number
  unmatchedRows: number
  availableKeys: string[]
}

export interface BenchmarkSummary {
  enabled: boolean
  baselineLabel: string
  metric: string | null
  current: number
  baseline: number
  delta: number
  deltaPercent: number
}

export interface AlertItem {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  kind: 'anomaly' | 'quality' | 'comparison' | 'merge' | 'forecast' | 'target' | 'benchmark' | 'schedule'
}

export interface ForecastPoint {
  label: string
  actual?: number
  forecast?: number
}

export interface ScenarioImpact {
  baseline: number
  projected: number
  delta: number
  adjustmentPercent: number
}

export interface ForecastSummary {
  enabled: boolean
  metric: string | null
  description: string
  periods: number
  points: ForecastPoint[]
  scenarioImpact?: ScenarioImpact | null
}

export interface NarrativeSummary {
  title: string
  sections: Array<{
    id: string
    heading: string
    body: string
  }>
  recommendations: string[]
}

export interface TargetTrackingSummary {
  enabled: boolean
  metric: string | null
  targetValue: number
  actualValue: number
  variance: number
  variancePercent: number
  status: 'ahead' | 'behind' | 'on_track'
}

export interface DrillthroughSummary {
  enabled: boolean
  title: string
  columns: string[]
  rows: Array<Record<string, string | number>>
  totalRows: number
  sampled: boolean
}

export interface ChartBuilderConfig {
  enabled: boolean
  chartType: ChartType
  xColumn: string | null
  yColumns: string[]
  title: string
}

export interface ColumnRenameRule {
  source: string
  target: string
}

export interface DashboardRequest {
  filters: {
    dateColumn: string | null
    startDate: string
    endDate: string
    categoryColumn: string | null
    categories: string[]
    drilldownColumn: string | null
    drilldownValue: string
  }
  preferences: {
    metric: string | null
    secondaryMetric: string | null
    aggregation: AggregationType
    granularity: GranularityType
    topN: number
    sortOrder: SortOrder
    compareMode: boolean
    dashboardRole: DashboardRole
    chartPreference: ChartPreference
  }
  cleaning: {
    dropDuplicates: boolean
    removeEmptyColumns: boolean
    trimText: boolean
    numericNullStrategy: NumericNullStrategy
    textNullStrategy: TextNullStrategy
  }
  workspace: {
    compareUploadId: number | null
    mode: WorkspaceMode
    joinKeys: string[]
    joinType: JoinType
  }
  chartBuilder: ChartBuilderConfig
  scenario: {
    enabled: boolean
    metric: string | null
    adjustmentPercent: number
  }
  targets: {
    enabled: boolean
    metric: string | null
    targetValue: number
  }
  transformations: {
    renameColumns: ColumnRenameRule[]
  }
}

export interface DashboardCommandDetails {
  intent: string
  summary: string
  appliedChanges: string[]
  activeFilters: string[]
  focusMetric: string | null
  focusDimension: string | null
  generatedCharts: string[]
  followUpSuggestions: string[]
  usedExistingContext: boolean
}

export interface DashboardCommandResponse {
  response: string
  dashboard_action: DashboardRequest
  preview: {
    dataset: DatasetSummary
    kpis: AnalyticsData['kpis']
    chartCount: number
  }
  details: DashboardCommandDetails
}

export interface AnalyticsData {
  uploadId: number
  fileName: string
  status: string
  dataset: DatasetSummary
  kpis: {
    totalSales: number
    totalExpenses: number
    profit: number
    totalTransactions: number
    cards: KpiCard[]
  }
  charts: ChartDefinition[]
  columnSummary: Array<{
    name: string
    type: string
    nonNullCount: number
    uniqueCount: number
    sampleValues: string[]
  }>
  filterOptions: FilterOptions
  numericSummary: Record<string, NumericSummaryEntry>
  insightCards: InsightCard[]
  anomalies: AnomalyItem[]
  comparison: ComparisonSummary
  externalComparison: ExternalComparisonSummary
  mergeSummary: MergeSummary
  joinSummary: JoinSummary
  benchmark: BenchmarkSummary
  alerts: AlertItem[]
  forecast: ForecastSummary
  targetTracking: TargetTrackingSummary
  narrative: NarrativeSummary
  drillthrough: DrillthroughSummary
  qualityReport: QualityReport
  dataPreview: DataPreview
  activeRequest: DashboardRequest
}

interface AppState {
  uploadId: string | null
  analyticsData: AnalyticsData | null
  theme: ThemeMode
  mobileNavOpen: boolean
  setUploadId: (id: string) => void
  setAnalyticsData: (data: AnalyticsData) => void
  setTheme: (theme: ThemeMode) => void
  setMobileNavOpen: (open: boolean) => void
}

export const defaultDashboardRequest: DashboardRequest = {
  filters: {
    dateColumn: null,
    startDate: '',
    endDate: '',
    categoryColumn: null,
    categories: [],
    drilldownColumn: null,
    drilldownValue: '',
  },
  preferences: {
    metric: null,
    secondaryMetric: null,
    aggregation: 'sum',
    granularity: 'auto',
    topN: 8,
    sortOrder: 'desc',
    compareMode: false,
    dashboardRole: 'analyst',
    chartPreference: 'auto',
  },
  cleaning: {
    dropDuplicates: true,
    removeEmptyColumns: true,
    trimText: true,
    numericNullStrategy: 'keep',
    textNullStrategy: 'keep',
  },
  workspace: {
    compareUploadId: null,
    mode: 'compare',
    joinKeys: [],
    joinType: 'inner',
  },
  chartBuilder: {
    enabled: false,
    chartType: 'bar',
    xColumn: null,
    yColumns: [],
    title: '',
  },
  scenario: {
    enabled: false,
    metric: null,
    adjustmentPercent: 10,
  },
  targets: {
    enabled: false,
    metric: null,
    targetValue: 0,
  },
  transformations: {
    renameColumns: [],
  },
}

export const useAppStore = create<AppState>()(
  devtools((set) => ({
    uploadId: null,
    analyticsData: null,
    theme: 'light',
    mobileNavOpen: false,
    setUploadId: (id) => set({ uploadId: id }),
    setAnalyticsData: (data) => set({ analyticsData: data }),
    setTheme: (theme) => set({ theme }),
    setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  }))
)
