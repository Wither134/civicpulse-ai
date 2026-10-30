import axios from 'axios'

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return `Cannot reach the API at ${API_BASE_URL}. Confirm the FastAPI server is running.`
    }
    if (error.response?.status) {
      return `Request failed (${error.response.status}).`
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
