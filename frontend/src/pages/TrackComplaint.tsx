import { useState, useEffect, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  Bot,
  ListChecks,
  Info,
} from 'lucide-react'
import { getReport } from '../api/reports'
import { getErrorMessage } from '../api/client'
import { StatusBadge, PriorityBadge } from '../components/StatusBadge'
import { LoadingPanel } from '../components/StatePanels'
import { displayValue, formatDate, isResolved, isInProgress, isUnderReview } from '../lib/format'
import type { Report } from '../types'

export function TrackComplaint() {
  const [searchParams] = useSearchParams()
  const initialCode = searchParams.get('code') || ''

  const [code, setCode] = useState(initialCode)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [copied, setCopied] = useState(false)

  async function performLookup(searchCode: string) {
    const trimmed = searchCode.trim().toUpperCase()
    if (!trimmed) {
      setError('Enter a tracking code such as CP-PQXWMO.')
      return
    }

    setLoading(true)
    setError(null)
    setReport(null)
    setSearched(true)
    try {
      const found = await getReport(trimmed)
      setReport(found)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Auto-search if code query parameter exists in URL
  useEffect(() => {
    if (initialCode) {
      void performLookup(initialCode)
    }
  }, [initialCode])

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await performLookup(code)
  }

  async function copyTrackingCode() {
    if (!report) return
    await navigator.clipboard.writeText(report.report_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Determine active step index: 0 = Submitted, 1 = Triage/Under Review/Dispatched, 2 = In Progress, 3 = Resolved
  let stepIndex = 0
  if (report) {
    if (isResolved(report.status)) stepIndex = 3
    else if (isInProgress(report.status)) stepIndex = 2
    else if (isUnderReview(report.status) || report.assigned_department) stepIndex = 1
    else stepIndex = 0
  }

  return (
    <div className="track-page narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">Public & Dispatch Audit</p>
          <h1>Track Incident Progress</h1>
          <p className="lede">
            Look up any civic report using its unique tracking code to view live resolution updates, departmental assignment, and status.
          </p>
        </div>
      </div>

      <form className="panel track-form" onSubmit={handleSearch}>
        <div className="track-form__input-wrap">
          <label htmlFor="track-code-input" className="track-form__label">
            Tracking Code
          </label>
          <div className="track-input-box">
            <Search size={18} className="track-input-box__icon" />
            <input
              id="track-code-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. CP-PQXWMO"
              autoCapitalize="characters"
              className="track-input-box__input mono"
              required
            />
          </div>
        </div>

        <button className="btn btn--primary" type="submit" disabled={loading}>
          <Search size={16} />
          <span>{loading ? 'Searching…' : 'Look Up Incident'}</span>
        </button>
      </form>

      {error ? (
        <div className="banner banner--error" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Report Not Found</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {loading ? <LoadingPanel label="Querying municipal database for tracking record…" /> : null}

      {report ? (
        <article className="panel report-card">
          <div className="report-card__top">
            <div className="report-card__title-meta">
              <div className="report-code-badge">
                <span className="mono tracking-code">{report.report_code}</span>
                <button
                  type="button"
                  className="copy-mini-btn"
                  onClick={() => void copyTrackingCode()}
                  title="Copy Code"
                >
                  {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                </button>
              </div>
              <h2 className="report-card__heading">{report.title}</h2>
            </div>

            <div className="report-card__badges">
              <PriorityBadge report={report} />
              <StatusBadge status={report.status} />
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="stepper-wrap">
            <div className={`step-item ${stepIndex >= 0 ? 'is-complete' : ''}`}>
              <div className="step-circle">
                <CheckCircle2 size={16} />
              </div>
              <div className="step-text">
                <strong>Submitted</strong>
                <span>{formatDate(report.created_at)}</span>
              </div>
            </div>

            <div className={`step-line ${stepIndex >= 1 ? 'is-complete' : ''}`} />

            <div className={`step-item ${stepIndex >= 1 ? 'is-complete' : ''}`}>
              <div className="step-circle">
                <Building2 size={16} />
              </div>
              <div className="step-text">
                <strong>Dispatched</strong>
                <span>{report.assigned_department || 'Triage queue'}</span>
              </div>
            </div>

            <div className={`step-line ${stepIndex >= 2 ? 'is-complete' : ''}`} />

            <div className={`step-item ${stepIndex >= 2 ? 'is-complete' : ''}`}>
              <div className="step-circle">
                <Clock size={16} />
              </div>
              <div className="step-text">
                <strong>In Progress</strong>
                <span>{isInProgress(report.status) ? 'Crew active' : 'Scheduled'}</span>
              </div>
            </div>

            <div className={`step-line ${stepIndex >= 3 ? 'is-complete' : ''}`} />

            <div className={`step-item ${stepIndex >= 3 ? 'is-complete' : ''}`}>
              <div className="step-circle">
                <CheckCircle2 size={16} />
              </div>
              <div className="step-text">
                <strong>Resolved</strong>
                <span>{isResolved(report.status) ? 'Complete' : 'Pending'}</span>
              </div>
            </div>
          </div>

          <div className="report-card__body-block">
            <h3>Description</h3>
            <p className="report-card__body">{report.description}</p>

            {report.ai_summary && (
              <div className="track-ai-summary-callout">
                <div className="track-ai-summary-title">
                  <Bot size={13} />
                  <span>Extractive Incident Summary (Local ML)</span>
                </div>
                <p className="track-ai-summary-body">{report.ai_summary}</p>
              </div>
            )}
          </div>

          {report.ai_analysis?.recommended_actions && report.ai_analysis.recommended_actions.length > 0 && (
            <div className="report-card__body-block" style={{ marginTop: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                <ListChecks size={14} className="text-muted" />
                <span>Recommended Municipal Next Steps (SOP)</span>
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {report.ai_analysis.recommended_actions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          )}

          {report.resolution_note && (
            <div className="resolution-callout">
              <h4>Resolution Details</h4>
              <p>{report.resolution_note}</p>
            </div>
          )}

          <dl className="meta-grid">
            <div className="meta-item">
              <dt>Category</dt>
              <dd>{displayValue(report.category)}</dd>
            </div>

            <div className="meta-item">
              <dt>Location</dt>
              <dd>
                {report.location ? (
                  <span className="flex-align-gap">
                    <MapPin size={13} className="text-muted" />
                    {report.location}
                  </span>
                ) : (
                  '—'
                )}
              </dd>
            </div>

            <div className="meta-item">
              <dt>Coordinates</dt>
              <dd className="mono">
                {report.latitude != null && report.longitude != null
                  ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`
                  : '—'}
              </dd>
            </div>

            <div className="meta-item">
              <dt>Assigned Department</dt>
              <dd>{displayValue(report.assigned_department)}</dd>
            </div>

            <div className="meta-item">
              <dt>First Reported</dt>
              <dd>
                <span className="flex-align-gap">
                  <Calendar size={13} className="text-muted" />
                  {formatDate(report.created_at)}
                </span>
              </dd>
            </div>

            <div className="meta-item">
              <dt>Last Updated</dt>
              <dd>
                <span className="flex-align-gap">
                  <Clock size={13} className="text-muted" />
                  {formatDate(report.updated_at)}
                </span>
              </dd>
            </div>
          </dl>

          <div className="track-ai-disclosure-banner">
            <Info size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--blue-primary)' }} />
            <div>
              <strong>Local Intelligence & Privacy Notice:</strong> CivicPulse analyses citizen incident reports using local machine learning algorithms (TF-IDF vectorization, spatial proximity heuristics, and keyword rules). All models execute locally on-premise without external cloud APIs. Priority scores and recommendations are advisory decision-support suggestions for municipal review.
            </div>
          </div>
        </article>
      ) : null}

      {!loading && !report && !error && searched ? (
        <p className="muted text-center">No report was returned for that code.</p>
      ) : null}
    </div>
  )
}
