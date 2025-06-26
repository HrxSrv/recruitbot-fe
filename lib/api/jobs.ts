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
  language: string
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
  language: string
}

export interface JobFilters {
  skip?: number
  limit?: number
  status_filter?: "draft" | "active" | "paused" | "closed"
  job_type_filter?: "full_time" | "part_time" | "contract" | "internship"
  location_filter?: string
  search?: string
  sort_by?: "newest" | "oldest" | "title_asc" | "title_desc" | "status" | "applications"
}

export interface PaginatedJobsResponse {
  jobs: Job[]
  total: number
  page: number
  page_size: number
  total_pages: number
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
    const payload = JSON.parse(atob(token.split(".")[1]))
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

// Updated getJobs function with enhanced pagination support
export async function getJobs(filters: JobFilters = {}): Promise<Job[]> {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams()

    // Add pagination parameters with defaults
    queryParams.append("skip", (filters.skip || 0).toString())
    queryParams.append("limit", (filters.limit || 20).toString())

    // Add optional filters if provided
    if (filters.status_filter) {
      queryParams.append("status_filter", filters.status_filter)
    }

    if (filters.job_type_filter) {
      queryParams.append("job_type_filter", filters.job_type_filter)
    }

    if (filters.location_filter) {
      queryParams.append("location_filter", filters.location_filter)
    }

    if (filters.search) {
      queryParams.append("search", filters.search)
    }

    if (filters.sort_by) {
      queryParams.append("sort_by", filters.sort_by)
    }

    const url = `${API_BASE_URL}/jobs/?${queryParams.toString()}`
    const response = await fetchWithAutoRefresh(url)

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

// Enhanced paginated jobs function with better response handling
export async function getJobsPaginated(
  page = 1,
  pageSize = 20,
  filters: Omit<JobFilters, "skip" | "limit"> = {},
): Promise<Job[]> {
  try {
    const skip = (page - 1) * pageSize

    // Build query parameters
    const queryParams = new URLSearchParams()
    queryParams.append("skip", skip.toString())
    queryParams.append("limit", pageSize.toString())

    // Add optional filters if provided
    if (filters.status_filter) {
      queryParams.append("status_filter", filters.status_filter)
    }

    if (filters.job_type_filter) {
      queryParams.append("job_type_filter", filters.job_type_filter)
    }

    if (filters.location_filter) {
      queryParams.append("location_filter", filters.location_filter)
    }

    if (filters.search) {
      queryParams.append("search", filters.search)
    }

    if (filters.sort_by) {
      queryParams.append("sort_by", filters.sort_by)
    }

    const url = `${API_BASE_URL}/jobs/?${queryParams.toString()}`
    const response = await fetchWithAutoRefresh(url)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      throw new Error(`Failed to fetch jobs: ${response.statusText}`)
    }

    const data = await response.json()

    // Handle both array response (current) and paginated response (future)
    if (Array.isArray(data)) {
      return data
    } else if (data.jobs && Array.isArray(data.jobs)) {
      return data.jobs
    } else {
      throw new Error("Invalid response format")
    }
  } catch (error) {
    console.error("Error fetching paginated jobs:", error)
    throw error
  }
}

// New function to get jobs with full pagination metadata
export async function getJobsWithPagination(
  page = 1,
  pageSize = 20,
  filters: Omit<JobFilters, "skip" | "limit"> = {},
): Promise<PaginatedJobsResponse> {
  try {
    const skip = (page - 1) * pageSize

    // Build query parameters
    const queryParams = new URLSearchParams()
    queryParams.append("skip", skip.toString())
    queryParams.append("limit", pageSize.toString())
    queryParams.append("include_pagination", "true") // Request pagination metadata

    // Add optional filters if provided
    if (filters.status_filter) {
      queryParams.append("status_filter", filters.status_filter)
    }

    if (filters.job_type_filter) {
      queryParams.append("job_type_filter", filters.job_type_filter)
    }

    if (filters.location_filter) {
      queryParams.append("location_filter", filters.location_filter)
    }

    if (filters.search) {
      queryParams.append("search", filters.search)
    }

    if (filters.sort_by) {
      queryParams.append("sort_by", filters.sort_by)
    }

    const url = `${API_BASE_URL}/jobs/?${queryParams.toString()}`
    const response = await fetchWithAutoRefresh(url)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      throw new Error(`Failed to fetch jobs: ${response.statusText}`)
    }

    const data = await response.json()

    // Handle paginated response format
    if (data.jobs && Array.isArray(data.jobs)) {
      return {
        jobs: data.jobs,
        total: data.total || data.jobs.length,
        page: data.page || page,
        page_size: data.page_size || pageSize,
        total_pages: data.total_pages || Math.ceil((data.total || data.jobs.length) / pageSize),
      }
    } else if (Array.isArray(data)) {
      // Fallback for current API format
      return {
        jobs: data,
        total: data.length,
        page: page,
        page_size: pageSize,
        total_pages: Math.ceil(data.length / pageSize),
      }
    } else {
      throw new Error("Invalid response format")
    }
  } catch (error) {
    console.error("Error fetching jobs with pagination:", error)
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

export interface JobNameResponse {
  job_id: string
  job_name: string // This matches your backend response
}

// 2. Fix the getJobName function with proper typing
export async function getJobName(id: string): Promise<JobNameResponse> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/jobs/${id}/name`)

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
      headers: {
        "Content-Type": "application/json",
      },
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
      headers: {
        "Content-Type": "application/json",
      },
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

export async function pauseJob(id: string): Promise<void> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/jobs/${id}/pause`, {
      method: "POST",
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to pause job: ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error pausing job:", error)
    throw error
  }
}

export async function resumeJob(id: string): Promise<void> {
  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/jobs/${id}/resume`, {
      method: "POST",
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to resume job: ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error pausing job:", error)
    throw error
  }
}
