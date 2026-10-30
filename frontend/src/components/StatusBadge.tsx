import { statusTone, formatStatus, derivePriority, priorityTone } from '../lib/format'
import type { Report } from '../types'

type StatusBadgeProps = {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = statusTone(status)
  return (
    <span className={`badge badge--status badge--status-${tone}`}>
      <span className="badge__dot" aria-hidden="true" />
      {formatStatus(status)}
    </span>
  )
}

type PriorityBadgeProps = {
  priority?: string | null
  report?: Report
}

export function PriorityBadge({ priority, report }: PriorityBadgeProps) {
  const level = priority ? derivePriority({ priority } as Report) : report ? derivePriority(report) : 'Low'
  const tone = priorityTone(level)

  return (
    <span className={`badge badge--priority badge--priority-${tone}`}>
      <span className="badge__dot" aria-hidden="true" />
      {level}
    </span>
  )
}

