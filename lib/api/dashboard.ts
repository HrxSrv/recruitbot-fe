export interface DashboardMetrics {
  jobs_count: number
  applications_processed: number
  calls_made: number
  qualified_applications: number
}

export interface DashboardFunnel {
  high: number
  medium: number
  low: number
}

export interface DashboardResponse {
  date_range: {
    start_date: string
    end_date: string
  }
  metrics: DashboardMetrics
  funnel: DashboardFunnel
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem("auth_token")
  } catch (error) {
    console.error("Error accessing localStorage:", error)
    return null
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.exp < Math.floor(Date.now() / 1000)
  } catch {
    return true
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const authToken = getAuthToken()

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    })

    if (response.status === 401 && authToken) {
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
  if (!refreshToken) return false

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

export async function getDashboardAnalytics(
  startDate?: string,
  endDate?: string,
  qualifiedThreshold = 75,
): Promise<DashboardResponse> {
  try {
    const params = new URLSearchParams()
    if (startDate) params.append("start_date", startDate)
    if (endDate) params.append("end_date", endDate)
    params.append("qualified_threshold", qualifiedThreshold.toString())

    const url = `${API_BASE_URL}/analytics/dashboard?${params.toString()}`
    const response = await fetchWithAutoRefresh(url)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      throw new Error(`Failed to fetch dashboard analytics: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error)
    throw error
  }
}

export async function invalidateAnalyticsCache(): Promise<{ message: string }> {
  try {
    const url = `${API_BASE_URL}/analytics/cache/invalidate`
    const response = await fetchWithAutoRefresh(url, { method: "POST" })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      throw new Error(`Failed to invalidate cache: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error invalidating analytics cache:", error)
    throw error
  }
}
