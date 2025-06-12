import { baseUrl } from '@/lib/config'

export enum CallType {
  SCREENING = "screening",
  TECHNICAL = "technical",
  FINAL = "final",
}

export enum CallStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

export interface ScheduleCallRequest {
  candidate_id: string
  job_id: string
  scheduled_time?: string // ISO string
  call_type?: CallType
  notes?: string
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
  }
  next_steps: string[]
  pipeline_status: string
}

class CallsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CallsError"
  }
}

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
    const payload = JSON.parse(atob(token.split('.')[1]))
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

  console.log("=== API Request Debug ===")
  console.log("URL:", url)
  console.log("Auth token found:", !!authToken)
  
  if (authToken) {
    console.log("Auth token value:", `${authToken.substring(0, 10)}...`)
    console.log("Token expired:", isTokenExpired(authToken))
  }

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

    console.log("Request headers:", requestOptions.headers)

    const response = await fetch(url, requestOptions)

    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))

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
    console.log("No refresh token available")
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
      console.log("Token refreshed successfully")
      return true
    } else {
      console.warn("Token refresh failed")
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

export async function scheduleCall(request: ScheduleCallRequest): Promise<ScheduleCallResponse> {
  // Build URL with query parameters like your curl command
  const searchParams = new URLSearchParams({
    candidate_id: request.candidate_id,
    job_id: request.job_id,
  })
  
  // Prepare JSON body (excluding candidate_id and job_id since they're in URL)
  const requestBody: any = {}
  if (request.scheduled_time) requestBody.scheduled_time = request.scheduled_time
  if (request.call_type) requestBody.call_type = request.call_type
  if (request.notes) requestBody.notes = request.notes

  const response = await fetchWithAutoRefresh(`${baseUrl}/calls/schedule?${searchParams.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", // Changed from form data to JSON
    },
    credentials: "include",
    body: JSON.stringify(requestBody), // Send as JSON, not form data
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
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
): Promise<any> {
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