import { AlertTriangle, Clock, MapPinOff, ArrowRight, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Report } from '../types'
import { derivePriority, isSubmitted } from '../lib/format'

type NeedsAttentionProps = {
  reports: Report[]
  onSelectReport?: (report: Report) => void
  onFilterChange?: (filter: 'unassigned' | 'critical' | 'unmapped' | null) => void
  activeFilter?: string | null
}

export function NeedsAttention({ reports, onFilterChange, activeFilter }: NeedsAttentionProps) {
  const unassigned = reports.filter((r) => isSubmitted(r.status) && !r.assigned_department)
  const critical = reports.filter((r) => derivePriority(r) === 'Critical' || derivePriority(r) === 'High')
  const unmapped = reports.filter(
    (r) => r.latitude === null || r.longitude === null || isNaN(r.latitude) || isNaN(r.longitude)
  )

  const totalAlerts = unassigned.length + critical.length + unmapped.length

  if (totalAlerts === 0) {
    return null
  }

  return (
    <section className="needs-attention-banner" aria-label="Operational alerts">
      <div className="needs-attention-banner__lead">
        <div className="needs-attention-banner__icon">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h3 className="needs-attention-banner__heading">Needs Attention</h3>
          <p className="needs-attention-banner__sub">
            {reports.length} total incidents in system &bull; Action required on pending items
          </p>
        </div>
      </div>

      <div className="needs-attention-banner__chips">
        {critical.length > 0 && (
          <button
            type="button"
            className={`attention-chip attention-chip--critical ${
              activeFilter === 'critical' ? 'is-active' : ''
            }`}
            onClick={() => onFilterChange?.(activeFilter === 'critical' ? null : 'critical')}
          >
            <AlertTriangle size={15} />
            <span>
              <strong>{critical.length}</strong> High Priority / Urgent
            </span>
          </button>
        )}

        {unassigned.length > 0 && (
          <button
            type="button"
            className={`attention-chip attention-chip--pending ${
              activeFilter === 'unassigned' ? 'is-active' : ''
            }`}
            onClick={() => onFilterChange?.(activeFilter === 'unassigned' ? null : 'unassigned')}
          >
            <Clock size={15} />
            <span>
              <strong>{unassigned.length}</strong> Awaiting Department Dispatch
            </span>
          </button>
        )}

        {unmapped.length > 0 && (
          <button
            type="button"
            className={`attention-chip attention-chip--warning ${
              activeFilter === 'unmapped' ? 'is-active' : ''
            }`}
            onClick={() => onFilterChange?.(activeFilter === 'unmapped' ? null : 'unmapped')}
          >
            <MapPinOff size={15} />
            <span>
              <strong>{unmapped.length}</strong> Without GPS Coordinates
            </span>
          </button>
        )}

        <Link to="/reports" className="attention-chip attention-chip--link">
          <span>View All in Register</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  )
}
