export interface SalaryRange {
  min_salary?: number | null
  max_salary?: number | null
  currency: string
}

export interface JobQuestion {
  question: string
  ideal_answer: string
  weight: number
}

export interface Job {
  id: string
  customer_id: string
  created_by: string
  title: string
  description: string
  requirements: string[]
  location: string
  questions: JobQuestion[]
  salary_range?: SalaryRange | null
  job_type: "full_time" | "part_time" | "contract" | "internship"
  status: "draft" | "active" | "paused" | "closed"
  department?: string | null
  experience_level?: string | null
  remote_allowed: boolean
  application_deadline?: string | null
  view_count: number
  application_count: number
  created_at: string
  updated_at?: string | null
}

export interface CreateJobData {
  title: string
  description: string
  requirements: string[]
  location: string
  questions: JobQuestion[]
  salary_range?: SalaryRange | null
  job_type: "full_time" | "part_time" | "contract" | "internship"
  status: "draft" | "active" | "paused" | "closed"
  department?: string | null
  experience_level?: string | null
  remote_allowed: boolean
  application_deadline?: string | null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// Get auth token from cookies
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null // SSR check
  
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
// Helper function for API requests with explicit cookie handling
async function fetchWithAuth(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Get auth token from localStorage
  const authToken = getAuthToken()

  // Debug logging
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
        // Set Authorization header with Bearer token
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...options.headers,
      },
    }

    console.log("Request headers:", requestOptions.headers)

    const response = await fetch(url, requestOptions)

    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))

    // Handle token expiration
    if (response.status === 401 && authToken) {
      console.warn("Token may be expired, clearing localStorage")
      localStorage.removeItem("auth_token")
      // Optionally clear refresh token if you have one
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
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
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
      // Clear invalid refresh token
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("auth_token")
      return false
    }
  } catch (error) {
    console.error("Error refreshing token:", error)
    return false
  }
}

// Enhanced fetch with automatic token refresh
async function fetchWithAutoRefresh(url: string, options: RequestInit = {}, timeout = 10000) {
  let response = await fetchWithAuth(url, options, timeout)
  
  // If unauthorized and we have a refresh token, try to refresh
  if (response.status === 401) {
    const refreshed = await refreshTokenIfNeeded()
    if (refreshed) {
      // Retry the original request with new token
      response = await fetchWithAuth(url, options, timeout)
    }
  }
  
  return response
}
export async function getJobs(): Promise<Job[]> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/jobs/`)
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      throw new Error(`Failed to fetch jobs: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching jobs:", error)
    throw error
  }
}

export async function getJob(id: string): Promise<Job> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/jobs/${id}`)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      if (response.status === 404) {
        throw new Error("Job not found.")
      }
      throw new Error(`Failed to fetch job: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching job:", error)
    throw error
  }
}

export async function createJob(jobData: CreateJobData): Promise<Job> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/jobs/`, {
      method: "POST",
      body: JSON.stringify(jobData),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to create job: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error creating job:", error)
    throw error
  }
}

export async function updateJob(id: string, jobData: Partial<CreateJobData>): Promise<Job> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(jobData),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to update job: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error updating job:", error)
    throw error
  }
}

export async function deleteJob(id: string): Promise<void> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/jobs/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to delete job: ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error deleting job:", error)
    throw error
  }
}
export async function publishJob(id: string): Promise<void> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/jobs/${id}/publish`, {
      method: "POST",
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to publish job: ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error publishing job:", error)
    throw error
  }
}