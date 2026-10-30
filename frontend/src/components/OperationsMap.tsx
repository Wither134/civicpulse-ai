import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, ExternalLink, Layers, Wrench, Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Report, Hotspot } from '../types'
import { derivePriority, formatStatus, formatTimeAgo, isResolved, isInProgress, isUnderReview } from '../lib/format'
import { PriorityBadge } from './StatusBadge'

type OperationsMapProps = {
  reports: Report[]
  hotspots?: Hotspot[]
  selectedReport?: Report | null
  onSelectReport?: (report: Report) => void
}

/**
 * Creates custom styled HTML DivIcon markers for Leaflet.
 * Status and priority determine pin styling, glow, and color.
 */
function createCustomMarkerIcon(status: string, priority: string) {
  let colorClass = 'marker-pin--blue'
  if (isResolved(status)) {
    colorClass = 'marker-pin--emerald'
  } else if (isInProgress(status)) {
    colorClass = 'marker-pin--amber'
  } else if (isUnderReview(status)) {
    colorClass = 'marker-pin--purple'
  } else if (priority === 'Critical') {
    colorClass = 'marker-pin--rose'
  }

  const isPulsing = priority === 'Critical' || status === 'submitted'

  const html = `
    <div class="custom-leaflet-marker ${colorClass}">
      ${isPulsing ? '<div class="marker-pulse"></div>' : ''}
      <div class="marker-core">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      </div>
    </div>
  `

  return L.divIcon({
    className: 'custom-leaflet-container',
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

/**
 * Component to fit map bounds to valid report markers.
 */
function MapBoundsController({
  points,
  selectedReport,
}: {
  points: [number, number][]
  selectedReport?: Report | null
}) {
  const map = useMap()

  useEffect(() => {
    if (
      selectedReport?.latitude !== null &&
      selectedReport?.latitude !== undefined &&
      selectedReport?.longitude !== null &&
      selectedReport?.longitude !== undefined
    ) {
      map.flyTo([selectedReport.latitude, selectedReport.longitude], 15, {
        duration: 1.2,
      })
      return
    }

    if (points.length === 1) {
      map.setView(points[0], 14)
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }, [points, selectedReport, map])

  return null
}

export function OperationsMap({ reports, hotspots = [], selectedReport, onSelectReport }: OperationsMapProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'in_progress' | 'resolved'>('all')
  const [showHotspots, setShowHotspots] = useState(true)

  // Filter reports that have valid numerical coordinates
  const validReports = useMemo(() => {
    return reports.filter(
      (r) =>
        r.latitude !== null &&
        r.longitude !== null &&
        !isNaN(r.latitude) &&
        !isNaN(r.longitude) &&
        (statusFilter === 'all' ||
          (statusFilter === 'submitted' && r.status === 'submitted') ||
          (statusFilter === 'in_progress' && isInProgress(r.status)) ||
          (statusFilter === 'resolved' && isResolved(r.status)))
    )
  }, [reports, statusFilter])

  // Small coordinate jitter if multiple reports have exact duplicate coordinates so pins don't overlap completely
  const reportsWithPositions = useMemo(() => {
    const coordCount: Record<string, number> = {}
    return validReports.map((report) => {
      const key = `${report.latitude!.toFixed(5)},${report.longitude!.toFixed(5)}`
      const index = coordCount[key] || 0
      coordCount[key] = index + 1

      // Subtle radial jitter if duplicated at same spot
      let lat = report.latitude!
      let lng = report.longitude!
      if (index > 0) {
        const angle = index * (Math.PI / 3)
        const offset = 0.0003 * Math.sqrt(index)
        lat += Math.cos(angle) * offset
        lng += Math.sin(angle) * offset
      }

      return {
        report,
        position: [lat, lng] as [number, number],
        priority: derivePriority(report),
      }
    })
  }, [validReports])

  const markerPositions = useMemo(
    () => reportsWithPositions.map((r) => r.position),
    [reportsWithPositions]
  )

  const defaultCenter: [number, number] = markerPositions.length > 0 ? markerPositions[0] : [12.9716, 77.5946]
  const totalMappable = reports.filter(
    (r) => r.latitude !== null && r.longitude !== null && !isNaN(r.latitude) && !isNaN(r.longitude)
  ).length

  return (
    <div className="panel map-panel">
      <div className="map-panel__header">
        <div className="map-panel__title">
          <div className="map-panel__indicator">
            <Layers size={16} />
          </div>
          <div>
            <h3>Live Incident GIS Map</h3>
            <p className="map-panel__subtitle">
              Displaying {validReports.length} of {totalMappable} mapped coordinates
              {hotspots.length > 0 && ` • ${hotspots.length} DBSCAN Hotspot${hotspots.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="map-panel__controls">
          {hotspots.length > 0 && (
            <button
              type="button"
              className={`filter-pill filter-pill--hotspot ${showHotspots ? 'is-active' : ''}`}
              onClick={() => setShowHotspots((prev) => !prev)}
              title="Toggle DBSCAN spatial cluster density rings"
            >
              <Flame size={13} />
              <span>Hotspots ({hotspots.length})</span>
            </button>
          )}

          <div className="filter-pill-group">
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({totalMappable})
            </button>
            <button
              type="button"
              className={`filter-pill filter-pill--submitted ${statusFilter === 'submitted' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('submitted')}
            >
              Submitted
            </button>
            <button
              type="button"
              className={`filter-pill filter-pill--progress ${statusFilter === 'in_progress' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('in_progress')}
            >
              In Progress
            </button>
            <button
              type="button"
              className={`filter-pill filter-pill--resolved ${statusFilter === 'resolved' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('resolved')}
            >
              Resolved
            </button>
          </div>
        </div>
      </div>

      <div className="map-panel__canvas-wrap">
        {reportsWithPositions.length === 0 ? (
          <div className="map-panel__empty">
            <MapPin size={32} className="text-muted" />
            <p>No incidents with GPS coordinates match the active filter.</p>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={13}
            scrollWheelZoom={false}
            className="operations-leaflet-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapBoundsController points={markerPositions} selectedReport={selectedReport} />

            {/* DBSCAN Hotspot Density Rings */}
            {showHotspots &&
              hotspots.map((h) => (
                <Circle
                  key={`hotspot-${h.cluster_id}`}
                  center={[h.centroid_lat, h.centroid_lng]}
                  radius={Math.max(h.radius_meters, 80)}
                  pathOptions={{
                    color: '#ea580c',
                    fillColor: '#ea580c',
                    fillOpacity: 0.16,
                    weight: 2,
                    dashArray: '5, 5',
                  }}
                >
                  <Popup className="operations-map-popup" autoPanPadding={[30, 30]}>
                    <div className="popup-card">
                      <div className="popup-card__header">
                        <span className="mono popup-card__code">CLUSTER #{h.cluster_id + 1}</span>
                        <span className="hotspot-card__tag">
                          <Flame size={12} /> Hotspot
                        </span>
                      </div>
                      <h4 className="popup-card__title">{h.report_count} Incidents Concentrated</h4>
                      <p className="popup-card__desc">
                        DBSCAN spatial density cluster within ~{Math.round(h.radius_meters)}m radius.
                      </p>
                      <div className="popup-card__meta">
                        <div>
                          <strong>Primary Issues:</strong>{' '}
                          {Object.entries(h.category_breakdown)
                            .map(([cat, n]) => `${cat} (${n})`)
                            .join(', ') || h.dominant_category}
                        </div>
                        <div>
                          <strong>Center:</strong> {h.centroid_lat.toFixed(4)}, {h.centroid_lng.toFixed(4)}
                        </div>
                        <div>
                          <strong>Algorithm:</strong> Local DBSCAN (eps=650m)
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ))}

            {reportsWithPositions.map(({ report, position, priority }) => (
              <Marker
                key={report.id}
                position={position}
                icon={createCustomMarkerIcon(report.status, priority)}
                eventHandlers={{
                  click: () => onSelectReport?.(report),
                }}
              >
                <Popup className="operations-map-popup" autoPanPadding={[40, 40]}>
                  <div className="popup-card">
                    <div className="popup-card__header">
                      <span className="mono popup-card__code">{report.report_code}</span>
                      <PriorityBadge report={report} />
                    </div>

                    <h4 className="popup-card__title">{report.title}</h4>
                    <p className="popup-card__desc">{report.description}</p>

                    <div className="popup-card__meta">
                      <div>
                        <strong>Category:</strong> {report.category || 'Uncategorized'}
                      </div>
                      <div>
                        <strong>Status:</strong> {formatStatus(report.status)}
                      </div>
                      {report.location && (
                        <div>
                          <strong>Location:</strong> {report.location}
                        </div>
                      )}
                      <div>
                        <strong>Reported:</strong> {formatTimeAgo(report.created_at)}
                      </div>
                    </div>

                    <div className="popup-card__footer">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => onSelectReport?.(report)}
                      >
                        <Wrench size={12} />
                        <span>Dispatch & Triage</span>
                      </button>

                      <Link
                        to={`/track?code=${encodeURIComponent(report.report_code)}`}
                        className="popup-card__link"
                      >
                        Track <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        <div className="map-legend">
          <div className="map-legend__item">
            <span className="legend-dot legend-dot--blue" />
            <span>Submitted</span>
          </div>
          <div className="map-legend__item">
            <span className="legend-dot legend-dot--purple" />
            <span>Under Review</span>
          </div>
          <div className="map-legend__item">
            <span className="legend-dot legend-dot--amber" />
            <span>In Progress</span>
          </div>
          <div className="map-legend__item">
            <span className="legend-dot legend-dot--emerald" />
            <span>Resolved</span>
          </div>
          <div className="map-legend__item">
            <span className="legend-dot legend-dot--rose" />
            <span>Critical Hazard</span>
          </div>
          {hotspots.length > 0 && (
            <div className="map-legend__item">
              <span className="legend-dot legend-dot--hotspot" />
              <span>DBSCAN Hotspot</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
