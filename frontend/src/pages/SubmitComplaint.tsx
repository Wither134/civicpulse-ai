import { useState, type FormEvent } from 'react'
import { Check, Copy, Navigation, ExternalLink, AlertCircle, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createReport } from '../api/reports'
import { getErrorMessage } from '../api/client'
import { COMPLAINT_CATEGORIES } from '../types'

const emptyForm = {
  title: '',
  description: '',
  category: '',
  location: '',
  latitude: '',
  longitude: '',
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function SubmitComplaint() {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [locating, setLocating] = useState(false)

  function updateField(name: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleLocateMe() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(5),
          longitude: pos.coords.longitude.toFixed(5),
        }))
        setLocating(false)
      },
      (err) => {
        setError(`Could not fetch location: ${err.message}`)
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setTrackingCode(null)
    setCopied(false)

    if (form.latitude.trim() && parseOptionalNumber(form.latitude) === null) {
      setError('Latitude must be a valid number.')
      return
    }
    if (form.longitude.trim() && parseOptionalNumber(form.longitude) === null) {
      setError('Longitude must be a valid number.')
      return
    }

    setSubmitting(true)
    try {
      const created = await createReport({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category || null,
        location: form.location.trim() || null,
        latitude: parseOptionalNumber(form.latitude),
        longitude: parseOptionalNumber(form.longitude),
      })
      setTrackingCode(created.report_code)
      setForm(emptyForm)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function copyCode() {
    if (!trackingCode) return
    await navigator.clipboard.writeText(trackingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="narrow submit-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Public Incident Ingestion</p>
          <h1>Submit a Civic Issue</h1>
          <p className="lede">
            Report road hazards, sanitation problems, water leaks, or infrastructure issues. All submissions are assigned a verifiable tracking code and entered into the municipal operations register.
          </p>
        </div>
      </div>

      {trackingCode ? (
        <div className="banner banner--success" role="status">
          <div className="banner__content">
            <strong>Complaint Logged Successfully</strong>
            <p>
              Your public tracking code is:{' '}
              <span className="mono tracking-code">{trackingCode}</span>
            </p>
            <div className="banner__actions">
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => void copyCode()}>
                {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>{copied ? 'Code Copied' : 'Copy Tracking Code'}</span>
              </button>
              <Link to={`/track?code=${encodeURIComponent(trackingCode)}`} className="btn btn--primary btn--sm">
                <span>Track This Incident</span>
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="banner banner--error" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Could not submit report</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      <form className="panel form" onSubmit={handleSubmit}>
        <div className="form__group">
          <label htmlFor="title-input">
            Incident Title <span className="text-danger">*</span>
          </label>
          <input
            id="title-input"
            required
            maxLength={200}
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="e.g. Severe waterlogging near 5th Cross Road"
            className="input-field"
          />
        </div>

        <div className="form__group">
          <label htmlFor="desc-input">
            Detailed Description <span className="text-danger">*</span>
          </label>
          <textarea
            id="desc-input"
            required
            rows={4}
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Describe what you observed, physical landmarks, any public safety hazards, and how long it has been occurring."
            className="input-field"
          />
        </div>

        <div className="form__row form__row--split">
          <div className="form__group">
            <label htmlFor="category-select">Category</label>
            <select
              id="category-select"
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
              className="select-field"
            >
              <option value="">Select a category</option>
              {COMPLAINT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form__group">
            <label htmlFor="location-input">Location / Landmark / Ward</label>
            <input
              id="location-input"
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="e.g. Indiranagar, 100ft Road"
              className="input-field"
            />
          </div>
        </div>

        <div className="form__geo-section">
          <div className="geo-header">
            <div>
              <span className="geo-header__title">Geographic Coordinates (Optional)</span>
              <p className="geo-header__sub">Enables the issue to appear on the Operations GIS Map</p>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleLocateMe}
              disabled={locating}
            >
              <Navigation size={14} className={locating ? 'animate-spin' : ''} />
              <span>{locating ? 'Detecting…' : 'Use Current GPS'}</span>
            </button>
          </div>

          <div className="form__row">
            <div className="form__group">
              <label htmlFor="lat-input">Latitude</label>
              <input
                id="lat-input"
                inputMode="decimal"
                value={form.latitude}
                onChange={(event) => updateField('latitude', event.target.value)}
                placeholder="12.9716"
                className="input-field mono"
              />
            </div>
            <div className="form__group">
              <label htmlFor="lng-input">Longitude</label>
              <input
                id="lng-input"
                inputMode="decimal"
                value={form.longitude}
                onChange={(event) => updateField('longitude', event.target.value)}
                placeholder="77.5946"
                className="input-field mono"
              />
            </div>
          </div>
        </div>

        <div className="form__footer">
          <button className="btn btn--primary" type="submit" disabled={submitting}>
            <Send size={16} />
            <span>{submitting ? 'Submitting to Register…' : 'Submit Incident Report'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
