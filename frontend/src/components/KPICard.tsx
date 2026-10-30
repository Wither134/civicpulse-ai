import type { ReactNode } from 'react'

type KPICardProps = {
  title: string
  value: number | string
  subtitle?: string
  icon: ReactNode
  tone?: 'blue' | 'amber' | 'emerald' | 'rose' | 'slate'
  badge?: string
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  tone = 'blue',
  badge,
}: KPICardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__top">
        <span className="kpi-card__title">{title}</span>
        <div className="kpi-card__icon" aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className="kpi-card__body">
        <span className="kpi-card__value">{value}</span>
        {badge && <span className="kpi-card__badge">{badge}</span>}
      </div>
      {subtitle && <p className="kpi-card__subtitle">{subtitle}</p>}
    </article>
  )
}
