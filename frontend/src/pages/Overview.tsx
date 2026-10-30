import { useEffect, useState, useMemo } from 'react'
import {
  Inbox,
  Clock,
  Activity,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Sparkles,
  Flame,
  Cpu,
  Info,
  X,
} from 'lucide-react'
import { listReports, getHotspots, analyzeAllReports } from '../api/reports'
import { getErrorMessage } from '../api/client'
import { countByStatus } from '../lib/format'
import type { Report, Hotspot } from '../types'
import { KPICard } from '../components/KPICard'
import { NeedsAttention } from '../components/NeedsAttention'
import { HighPriorityQueue } from '../components/HighPriorityQueue'
import { OperationsMap } from '../components/OperationsMap'
import { AnalyticsCharts } from '../components/AnalyticsCharts'
import { RecentReportsTable } from '../components/RecentReportsTable'
import { DispatcherDrawer } from '../components/DispatcherDrawer'
import { LoadingPanel, ErrorPanel } from '../components/StatePanels'

export function Overview() {
  const [reports, setReports] = useState<Report[]>([])
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analyzingBatch, setAnalyzingBatch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showDisclosureModal, setShowDisclosureModal] = useState(false)
  const [attentionFilter, setAttentionFilter] = useState<'unassigned' | 'critical' | 'unmapped' | null>(null)

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [reportsData, hotspotsData] = await Promise.all([
        listReports(),
        getHotspots().catch(() => [] as Hotspot[]),
      ])
      setReports(reportsData)
      setHotspots(hotspotsData)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleBatchAnalysis() {
    setAnalyzingBatch(true)
    try {
      await analyzeAllReports()
      await loadData(true)
    } catch (err) {
      setError(`Batch ML analysis failed: ${getErrorMessage(err)}`)
    } finally {
      setAnalyzingBatch(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const counts = useMemo(() => countByStatus(reports), [reports])

  // Count ML duplicate candidates
  const duplicateCandidatesCount = useMemo(() => {
    return reports.filter((r) => r.ai_analysis?.is_duplicate).length
  }, [reports])

  function handleOpenDrawer(report: Report) {
    setSelectedReport(report)
    setIsDrawerOpen(true)
  }

  function handleReportUpdated(updatedReport: Report) {
    setReports((prev) =>
      prev.map((r) => (r.report_code === updatedReport.report_code ? updatedReport : r))
    )
    setSelectedReport(updatedReport)
  }

  return (
    <div className="operations-dashboard">
      {/* Header bar */}
      <div className="dashboard-hero">
        <div className="dashboard-hero__title-group">
          <div className="dashboard-hero__eyebrow">
            <span className="live-dot" aria-hidden="true" />
            <span>Live Dispatch Operations</span>
          </div>
          <h1 className="dashboard-hero__heading">Municipal Operations Center</h1>
          <p className="dashboard-hero__sub">
            Real-time civic complaint ingestion, geospatial monitoring, and operational triage from SQLite.
          </p>
        </div>

        <div className="dashboard-hero__actions">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => void loadData(true)}
            disabled={loading || refreshing}
            title="Reload from backend"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing…' : 'Refresh Feed'}</span>
          </button>
        </div>
      </div>

      {error && <ErrorPanel title="Connection Error" message={error} />}

      {loading ? (
        <LoadingPanel label="Connecting to CivicPulse API and querying live incidents…" />
      ) : (
        <>
          {/* Needs Attention Alert Bar */}
          <NeedsAttention
            reports={reports}
            activeFilter={attentionFilter}
            onFilterChange={setAttentionFilter}
            onSelectReport={handleOpenDrawer}
          />

          {/* Dynamic KPI Metric Cards */}
          <section className="kpi-grid" aria-label="Key Performance Indicators">
            <KPICard
              title="Total Incidents"
              value={counts.total}
              subtitle="Registered complaints in database"
              icon={<Inbox size={20} />}
              tone="slate"
              badge="Total Recorded"
            />
            <KPICard
              title="Awaiting Triage"
              value={counts.submitted}
              subtitle="Pending review or department dispatch"
              icon={<Clock size={20} />}
              tone="blue"
              badge={counts.submitted > 0 ? `${counts.submitted} pending` : 'All caught up'}
            />
            <KPICard
              title="In Progress"
              value={counts.inProgress}
              subtitle="Active municipal crew field work"
              icon={<Activity size={20} />}
              tone="amber"
              badge="Underway"
            />
            <KPICard
              title="Resolved"
              value={counts.resolved}
              subtitle={`${counts.resolutionRate}% overall resolution rate`}
              icon={<CheckCircle2 size={20} />}
              tone="emerald"
              badge={`${counts.resolutionRate}% rate`}
            />
            <KPICard
              title="GPS Mapped"
              value={counts.withCoords}
              subtitle={`${counts.total > 0 ? Math.round((counts.withCoords / counts.total) * 100) : 0}% geocoded coverage`}
              icon={<MapPin size={20} />}
              tone="blue"
              badge={`${counts.withCoords}/${counts.total} plotted`}
            />
          </section>

          {/* Incident Queue & Interactive GIS Map Split Row */}
          <section className="ops-split-row">
            <div className="ops-split-row__queue">
              <HighPriorityQueue
                reports={reports}
                onSelectReport={handleOpenDrawer}
              />
            </div>

            <div className="ops-split-row__map">
              <OperationsMap
                reports={reports}
                hotspots={hotspots}
                selectedReport={selectedReport}
                onSelectReport={handleOpenDrawer}
              />
            </div>
          </section>

          {/* AI Operations Insights & DBSCAN Hotspots Section */}
          <section className="ai-insights-section" aria-label="Local AI Operations Insights">
            <div className="ai-insights-panel">
              <div className="ai-insights-panel__head">
                <div className="ai-insights-panel__title-group">
                  <div className="ai-insights-panel__icon">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <h3 className="ai-insights-panel__title">Local Incident Intelligence & Hotspots</h3>
                    <p className="ai-insights-panel__sub">
                      Powered by local Python scikit-learn algorithms (TF-IDF vectorizer, spatial heuristics & DBSCAN clustering).
                    </p>
                  </div>
                </div>

                <div className="dashboard-hero__actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setShowDisclosureModal(true)}
                    title="View how local ML algorithms calculate scores and clusters"
                  >
                    <Info size={13} />
                    <span>Transparent AI Disclosure</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => void handleBatchAnalysis()}
                    disabled={analyzingBatch || loading}
                    title="Re-run local classification, duplicate detection, and scoring on all complaints"
                  >
                    <Sparkles size={13} className={analyzingBatch ? 'animate-spin' : ''} />
                    <span>{analyzingBatch ? 'Computing ML…' : 'Re-run Local Intelligence'}</span>
                  </button>
                </div>
              </div>

              <div className="ai-insights-panel__grid">
                {/* Detected Hotspots List */}
                {hotspots.length === 0 ? (
                  <div className="hotspot-card">
                    <div className="hotspot-card__header">
                      <span className="hotspot-card__tag">DBSCAN Geospatial Density</span>
                      <span className="hotspot-card__radius">Radius: 650m</span>
                    </div>
                    <h4 className="hotspot-card__title">No Problem Hotspots Detected</h4>
                    <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
                      Geographic density clustering requires ≥2 complaints within 650m with coordinates. As citizens report clusters, density rings will appear automatically on the GIS map.
                    </p>
                  </div>
                ) : (
                  hotspots.map((h) => (
                    <div key={`cluster-${h.cluster_id}`} className="hotspot-card">
                      <div className="hotspot-card__header">
                        <span className="hotspot-card__tag">
                          <Flame size={12} /> Cluster #{h.cluster_id + 1}
                        </span>
                        <span className="hotspot-card__radius">~{Math.round(h.radius_meters)}m radius</span>
                      </div>
                      <h4 className="hotspot-card__title">
                        {h.report_count} Reports Concentrated • {h.dominant_category}
                      </h4>
                      <div className="hotspot-card__chips">
                        {Object.entries(h.category_breakdown).map(([cat, cnt]) => (
                          <span key={cat} className="hotspot-category-chip">
                            {cat}: {cnt}
                          </span>
                        ))}
                      </div>
                      <div className="hotspot-card__coords">
                        <MapPin size={12} />
                        <span>
                          {h.centroid_lat.toFixed(4)}, {h.centroid_lng.toFixed(4)} ({h.report_codes.slice(0, 3).join(', ')}{h.report_codes.length > 3 ? ` +${h.report_codes.length - 3}` : ''})
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Intelligence Engine Status Card */}
                <div className="ai-intel-summary-card">
                  <h4 className="ai-intel-summary-card__title">
                    <Cpu size={15} />
                    <span>Local Intelligence Engine Status</span>
                  </h4>
                  <div className="ai-intel-stat-row">
                    <span>Classifier Architecture</span>
                    <span className="ai-intel-stat-val">TF-IDF + Naive Bayes</span>
                  </div>
                  <div className="ai-intel-stat-row">
                    <span>Analyzed Complaints</span>
                    <span className="ai-intel-stat-val">{reports.filter((r) => r.ai_analysis).length} / {reports.length}</span>
                  </div>
                  <div className="ai-intel-stat-row">
                    <span>Duplicate Candidates</span>
                    <span className="ai-intel-stat-val" style={{ color: duplicateCandidatesCount > 0 ? '#ea580c' : undefined }}>
                      {duplicateCandidatesCount} flagged
                    </span>
                  </div>
                  <div className="ai-intel-stat-row">
                    <span>Identified Density Hotspots</span>
                    <span className="ai-intel-stat-val">{hotspots.length} active</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Operational Analytics with Recharts */}
          <section className="ops-analytics-section">
            <AnalyticsCharts reports={reports} />
          </section>

          {/* Recent Reports / Incident Register Table */}
          <section className="ops-register-section">
            <RecentReportsTable
              reports={reports}
              onSelectReport={handleOpenDrawer}
            />
          </section>

          {/* Slide-over Dispatcher Action Drawer */}
          <DispatcherDrawer
            report={selectedReport}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onReportUpdated={handleReportUpdated}
          />

          {/* Transparent AI Disclosure Modal */}
          {showDisclosureModal && (
            <div className="disclosure-modal-backdrop" onClick={() => setShowDisclosureModal(false)}>
              <div className="disclosure-modal" onClick={(e) => e.stopPropagation()}>
                <div className="disclosure-modal-header">
                  <div className="disclosure-modal-title">
                    <Cpu size={20} />
                    <span>CivicPulse Local ML Incident Intelligence</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowDisclosureModal(false)}
                    title="Close dialog"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="disclosure-modal-body">
                  <p className="disclosure-lead">
                    CivicPulse AI runs 100% locally on your municipal server using Python and scikit-learn. No citizen data is ever uploaded to external cloud APIs or proprietary LLMs.
                  </p>

                  <div className="disclosure-section">
                    <h4>1. Local Text Classification</h4>
                    <p>
                      Titles and descriptions are tokenized with TF-IDF vectorization and classified into municipal categories (Pothole, Waterlogging, Drainage, Garbage, Streetlight, Road Damage) using a local Multinomial Naive Bayes model with transparent keyword fallback rules.
                    </p>
                  </div>

                  <div className="disclosure-section">
                    <h4>2. Duplicate Complaint Detection</h4>
                    <p>
                      Incoming complaints are compared with existing reports using TF-IDF cosine similarity weighted by Haversine geographical proximity (&lt;150m proximity boost, &gt;3km penalty). Possible duplicates require human dispatcher confirmation before linking.
                    </p>
                  </div>

                  <div className="disclosure-section">
                    <h4>3. Transparent Priority Formula</h4>
                    <p>
                      Priority is derived using an explainable engineering heuristic:
                      <br />
                      <code>Priority Score = (0.35 × Urgency) + (0.30 × Impact) + (0.20 × Recurrence) + (0.15 × Frequency)</code>
                      <br />
                      Ranges: 75–100 Critical, 50–74 High, 25–49 Medium, 0–24 Low. This is an operational heuristic for municipal triage, not a certified safety risk formula.
                    </p>
                  </div>

                  <div className="disclosure-section">
                    <h4>4. Extractive Summarization & SOP Recommendations</h4>
                    <p>
                      Summaries extract key clauses directly from citizen descriptions with zero hallucination. Recommended actions are standard operating procedures (SOP) mapped from the issue category and priority level.
                    </p>
                  </div>

                  <div className="disclosure-section">
                    <h4>5. Geographic Hotspot Detection</h4>
                    <p>
                      Density-Based Spatial Clustering of Applications with Noise (DBSCAN) groups geographically clustered complaints using Haversine distance, identifying high-density problem corridors without fabricating artificial hotspots.
                    </p>
                  </div>
                </div>

                <div className="disclosure-modal-footer">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => setShowDisclosureModal(false)}
                  >
                    Understood
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
