import { useState, useEffect, type FormEvent } from 'react'
import {
  X,
  Copy,
  Check,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  Bot,
  Sparkles,
  ShieldCheck,
  Send,
  ArrowUpRight,
  RefreshCw,
  GitFork,
  CheckCircle2,
  ListChecks,
  HelpCircle,
  PlusCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Report } from '../types'
import { MUNICIPAL_DEPARTMENTS, STATUS_OPTIONS, COMPLAINT_CATEGORIES } from '../types'
import { updateReport, reanalyzeReport, unlinkDuplicate } from '../api/reports'
import { getErrorMessage } from '../api/client'
import { formatDate, formatTimeAgo, derivePriority } from '../lib/format'
import { StatusBadge, PriorityBadge } from './StatusBadge'

type DispatcherDrawerProps = {
  report: Report | null
  isOpen: boolean
  onClose: () => void
  onReportUpdated: (updatedReport: Report) => void
  onSelectDuplicateReport?: (reportCode: string) => void
}

export function DispatcherDrawer({
  report,
  isOpen,
  onClose,
  onReportUpdated,
  onSelectDuplicateReport,
}: DispatcherDrawerProps) {
  // Form fields
  const [status, setStatus] = useState<string>('submitted')
  const [department, setDepartment] = useState<string>('')
  const [resolutionNote, setResolutionNote] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [category, setCategory] = useState<string>('')

  // State indicators
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDisclosure, setShowDisclosure] = useState(false)

  // Sync state whenever active report changes
  useEffect(() => {
    if (report) {
      setStatus(report.status || 'submitted')
      setDepartment(report.assigned_department || '')
      setResolutionNote(report.resolution_note || '')
      setPriority(report.priority || derivePriority(report))
      setCategory(report.category || '')
      setSuccessMessage(null)
      setErrorMessage(null)
      setCopied(false)
    }
  }, [report])

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !report) {
    return null
  }

  const analysis = report.ai_analysis

  const copyCode = async () => {
    await navigator.clipboard.writeText(report.report_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const updated = await updateReport(report.report_code, {
        status,
        assigned_department: department.trim() ? department : null,
        resolution_note: resolutionNote.trim() ? resolutionNote : null,
        priority: priority.trim() ? priority : null,
        category: category.trim() ? category : null,
      })

      setSuccessMessage(`Incident ${report.report_code} updated successfully in SQLite database!`)
      onReportUpdated(updated)
    } catch (err) {
      setErrorMessage(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleReanalyze = async () => {
    setAnalyzing(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const updated = await reanalyzeReport(report.report_code)
      setSuccessMessage(`Local incident intelligence re-calculated! Priority: ${updated.priority || 'Updated'}`)
      onReportUpdated(updated)
    } catch (err) {
      setErrorMessage(getErrorMessage(err))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleUnlink = async () => {
    setUnlinking(true)
    try {
      const updated = await unlinkDuplicate(report.report_code)
      setSuccessMessage('Duplicate status cleared. Incident marked as unique ticket.')
      onReportUpdated(updated)
    } catch (err) {
      setErrorMessage(getErrorMessage(err))
    } finally {
      setUnlinking(false)
    }
  }

  const handleApplyActionsToNotes = (actions: string[]) => {
    const header = '\n[Recommended Actions]:\n' + actions.map((a) => `• ${a}`).join('\n')
    setResolutionNote((prev) => (prev ? `${prev.trim()}\n${header}` : header.trim()))
  }

  const handleApplyCategory = (suggested: string) => {
    setCategory(suggested)
  }

  const derivedLevel = derivePriority(report)

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Flyout Drawer Panel */}
      <aside
        className="dispatcher-drawer"
        role="dialog"
        aria-labelledby="drawer-title"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header__meta">
            <div className="code-chip">
              <span className="mono">{report.report_code}</span>
              <button
                type="button"
                className="copy-mini-btn"
                onClick={() => void copyCode()}
                title="Copy tracking code"
              >
                {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              </button>
            </div>
            <PriorityBadge priority={report.priority} report={report} />
            <StatusBadge status={report.status} />
          </div>

          <div className="drawer-header__controls">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handleReanalyze}
              disabled={analyzing}
              title="Re-run local intelligence algorithms"
            >
              <RefreshCw size={13} className={analyzing ? 'animate-spin' : ''} />
              <span>{analyzing ? 'Analyzing…' : 'Re-Score'}</span>
            </button>
            <button
              type="button"
              className="icon-btn drawer-header__close"
              onClick={onClose}
              aria-label="Close action drawer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Drawer Scroll Body */}
        <div className="drawer-body">
          {/* Success Banner */}
          {successMessage && (
            <div className="banner banner--success" role="status">
              <Check size={18} />
              <div>
                <strong>Operation Completed</strong>
                <p>{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="banner banner--error" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>Action Error</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Duplicate Alert Card if Flagged */}
          {analysis && analysis.is_duplicate && (
            <div className="duplicate-banner" role="alert">
              <div className="duplicate-banner__header">
                <GitFork size={18} className="text-amber" />
                <div className="duplicate-banner__title">
                  <strong>Likely Duplicate Incident Detected</strong>
                  <p>
                    Matches earlier report{' '}
                    <button
                      type="button"
                      className="link-button mono"
                      onClick={() =>
                        analysis.duplicate_of_code &&
                        onSelectDuplicateReport?.(analysis.duplicate_of_code)
                      }
                    >
                      {analysis.duplicate_of_code || `ID #${analysis.duplicate_of_id}`}
                    </button>{' '}
                    with{' '}
                    <strong>{Math.round(analysis.duplicate_similarity * 100)}% similarity</strong>
                    {analysis.duplicate_distance_meters !== null &&
                      analysis.duplicate_distance_meters !== undefined && (
                        <span> within {Math.round(analysis.duplicate_distance_meters)}m</span>
                      )}
                    .
                  </p>
                </div>
              </div>
              <p className="duplicate-banner__sub">{analysis.duplicate_rationale}</p>
              <div className="duplicate-banner__actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={handleUnlink}
                  disabled={unlinking}
                >
                  {unlinking ? 'Unlinking…' : 'Unlink Duplicate (Mark Unique)'}
                </button>
              </div>
            </div>
          )}

          {/* Incident Overview Card */}
          <section className="drawer-section">
            <h2 id="drawer-title" className="drawer-title">
              {report.title}
            </h2>
            <p className="drawer-description">{report.description}</p>

            <div className="drawer-meta-list">
              <div className="drawer-meta-row">
                <span className="drawer-meta-label">Citizen Category</span>
                <span className="drawer-meta-val category-pill">
                  {report.category || 'Unassigned'}
                </span>
              </div>

              {analysis && analysis.predicted_category && (
                <div className="drawer-meta-row">
                  <span className="drawer-meta-label">AI Suggested Category</span>
                  <div className="flex-align-gap">
                    <span className="drawer-meta-val category-pill category-pill--predicted">
                      {analysis.predicted_category}
                    </span>
                    <span className="confidence-pill" title="Local text classification confidence">
                      {Math.round(analysis.category_confidence * 100)}%
                    </span>
                    {category !== analysis.predicted_category && (
                      <button
                        type="button"
                        className="btn-apply-category"
                        onClick={() => handleApplyCategory(analysis.predicted_category)}
                        title="Set category to ML suggestion"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="drawer-meta-row">
                <span className="drawer-meta-label">Reported Location</span>
                <span className="drawer-meta-val flex-align-gap">
                  <MapPin size={13} className="text-muted" />
                  {report.location || 'Not specified'}
                </span>
              </div>

              {report.latitude !== null && report.longitude !== null && (
                <div className="drawer-meta-row">
                  <span className="drawer-meta-label">GPS Coordinates</span>
                  <span className="drawer-meta-val mono">
                    {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                  </span>
                </div>
              )}

              <div className="drawer-meta-row">
                <span className="drawer-meta-label">Submitted</span>
                <span
                  className="drawer-meta-val flex-align-gap"
                  title={formatDate(report.created_at)}
                >
                  <Calendar size={13} className="text-muted" />
                  {formatTimeAgo(report.created_at)}
                </span>
              </div>
            </div>
          </section>

          {/* AI Intelligence & Explainable Scoring Panel */}
          <section className="drawer-section ai-intelligence-panel">
            <div className="ai-panel-header">
              <div className="ai-panel-header__title">
                <div className="ai-icon-badge">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3>Local Incident Intelligence</h3>
                  <p className="ai-sub">Local Scikit-Learn Algorithms & Explainable Heuristics</p>
                </div>
              </div>

              <button
                type="button"
                className="icon-btn-text"
                onClick={() => setShowDisclosure(!showDisclosure)}
                title="View AI disclosure and methodology"
              >
                <HelpCircle size={15} />
                <span>Methodology</span>
              </button>
            </div>

            {/* Disclosure Banner if toggled */}
            {showDisclosure && (
              <div className="ai-disclosure-box">
                <strong>Decision-Support Disclosure:</strong>
                <p>
                  All intelligence runs 100% locally on your machine with zero external or paid
                  APIs. Category suggestions use local TF-IDF & Naive Bayes classifiers; duplicate
                  detection combines TF-IDF cosine similarity with Haversine spatial distance;
                  priority scores use a transparent prototype engineering heuristic. Results are
                  assistive guidance and require municipal staff review.
                </p>
              </div>
            )}

            {/* Explainable Priority Score Breakdown */}
            {analysis ? (
              <div className="score-breakdown-card">
                <div className="score-main-row">
                  <div className="score-callout">
                    <span className="score-number">{analysis.priority_score.toFixed(1)}</span>
                    <span className="score-max">/ 100</span>
                    <span className={`priority-tag priority-tag--${analysis.priority_level.toLowerCase()}`}>
                      {analysis.priority_level} Priority
                    </span>
                  </div>

                  <div className="score-formula-preview">
                    <span className="formula-label">Municipal Dispatch Heuristic:</span>
                    <code className="formula-code">
                      Score = (0.35 × U) + (0.30 × I) + (0.20 × R) + (0.15 × F)
                    </code>
                  </div>
                </div>

                {/* Visual Component Weights Grid */}
                <div className="components-grid">
                  <div className="component-tile">
                    <span className="component-title">Urgency (35%)</span>
                    <strong className="component-val">{analysis.urgency}/100</strong>
                    <div className="mini-meter">
                      <div
                        className="mini-meter-fill mini-meter-fill--urgency"
                        style={{ width: `${analysis.urgency}%` }}
                      />
                    </div>
                  </div>

                  <div className="component-tile">
                    <span className="component-title">Impact (30%)</span>
                    <strong className="component-val">{analysis.impact}/100</strong>
                    <div className="mini-meter">
                      <div
                        className="mini-meter-fill mini-meter-fill--impact"
                        style={{ width: `${analysis.impact}%` }}
                      />
                    </div>
                  </div>

                  <div className="component-tile">
                    <span className="component-title">Recurrence (20%)</span>
                    <strong className="component-val">{analysis.recurrence}/100</strong>
                    <div className="mini-meter">
                      <div
                        className="mini-meter-fill mini-meter-fill--recurrence"
                        style={{ width: `${analysis.recurrence}%` }}
                      />
                    </div>
                  </div>

                  <div className="component-tile">
                    <span className="component-title">Frequency (15%)</span>
                    <strong className="component-val">{analysis.frequency}/100</strong>
                    <div className="mini-meter">
                      <div
                        className="mini-meter-fill mini-meter-fill--frequency"
                        style={{ width: `${analysis.frequency}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Factors narrative */}
                <div className="factor-reasons-list">
                  <span className="reasons-heading">Contributing Scoring Factors:</span>
                  <ul>
                    {analysis.factor_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="score-breakdown-card score-breakdown-card--fallback">
                <p>
                  Initial heuristic priority:{' '}
                  <strong className={`text-${derivedLevel.toLowerCase()}`}>
                    {derivedLevel}
                  </strong>
                  . Click &quot;Re-Score&quot; above to calculate comprehensive 4-factor scoring.
                </p>
              </div>
            )}

            {/* Extractive Summary Box */}
            <div className="extractive-summary-card">
              <div className="summary-card-header">
                <Bot size={15} className="text-blue" />
                <strong>Local Extractive Summary</strong>
                <span className="extractive-tag">Zero-Hallucination Salience</span>
              </div>
              <p className="extractive-summary-text">
                &ldquo;{analysis?.extractive_summary || report.ai_summary || report.description}&rdquo;
              </p>
            </div>

            {/* AI-Assisted Action Recommendations */}
            {analysis && analysis.recommended_actions.length > 0 && (
              <div className="recommended-actions-card">
                <div className="actions-header">
                  <div className="flex-align-gap">
                    <ListChecks size={16} className="text-blue" />
                    <strong>Recommended Next Steps (SOP Guidance)</strong>
                  </div>
                  <button
                    type="button"
                    className="btn-apply-notes"
                    onClick={() => handleApplyActionsToNotes(analysis.recommended_actions)}
                    title="Copy these steps into the resolution notes box"
                  >
                    <PlusCircle size={13} />
                    <span>Copy to Notes</span>
                  </button>
                </div>

                <ul className="actions-list">
                  {analysis.recommended_actions.map((action, idx) => (
                    <li key={idx} className="action-item">
                      <CheckCircle2 size={14} className="text-emerald action-icon" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Interactive Authority Workflow Controls Form */}
          <form id="dispatcher-form" className="drawer-form" onSubmit={handleSubmit}>
            <div className="form-section-header">
              <ShieldCheck size={18} className="text-blue" />
              <h3>Dispatcher Workflow Controls</h3>
            </div>

            {/* Status Segmented Control */}
            <div className="form__group">
              <label htmlFor="status-select">Operational Status</label>
              <div className="status-radio-group">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`status-radio-option ${
                      status === opt.value ? 'is-selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="incident-status"
                      value={opt.value}
                      checked={status === opt.value}
                      onChange={(e) => setStatus(e.target.value)}
                    />
                    <div className="status-radio-content">
                      <div className="status-radio-title">
                        <span className={`status-dot status-dot--${opt.value}`} />
                        <strong>{opt.label}</strong>
                      </div>
                      <span className="status-radio-desc">{opt.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Department Assignment */}
            <div className="form__group">
              <label htmlFor="department-select">
                <Building2 size={14} className="text-muted" />
                <span>Assign Responsible Department</span>
              </label>
              <select
                id="department-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="select-field"
              >
                <option value="">-- Unassigned (Triage Queue) --</option>
                {MUNICIPAL_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Override & Category Review */}
            <div className="form__row">
              <div className="form__group">
                <label htmlFor="priority-select">Priority Level</label>
                <select
                  id="priority-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="select-field"
                >
                  <option value="Critical">Critical (Score 75–100)</option>
                  <option value="High">High (Score 50–74)</option>
                  <option value="Medium">Medium (Score 25–49)</option>
                  <option value="Low">Low (Score 0–24)</option>
                </select>
              </div>

              <div className="form__group">
                <label htmlFor="category-select">Category</label>
                <select
                  id="category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select-field"
                >
                  <option value="">Uncategorized</option>
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resolution Note */}
            <div className="form__group">
              <label htmlFor="resolution-note">
                Resolution Notes & Field Dispatch Log
              </label>
              <textarea
                id="resolution-note"
                rows={4}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Document actions taken, crew dispatched, maintenance scheduled, or closure notes visible to citizens."
                className="input-field"
              />
              <span className="form-hint">
                These notes will be displayed to citizens on their tracking page.
              </span>
            </div>
          </form>
        </div>

        {/* Drawer Sticky Footer Actions */}
        <div className="drawer-footer">
          <Link
            to={`/track?code=${encodeURIComponent(report.report_code)}`}
            className="btn btn--secondary btn--sm"
            target="_blank"
            rel="noopener noreferrer"
            title="Inspect public tracking page"
          >
            <span>Citizen Tracking View</span>
            <ArrowUpRight size={14} />
          </Link>

          <div className="drawer-footer__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="dispatcher-form"
              className="btn btn--primary btn--sm"
              disabled={saving}
            >
              <Send size={14} />
              <span>{saving ? 'Saving to Database…' : 'Save & Dispatch'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
