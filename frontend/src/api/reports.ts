import type { Report, ReportCreatePayload, ReportUpdatePayload, Hotspot } from '../types'
import { api } from './client'

export async function listReports(): Promise<Report[]> {
  const { data } = await api.get<Report[]>('/api/reports/')
  return data
}

export async function getReport(reportCode: string): Promise<Report> {
  const { data } = await api.get<Report>(`/api/reports/${encodeURIComponent(reportCode)}`)
  return data
}

export async function createReport(payload: ReportCreatePayload): Promise<Report> {
  const { data } = await api.post<Report>('/api/reports/', payload)
  return data
}

export async function updateReport(reportCode: string, payload: ReportUpdatePayload): Promise<Report> {
  const { data } = await api.patch<Report>(`/api/reports/${encodeURIComponent(reportCode)}/status`, payload)
  return data
}

export async function getHotspots(): Promise<Hotspot[]> {
  const { data } = await api.get<Hotspot[]>('/api/reports/hotspots')
  return data
}

export async function reanalyzeReport(reportCode: string): Promise<Report> {
  const { data } = await api.post<Report>(`/api/reports/${encodeURIComponent(reportCode)}/analyze`)
  return data
}

export async function unlinkDuplicate(reportCode: string): Promise<Report> {
  const { data } = await api.post<Report>(`/api/reports/${encodeURIComponent(reportCode)}/unlink-duplicate`)
  return data
}

export async function confirmDuplicate(reportCode: string, masterCode: string): Promise<Report> {
  const { data } = await api.post<Report>(
    `/api/reports/${encodeURIComponent(reportCode)}/confirm-duplicate?master_code=${encodeURIComponent(masterCode)}`
  )
  return data
}

export async function analyzeAllReports(): Promise<{ analyzed_count: number; message: string }> {
  const { data } = await api.post<{ analyzed_count: number; message: string }>('/api/reports/analyze-all')
  return data
}
