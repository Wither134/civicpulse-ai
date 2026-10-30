import { NavLink } from 'react-router-dom'
import {
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  PenLine,
  X,
  Radio,
  Building2,
  Server,
  Activity,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Operations Center', icon: LayoutDashboard, end: true },
  { to: '/reports', label: 'Incident Register', icon: ClipboardList, end: false },
  { to: '/submit', label: 'Submit Complaint', icon: PenLine, end: false },
  { to: '/track', label: 'Track Incident', icon: FileSearch, end: false },
]

type SidebarProps = {
  open: boolean
  onClose: () => void
  totalCount?: number
}

export function Sidebar({ open, onClose, totalCount }: SidebarProps) {
  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? 'is-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand__logo-wrap">
            <span className="brand__mark" aria-hidden="true">
              <Building2 size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="brand__name">CivicPulse AI</p>
              <div className="brand__status">
                <span className="status-beacon" />
                <span className="brand__tag">Operations Center</span>
              </div>
            </div>
          </div>
          <button
            className="icon-btn sidebar__close"
            type="button"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar__section-label">COMMAND & CONTROL</div>

        <nav className="nav" aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} strokeWidth={2} className="nav__icon" />
              <span className="nav__label">{label}</span>
              {to === '/reports' && totalCount !== undefined && totalCount > 0 && (
                <span className="nav__badge">{totalCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__system-status">
            <div className="system-status-indicator">
              <Server size={14} className="text-emerald" />
              <span>FastAPI 127.0.0.1:8000</span>
            </div>
            <div className="system-status-indicator">
              <Activity size={14} className="text-blue" />
              <span>SQLite Database Online</span>
            </div>
          </div>
          <div className="sidebar__foot-note">
            <Radio size={12} className="text-muted" />
            <span>Local Triage & Dispatch v0.2.0</span>
          </div>
        </div>
      </aside>
    </>
  )
}
