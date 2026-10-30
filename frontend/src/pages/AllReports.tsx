import { useEffect, useState } from 'react'
import { listReports } from '../api/reports'
import { getErrorMessage } from '../api/client'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/StatePanels'
import { RecentReportsTable } from '../components/RecentReportsTable'
import { DispatcherDrawer } from '../components/DispatcherDrawer'
import type { Report } from '../types'
import { Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AllReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await listReports()
      setReports(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

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
    <div className="reports-page">
      <div className="dashboard-hero">
        <div>
          <div className="dashboard-hero__eyebrow">
            <span>Municipal Records</span>
          </div>
          <h1 className="dashboard-hero__heading">Incident Register</h1>
          <p className="dashboard-hero__sub">
            Complete database of all citizen-reported issues, priority triage states, and department routing.
          </p>
        </div>

        <div className="dashboard-hero__actions">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => void load(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/submit" className="btn btn--primary btn--sm">
            <Plus size={16} />
            <span>New Complaint</span>
          </Link>
        </div>
      </div>

      {error ? <ErrorPanel title="Could not load reports" message={error} /> : null}

      {loading ? (
        <LoadingPanel label="Fetching all reports from SQLite database…" />
      ) : reports.length === 0 ? (
        <EmptyPanel
          title="The register is empty"
          message="Submit a complaint to see it recorded in the database."
        />
      ) : (
        <>
          <RecentReportsTable
            reports={reports}
            onSelectReport={handleOpenDrawer}
          />

          <DispatcherDrawer
            report={selectedReport}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onReportUpdated={handleReportUpdated}
          />
        </>
      )}
    </div>
  )
}
