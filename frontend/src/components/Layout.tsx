import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Menu, Plus, Clock, ShieldCheck } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [timeStr, setTimeStr] = useState('')
  const location = useLocation()

  // Live Operations clock
  useEffect(() => {
    function updateClock() {
      const now = new Date()
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Derive breadcrumb / title from route
  const getRouteLabel = () => {
    switch (location.pathname) {
      case '/':
        return 'Operations Dashboard'
      case '/reports':
        return 'Incident Register'
      case '/submit':
        return 'Submit Complaint'
      case '/track':
        return 'Track Incident'
      default:
        return 'Operations Console'
    }
  }

  return (
    <div className="shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              className="icon-btn topbar__menu"
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="topbar__breadcrumbs">
              <span className="topbar__system-badge">
                <ShieldCheck size={14} className="text-blue" />
                <span>Municipal Ops</span>
              </span>
              <span className="topbar__separator">/</span>
              <span className="topbar__current-view">{getRouteLabel()}</span>
            </div>
          </div>

          <div className="topbar__right">
            {timeStr && (
              <div className="topbar__clock" title="Operations Shift Time">
                <Clock size={14} className="text-muted" />
                <span className="mono">{timeStr}</span>
              </div>
            )}

            <Link to="/submit" className="btn btn--primary btn--sm">
              <Plus size={16} />
              <span>Report Issue</span>
            </Link>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
