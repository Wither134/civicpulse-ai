import { useState, useMemo } from 'react'
import { Search, MapPin, ExternalLink, Filter, Copy, Check, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Report } from '../types'
import { displayValue, formatDate, formatTimeAgo, isInProgress, isResolved, isUnderReview } from '../lib/format'
import { PriorityBadge, StatusBadge } from './StatusBadge'

type RecentReportsTableProps = {
  reports: Report[]
  initialStatusFilter?: string | null
  onSelectReport?: (report: Report) => void
}

export function RecentReportsTable({
  reports,
  initialStatusFilter = 'all',
  onSelectReport,
}: RecentReportsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'all')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Filter by status
      if (statusFilter === 'submitted' && report.status !== 'submitted') return false
      if (statusFilter === 'under_review' && !isUnderReview(report.status)) return false
      if (statusFilter === 'in_progress' && !isInProgress(report.status)) return false
      if (statusFilter === 'resolved' && !isResolved(report.status)) return false

      // Filter by search query
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchCode = report.report_code.toLowerCase().includes(query)
        const matchTitle = report.title.toLowerCase().includes(query)
        const matchCategory = (report.category || '').toLowerCase().includes(query)
        const matchLocation = (report.location || '').toLowerCase().includes(query)
        const matchDept = (report.assigned_department || '').toLowerCase().includes(query)

        if (!matchCode && !matchTitle && !matchCategory && !matchLocation && !matchDept) {
          return false
        }
      }

      return true
    })
  }, [reports, statusFilter, search])

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="panel recent-reports-panel">
      <div className="panel__head table-panel-head">
        <div>
          <h2>Operational Incident Register</h2>
          <p className="table-panel-sub">
            Showing {filteredReports.length} of {reports.length} live records from SQLite
          </p>
        </div>

        <div className="table-controls">
          <div className="search-box">
            <Search size={16} className="search-box__icon" />
            <input
              type="text"
              placeholder="Search code, title, category, ward…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-box__input"
            />
          </div>

          <div className="status-select-wrap">
            <Filter size={14} className="status-select__icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-select"
            >
              <option value="all">All Statuses ({reports.length})</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="empty-panel-table">
          <p>No incidents match the search criteria or filter.</p>
          {(search || statusFilter !== 'all') && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Incident Title</th>
                <th>Category</th>
                <th>Location / Ward</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Reported</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="ops-table__row"
                  onClick={() => onSelectReport?.(report)}
                >
                  <td className="ops-table__code-cell">
                    <div className="code-chip">
                      <span className="mono">{report.report_code}</span>
                      <button
                        type="button"
                        className="copy-mini-btn"
                        title="Copy tracking code"
                        onClick={(e) => {
                          e.stopPropagation()
                          void copyCode(report.report_code)
                        }}
                      >
                        {copiedCode === report.report_code ? (
                          <Check size={12} className="text-emerald" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="ops-table__title-cell">
                    <span className="ops-table__title">{report.title}</span>
                    {report.assigned_department && (
                      <span className="ops-table__dept-sub">
                        Dept: {report.assigned_department}
                      </span>
                    )}
                  </td>

                  <td>
                    <span className="category-pill">{displayValue(report.category)}</span>
                  </td>

                  <td>
                    <div className="ops-table__location">
                      {report.location ? (
                        <>
                          <MapPin size={13} className="text-muted" />
                          <span>{report.location}</span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <StatusBadge status={report.status} />
                  </td>

                  <td>
                    <PriorityBadge report={report} />
                  </td>

                  <td className="ops-table__date-cell" title={formatDate(report.created_at)}>
                    <span className="ops-table__date">{formatTimeAgo(report.created_at)}</span>
                  </td>

                  <td className="text-right">
                    <div className="table-actions-group">
                      <button
                        type="button"
                        className="btn-action-icon btn-action-icon--primary"
                        title="Open Dispatcher Action Console"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectReport?.(report)
                        }}
                      >
                        <SlidersHorizontal size={13} />
                        <span>Dispatch</span>
                      </button>

                      <Link
                        to={`/track?code=${encodeURIComponent(report.report_code)}`}
                        className="btn-action-icon"
                        title="View Public Tracking Page"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={13} />
                        <span>Track</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
