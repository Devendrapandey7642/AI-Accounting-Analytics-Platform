import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartDefinition } from '../store/useAppStore'
import { useAppStore } from '../store/useAppStore'

const COLORS = ['#2563eb', '#14b8a6', '#f97316', '#e11d48', '#7c3aed', '#0891b2']

interface DynamicChartProps {
  chart: ChartDefinition
  onSelectSegment?: (chart: ChartDefinition, value: string) => void
}

const formatTick = (value: number | string) => {
  if (typeof value === 'string') {
    return value.length > 18 ? `${value.slice(0, 18)}...` : value
  }

  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }

  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return value.toFixed(0)
}

const renderLineSeries = (chart: ChartDefinition) => {
  const yKeys = chart.yKeys || []

  return yKeys.map((key, index) => (
    <Line
      key={key}
      type="monotone"
      dataKey={key}
      name={chart.seriesLabels?.[key] || key}
      stroke={COLORS[index % COLORS.length]}
      strokeWidth={3}
      dot={(props) =>
        props.payload?.isAnomaly ? (
          <circle cx={props.cx} cy={props.cy} r={5} fill="#dc2626" stroke="#fff" strokeWidth={2} />
        ) : (
          <circle cx={props.cx} cy={props.cy} r={0} />
        )
      }
      activeDot={{ r: 6 }}
    />
  ))
}

const DynamicChart = ({ chart, onSelectSegment }: DynamicChartProps) => {
  const theme = useAppStore((state) => state.theme)
  const showBrush = Boolean(chart.xKey && chart.data.length > 10 && (chart.chartType === 'bar' || chart.chartType === 'line'))
  const axisStroke = theme === 'slate' ? '#94a3b8' : '#64748b'
  const gridStroke = theme === 'slate' ? 'rgba(148, 163, 184, 0.2)' : '#cbd5e1'
  const tooltipStyle = {
    borderRadius: '18px',
    border: theme === 'slate' ? '1px solid rgba(148, 163, 184, 0.24)' : '1px solid rgba(148, 163, 184, 0.28)',
    boxShadow: theme === 'slate' ? '0 24px 60px rgba(2, 8, 23, 0.45)' : '0 24px 50px rgba(15, 23, 42, 0.08)',
    backgroundColor: theme === 'slate' ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.98)',
    color: theme === 'slate' ? '#e2e8f0' : '#0f172a',
  }

  if (!chart.data.length) {
    return <div className="flex h-full items-center justify-center text-sm text-[color:var(--app-muted)]">No chart data available.</div>
  }

  if (chart.chartType === 'pie' && chart.nameKey && chart.valueKey) {
    const nameKey = chart.nameKey

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chart.data}
            dataKey={chart.valueKey}
            nameKey={chart.nameKey}
            innerRadius={52}
            outerRadius={88}
            paddingAngle={2}
            onClick={(payload) => {
              const selectedValue = payload?.payload?.[nameKey]
              if (selectedValue && onSelectSegment) {
                onSelectSegment(chart, String(selectedValue))
              }
            }}
            >
            {chart.data.map((entry, index) => (
              <Cell
                key={`${chart.id}-${index}`}
                fill={entry.isAnomaly ? '#dc2626' : COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value: number | string) => formatTick(value)} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ color: axisStroke }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (chart.chartType === 'scatter' && chart.xKey && chart.yKeys?.[0]) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey={chart.xKey}
            type="number"
            tickFormatter={formatTick}
            name={chart.xLabel}
            tickLine={false}
            axisLine={{ stroke: axisStroke }}
            tick={{ fill: axisStroke }}
          />
          <YAxis
            dataKey={chart.yKeys[0]}
            tickFormatter={formatTick}
            name={chart.yLabel}
            tickLine={false}
            axisLine={{ stroke: axisStroke }}
            tick={{ fill: axisStroke }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '4 4' }}
            formatter={(value: number | string) => formatTick(value)}
            contentStyle={tooltipStyle}
          />
          <Scatter data={chart.data} fill={COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  if (chart.chartType === 'bar' && chart.xKey) {
    const xKey = chart.xKey

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.data} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey={xKey}
            tickFormatter={formatTick}
            angle={-15}
            textAnchor="end"
            height={48}
            tickLine={false}
            axisLine={{ stroke: axisStroke }}
            tick={{ fill: axisStroke }}
          />
          <YAxis tickFormatter={formatTick} tickLine={false} axisLine={{ stroke: axisStroke }} tick={{ fill: axisStroke }} />
          <Tooltip formatter={(value: number | string) => formatTick(value)} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ color: axisStroke }} />
          {(chart.yKeys || []).map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              name={chart.seriesLabels?.[key] || key}
              fill={COLORS[index % COLORS.length]}
              radius={[8, 8, 0, 0]}
              onClick={(payload) => {
                const selectedValue = payload?.[xKey]
                if (selectedValue && onSelectSegment) {
                  onSelectSegment(chart, String(selectedValue))
                }
              }}
            >
              {chart.data.map((entry, cellIndex) => (
                <Cell
                  key={`${chart.id}-cell-${cellIndex}`}
                  fill={entry.isAnomaly ? '#dc2626' : COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          ))}
          {showBrush && (
            <Brush
              dataKey={xKey}
              height={24}
              stroke={COLORS[0]}
              fill={theme === 'slate' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(241, 245, 249, 0.96)'}
              travellerWidth={10}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (chart.chartType === 'line' && chart.xKey) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart.data} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey={chart.xKey}
            tickFormatter={formatTick}
            angle={-15}
            textAnchor="end"
            height={48}
            tickLine={false}
            axisLine={{ stroke: axisStroke }}
            tick={{ fill: axisStroke }}
          />
          <YAxis tickFormatter={formatTick} tickLine={false} axisLine={{ stroke: axisStroke }} tick={{ fill: axisStroke }} />
          <Tooltip formatter={(value: number | string) => formatTick(value)} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ color: axisStroke }} />
          {renderLineSeries(chart)}
          {showBrush && (
            <Brush
              dataKey={chart.xKey}
              height={24}
              stroke={COLORS[0]}
              fill={theme === 'slate' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(241, 245, 249, 0.96)'}
              travellerWidth={10}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return <div className="flex h-full items-center justify-center text-sm text-[color:var(--app-muted)]">Unsupported chart type.</div>
}

export default DynamicChart
