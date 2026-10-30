import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { BarChart3, PieChart as PieIcon } from 'lucide-react'
import type { Report } from '../types'
import { CATEGORY_COLORS, formatStatus, isResolved, isInProgress, isUnderReview } from '../lib/format'

type AnalyticsChartsProps = {
  reports: Report[]
}

const STATUS_COLORS: Record<string, string> = {
  submitted: '#3b82f6', // blue
  under_review: '#9333ea', // purple
  in_progress: '#f59e0b', // amber
  resolved: '#10b981', // emerald
}

export function AnalyticsCharts({ reports }: AnalyticsChartsProps) {
  // Aggregate real categories
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    reports.forEach((r) => {
      const cat = r.category || 'Uncategorized'
      counts[cat] = (counts[cat] || 0) + 1
    })

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        color: CATEGORY_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.count - a.count)
  }, [reports])

  // Aggregate real status
  const statusData = useMemo(() => {
    let submitted = 0
    let underReview = 0
    let inProgress = 0
    let resolved = 0

    reports.forEach((r) => {
      if (isResolved(r.status)) resolved++
      else if (isInProgress(r.status)) inProgress++
      else if (isUnderReview(r.status)) underReview++
      else submitted++
    })

    return [
      { name: 'Submitted', value: submitted, color: STATUS_COLORS.submitted },
      { name: 'Under Review', value: underReview, color: STATUS_COLORS.under_review },
      { name: 'In Progress', value: inProgress, color: STATUS_COLORS.in_progress },
      { name: 'Resolved', value: resolved, color: STATUS_COLORS.resolved },
    ].filter((item) => item.value > 0)
  }, [reports])

  return (
    <div className="analytics-grid">
      {/* Category Breakdown Bar Chart */}
      <div className="panel chart-card">
        <div className="panel__head">
          <div className="chart-card__title-group">
            <div className="chart-card__icon" aria-hidden="true">
              <BarChart3 size={18} />
            </div>
            <div>
              <h3>Incidents by Category</h3>
              <p className="chart-card__subtitle">Distribution across municipal service areas</p>
            </div>
          </div>
          <span className="badge badge--neutral">{categoryData.length} active categories</span>
        </div>

        <div className="chart-card__body">
          {categoryData.length === 0 ? (
            <p className="chart-card__empty">No categories recorded yet.</p>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 24, bottom: 0 }}
                >
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#334155', fontSize: 12 }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '13px',
                    }}
                    formatter={(val) => [`${val} reports`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {categoryData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Status Pipeline Donut Chart */}
      <div className="panel chart-card">
        <div className="panel__head">
          <div className="chart-card__title-group">
            <div className="chart-card__icon" aria-hidden="true">
              <PieIcon size={18} />
            </div>
            <div>
              <h3>Status Pipeline</h3>
              <p className="chart-card__subtitle">Workflow lifecycle breakdown</p>
            </div>
          </div>
          <span className="badge badge--neutral">{reports.length} total</span>
        </div>

        <div className="chart-card__body">
          {statusData.length === 0 ? (
            <p className="chart-card__empty">No incidents in system.</p>
          ) : (
            <div className="donut-wrap">
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {statusData.map((entry) => (
                        <Cell key={`status-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '13px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="donut-legend">
                {statusData.map((item) => (
                  <div key={item.name} className="donut-legend__row">
                    <div className="donut-legend__indicator">
                      <span
                        className="legend-circle"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="donut-legend__label">{formatStatus(item.name)}</span>
                    </div>
                    <div className="donut-legend__values">
                      <strong>{item.value}</strong>
                      <span className="text-muted">
                        ({Math.round((item.value / reports.length) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
