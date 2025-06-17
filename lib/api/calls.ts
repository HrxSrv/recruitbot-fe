import { baseUrl } from "@/lib/config"

// Call Types and Enums
export enum CallType {
  SCREENING = "screening",
  INTERVIEW = "interview",
  FOLLOW_UP = "follow_up",
}

export enum CallStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
  FAILED = "failed",
}

// API Request/Response Types
export interface ScheduleCallRequest {
  candidate_id: string
  job_id: string
  scheduled_time?: string
  call_type?: CallType
  notes?: string
}

export interface CallDetails {
  call_id: string
  scheduled_time: string
  call_type: CallType
  status: CallStatus
  vapi_call_id?: string
  vapi_assistant_id?: string
  call_duration?: number
  call_summary?: string
  call_transcript?: string
  call_recording_url?: string
  candidate_score?: number
  interviewer_notes?: string
  next_steps?: string
  scheduled_by: string
  rescheduled_count: number
  last_attempt?: string
  updated_at?: string
  analysis_timestamp?: string
  gemini_analysis?: GeminiAnalysis
}

export interface GeminiAnalysis {
  overall_assessment: {
    score: number
    recommendation: string
    confidence_level: string
  }
  key_strengths: string[]
  areas_of_concern: string[]
  technical_evaluation: {
    technical_score: number
    technical_summary: string
  }
  communication_evaluation: {
    communication_score: number
    communication_summary: string
  }
  cultural_fit: {
    cultural_fit_score: number
    cultural_fit_summary: string
  }
  question_responses: Array<{
    question: string
    response_quality: string
    score: number
    notes: string
  }>
  executive_summary: string
  next_steps: string
  interview_duration_assessment: string
  red_flags: string[]
}

export interface ScheduleCallResponse {
  status: string
  message: string
  call_details: {
    call_id: string
    candidate_name: string
    job_title: string
    scheduled_time: string
    call_type: CallType
    status: CallStatus
    scheduled_by: string
    vapi_assistant_id?: string
    assistant_status?: string
  }
  assistant_info?: {
    has_assistant: boolean
    assistant_id?: string
    message: string
  }
  next_steps: string[]
  pipeline_status: string
}

export interface CallListResponse {
  calls: Array<{
    call_id: string
    candidate: {
      id: string
      name: string
      email: string
    }
    job: {
      id: string
      title: string
    }
    scheduled_time: string
    call_type: CallType
    status: CallStatus
    call_duration?: number
    candidate_score?: number
    vapi_assistant_id?: string
    has_assistant: boolean
  }>
  total: number
  filters_applied: {
    candidate_id?: string
    job_id?: string
    status?: CallStatus
  }
}

export interface CallDetailsResponse {
  status: string
  call_details: CallDetails
  candidate: {
    id: string
    name: string
    email: string
    phone?: string
    location?: string
    resume_analysis: {
      overall_score: number
      skills: string[]
      experience_years: number
      education?: string
      previous_roles: string[]
      analysis_summary: string
      resume_file_path?: string
    }
    status: string
    total_applications: number
    uploaded_by: string
    upload_source: string
  }
  job: {
    id: string
    title: string
    description: string
    requirements: string[]
    location: string
    job_type: string
    experience_level?: string
    remote_allowed: boolean
    department?: string
    application_deadline?: string
    questions: Array<{
      question: string
      ideal_answer: string
      weight: number
    }>
    salary_range?: {
      min_salary?: number
      max_salary?: number
      currency: string
    }
    status: string
    view_count: number
    application_count: number
    created_at: string
    updated_at?: string
  }
  analysis_summary?: {
    overall_score: number
    recommendation: string
    confidence_level: string
    technical_score: number
    communication_score: number
    cultural_fit_score: number
    key_strengths_count: number
    areas_of_concern_count: number
    red_flags_count: number
    executive_summary: string
    interview_duration_assessment: string
  }
  performance_metrics: {
    call_completion_rate: number
    interview_quality_score: number
    duration_minutes: number
    transcript_length: number
    questions_asked: number
  }
  data_completeness: {
    has_transcript: boolean
    has_recording: boolean
    has_summary: boolean
    has_analysis: boolean
    has_score: boolean
  }
  timeline: {
    scheduled: string
    last_attempt?: string
    completed?: string
    analyzed?: string
  }
}

// Error Class
class CallsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CallsError"
  }
}

// Auth Helper Functions
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null

  try {
    const token = localStorage.getItem("auth_token")
    return token
  } catch (error) {
    console.error("Error accessing localStorage:", error)
    return null
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    const currentTime = Math.floor(Date.now() / 1000)
    return payload.exp < currentTime
  } catch (error) {
    console.error("Error parsing token:", error)
    return true
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const authToken = getAuthToken()

  try {
    const requestOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...options.headers,
      },
    }

    const response = await fetch(url, requestOptions)

    if (response.status === 401 && authToken) {
      console.warn("Token may be expired, clearing localStorage")
      localStorage.removeItem("auth_token")
      localStorage.removeItem("refresh_token")
    }

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    console.error("Fetch error:", error)
    throw error
  }
}

async function refreshTokenIfNeeded(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refresh_token")

  if (!refreshToken) {
    return false
  }

  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Refresh-Token": refreshToken,
      },
    })

    if (response.ok) {
      const data = await response.json()
      localStorage.setItem("auth_token", data.auth_token)
      return true
    } else {
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("auth_token")
      return false
    }
  } catch (error) {
    console.error("Error refreshing token:", error)
    return false
  }
}

async function fetchWithAutoRefresh(url: string, options: RequestInit = {}, timeout = 10000) {
  let response = await fetchWithAuth(url, options, timeout)

  if (response.status === 401) {
    const refreshed = await refreshTokenIfNeeded()
    if (refreshed) {
      response = await fetchWithAuth(url, options, timeout)
    }
  }

  return response
}

// API Functions
export async function scheduleCall(request: ScheduleCallRequest): Promise<ScheduleCallResponse> {
  const searchParams = new URLSearchParams({
    candidate_id: request.candidate_id,
    job_id: request.job_id,
  })

  if (request.scheduled_time) {
    searchParams.set("scheduled_time", request.scheduled_time)
  }
  if (request.call_type) {
    searchParams.set("call_type", request.call_type)
  }
  if (request.notes) {
    searchParams.set("notes", request.notes)
  }

  const finalUrl = `${baseUrl}/calls/schedule?${searchParams.toString()}`

  const response = await fetchWithAutoRefresh(finalUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    const errorText = await response.text()
    let error
    try {
      error = JSON.parse(errorText)
    } catch {
      error = { detail: errorText || "Failed to schedule call" }
    }

    throw new CallsError(error.detail || "Failed to schedule call")
  }

  return response.json()
}

export async function getCalls(
  params: {
    candidate_id?: string
    job_id?: string
    status?: CallStatus
    skip?: number
    limit?: number
  } = {},
): Promise<CallListResponse> {
  const searchParams = new URLSearchParams()
  if (params.candidate_id) searchParams.set("candidate_id", params.candidate_id)
  if (params.job_id) searchParams.set("job_id", params.job_id)
  if (params.status) searchParams.set("status", params.status)
  if (params.skip !== undefined) searchParams.set("skip", params.skip.toString())
  if (params.limit !== undefined) searchParams.set("limit", params.limit.toString())

  const queryString = searchParams.toString()
  const endpoint = queryString ? `?${queryString}` : ""

  const response = await fetchWithAutoRefresh(`${baseUrl}/calls${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new CallsError(error.detail || "Failed to fetch calls")
  }

  return response.json()
}

export async function getCallDetails(callId: string): Promise<CallDetailsResponse> {
  const response = await fetchWithAutoRefresh(`${baseUrl}/calls/${callId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new CallsError("Call not found")
    }
    if (response.status === 403) {
      throw new CallsError("Access denied")
    }
    const error = await response.json().catch(() => ({}))
    throw new CallsError(error.detail || "Failed to fetch call details")
  }

  return response.json()
}

export async function updateCallStatus(callId: string, status: CallStatus, notes?: string): Promise<any> {
  const body = new URLSearchParams()
  body.set("status", status)
  if (notes) body.set("notes", notes)

  const response = await fetchWithAutoRefresh(`${baseUrl}/calls/${callId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    credentials: "include",
    body: body.toString(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new CallsError(error.detail || "Failed to update call status")
  }

  return response.json()
}
