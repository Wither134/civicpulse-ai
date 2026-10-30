import { AlertCircle, ChevronRight, MapPin, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Report } from '../types'
import { derivePriority, formatTimeAgo, displayValue } from '../lib/format'
import { PriorityBadge, StatusBadge } from './StatusBadge'

type HighPriorityQueueProps = {
  reports: Report[]
  onSelectReport?: (report: Report) => void
}

export function HighPriorityQueue({ reports, onSelectReport }: HighPriorityQueueProps) {
  // Sort by derived priority: Critical first, then High, then Medium
  const priorityRank: Record<string, number> = {
    Critical: 3,
    High: 2,
    Medium: 1,
    Low: 0,
  }

  const urgentReports = reports
    .map((r) => ({ report: r, priorityLevel: derivePriority(r) }))
    .filter((item) => item.priorityLevel === 'Critical' || item.priorityLevel === 'High')
    .sort((a, b) => {
      const diff = (priorityRank[b.priorityLevel] || 0) - (priorityRank[a.priorityLevel] || 0)
      if (diff !== 0) return diff
      return new Date(b.report.created_at).getTime() - new Date(a.report.created_at).getTime()
    })
    .map((item) => item.report)

  return (
    <div className="panel priority-queue">
      <div className="panel__head">
        <div className="priority-queue__head-title">
          <div className="pulse-indicator pulse-indicator--critical" aria-hidden="true" />
          <h2>High-Priority Triage Queue</h2>
          <span className="badge-count badge-count--critical">{urgentReports.length}</span>
        </div>
        <Link to="/reports" className="panel__link">
          Full Register &rarr;
        </Link>
      </div>

      {urgentReports.length === 0 ? (
        <div className="empty-mini">
          <AlertCircle size={24} className="text-muted" />
          <p>No critical or high-priority incidents currently pending triage.</p>
        </div>
      ) : (
        <div className="priority-queue__list">
          {urgentReports.map((report) => (
            <article
              key={report.id}
              className="priority-item"
              onClick={() => onSelectReport?.(report)}
            >
              <div className="priority-item__main">
                <div className="priority-item__header">
                  <span className="mono priority-item__code">{report.report_code}</span>
                  <PriorityBadge report={report} />
                  <StatusBadge status={report.status} />
                  <span className="priority-item__time">
                    <Clock size={12} />
                    {formatTimeAgo(report.created_at)}
                  </span>
                </div>

                <h4 className="priority-item__title">{report.title}</h4>

                <div className="priority-item__meta">
                  <span className="priority-item__category">
                    {displayValue(report.category)}
                  </span>
                  {report.location && (
                    <span className="priority-item__location">
                      <MapPin size={12} />
                      {report.location}
                    </span>
                  )}
                  {report.assigned_department && (
                    <span className="priority-item__dept">
                      Dept: {report.assigned_department}
                    </span>
                  )}
                </div>
              </div>

              <div className="priority-item__action">
                <button
                  type="button"
                  className="icon-link-btn icon-link-btn--action"
                  title="Open Dispatcher Action Console"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectReport?.(report)
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
