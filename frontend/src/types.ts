export type AIAnalysis = {
  predicted_category: string
  category_confidence: number
  category_method: string
  is_category_agreement: boolean
  priority_level: 'Critical' | 'High' | 'Medium' | 'Low'
  priority_score: number
  urgency: number
  impact: number
  recurrence: number
  frequency: number
  formula: string
  explanation: string
  factor_reasons: string[]
  extractive_summary: string
  recommended_actions: string[]
  is_duplicate: boolean
  duplicate_of_id?: number | null
  duplicate_of_code?: string | null
  duplicate_similarity: number
  duplicate_distance_meters?: number | null
  duplicate_rationale: string
}

export type Hotspot = {
  cluster_id: number
  centroid_lat: number
  centroid_lng: number
  radius_meters: number
  report_count: number
  dominant_category: string
  category_breakdown: Record<string, number>
  report_codes: string[]
  report_ids: number[]
  highest_priority: string
  description: string
}

export type Report = {
  id: number
  report_code: string
  title: string
  description: string
  category: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  priority: string | null
  urgency: number | null
  impact: number | null
  ai_summary: string | null
  ai_explanation: string | null
  duplicate_of: number | null
  status: string
  assigned_department: string | null
  resolution_note: string | null
  created_at: string
  updated_at: string
  ai_analysis?: AIAnalysis | null
}

export type ReportCreatePayload = {
  title: string
  description: string
  category?: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type ReportUpdatePayload = {
  status?: string | null
  assigned_department?: string | null
  resolution_note?: string | null
  priority?: string | null
  category?: string | null
}

export const COMPLAINT_CATEGORIES = [
  'Roads & potholes',
  'Street lighting',
  'Water supply',
  'Drainage & flooding',
  'Waste collection',
  'Parks & public spaces',
  'Noise',
  'Other',
] as const

export const MUNICIPAL_DEPARTMENTS = [
  'Roads & Infrastructure',
  'Water Supply & Drainage',
  'Electrical & Street Lighting',
  'Solid Waste Management & Sanitation',
  'Parks & Public Spaces',
  'Public Health & Safety',
  'Traffic & Urban Mobility',
  'General Administration',
] as const

export const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted', description: 'Newly logged; pending operational triage' },
  { value: 'under_review', label: 'Under Review', description: 'Assessed by dispatcher; evaluating crew assignment' },
  { value: 'in_progress', label: 'In Progress', description: 'Assigned to department crew; fieldwork underway' },
  { value: 'resolved', label: 'Resolved', description: 'Work complete, inspected, or closed with notes' },
] as const
