import type { Report } from '../types'

export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatTimeAgo(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)

  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return formatDate(value)
}

export function formatStatus(status: string): string {
  return status
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function isSubmitted(status: string): boolean {
  return status.toLowerCase() === 'submitted'
}

export function isUnderReview(status: string): boolean {
  const value = status.toLowerCase()
  return value === 'under_review' || value === 'under-review' || value === 'under review' || value === 'review'
}

export function isInProgress(status: string): boolean {
  const value = status.toLowerCase()
  return value === 'in_progress' || value === 'in-progress' || value === 'in progress'
}

export function isResolved(status: string): boolean {
  const value = status.toLowerCase()
  return value === 'resolved' || value === 'closed' || value === 'completed'
}

export function statusTone(status: string): 'neutral' | 'review' | 'progress' | 'done' {
  if (isResolved(status)) return 'done'
  if (isInProgress(status)) return 'progress'
  if (isUnderReview(status)) return 'review'
  return 'neutral'
}

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low'

/**
 * Derives operational priority. Uses report.priority if present,
 * or derives a reliable operational triage level based on incident severity keywords and category.
 */
export function derivePriority(report: Report): PriorityLevel {
  if (report.priority) {
    const p = report.priority.toLowerCase()
    if (p.includes('crit')) return 'Critical'
    if (p.includes('high')) return 'High'
    if (p.includes('med')) return 'Medium'
    if (p.includes('low')) return 'Low'
  }

  const text = `${report.title} ${report.description} ${report.category || ''}`.toLowerCase()

  if (
    text.includes('severe') ||
    text.includes('collapse') ||
    text.includes('hazard') ||
    text.includes('danger') ||
    text.includes('burst') ||
    text.includes('gas leak') ||
    text.includes('live wire')
  ) {
    return 'Critical'
  }

  if (
    text.includes('overflowing') ||
    text.includes('waterlogging') ||
    text.includes('flood') ||
    text.includes('blocked drain') ||
    text.includes('broken main') ||
    text.includes('sewage') ||
    text.includes('traffic signal')
  ) {
    return 'High'
  }

  if (
    text.includes('pothole') ||
    text.includes('streetlight') ||
    text.includes('garbage') ||
    text.includes('waste') ||
    text.includes('dump')
  ) {
    return 'Medium'
  }

  return 'Low'
}

export function priorityTone(level: PriorityLevel): 'critical' | 'high' | 'medium' | 'low' {
  switch (level) {
    case 'Critical':
      return 'critical'
    case 'High':
      return 'high'
    case 'Medium':
      return 'medium'
    case 'Low':
    default:
      return 'low'
  }
}

export function countByStatus(reports: Report[]) {
  const total = reports.length
  const submitted = reports.filter((r) => isSubmitted(r.status)).length
  const underReview = reports.filter((r) => isUnderReview(r.status)).length
  const inProgress = reports.filter((r) => isInProgress(r.status)).length
  const resolved = reports.filter((r) => isResolved(r.status)).length
  const withCoords = reports.filter(
    (r) => r.latitude !== null && r.longitude !== null && !isNaN(r.latitude) && !isNaN(r.longitude)
  ).length
  const needsAttention = reports.filter(
    (r) => isSubmitted(r.status) || isUnderReview(r.status) || derivePriority(r) === 'Critical' || derivePriority(r) === 'High'
  ).length

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  return {
    total,
    submitted,
    underReview,
    inProgress,
    resolved,
    withCoords,
    needsAttention,
    resolutionRate,
  }
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Roads & potholes': '#3b82f6',
  'Street lighting': '#f59e0b',
  'Water supply': '#06b6d4',
  'Drainage & flooding': '#ef4444',
  'Waste collection': '#10b981',
  'Parks & public spaces': '#8b5cf6',
  'Noise': '#ec4899',
  'Other': '#64748b',
  'streetlight': '#f59e0b',
  'Waterlogging': '#ef4444',
}

