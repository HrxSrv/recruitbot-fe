import { baseUrl } from '@/lib/config'


export interface Customer {
  id: string
  company_name: string
  email: string
  subscription_plan: "free" | "starter" | "professional" | "enterprise"
  is_active: boolean
  website?: string
  industry?: string
  company_size?: string
  created_at: string
  updated_at?: string
}

export interface CustomerCreate {
  company_name: string
  email: string
  subscription_plan?: "free" | "starter" | "professional" | "enterprise"
  website?: string
  industry?: string
  company_size?: string
}

export interface CustomerUpdate {
  company_name?: string
  email?: string
  subscription_plan?: "free" | "starter" | "professional" | "enterprise"
  is_active?: boolean
  website?: string
  industry?: string
  company_size?: string
}
class CustomerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CustomerError"
  }
}

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
// Get all customers
export async function getCustomers(): Promise<Customer[]> {
  const response = await fetchWithAutoRefresh(`${baseUrl}/customers/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch customers")
  }

  return response.json()
}

// Get single customer
export async function getCustomer(customerId: string): Promise<Customer> {
  const response = await fetchWithAutoRefresh(`${baseUrl}/customers/${customerId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch customer")
  }

  return response.json()
}

// Create customer
export async function createCustomer(customerData: CustomerCreate): Promise<Customer> {
  const response = await fetchWithAutoRefresh(`${baseUrl}/customers/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(customerData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to create customer")
  }

  return response.json()
}

// Update customer
export async function updateCustomer(customerId: string, customerData: CustomerUpdate): Promise<Customer> {
  const response = await fetchWithAutoRefresh(`${baseUrl}/customers/${customerId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(customerData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to update customer")
  }

  return response.json()
}

// Delete customer
export async function deleteCustomer(customerId: string): Promise<void> {
  const response = await fetchWithAutoRefresh(`${baseUrl}/customers/${customerId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to delete customer")
  }
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  try {
    const res = await fetchWithAutoRefresh(`${baseUrl}/customers/by-email/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (res.status === 404) {
      return null // Customer not found
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new CustomerError(error.message || "Failed to fetch customer")
    }

    const customer = await res.json()
    return customer
  } catch (error) {
    if (error instanceof CustomerError) {
      throw error
    }
    console.error("Error fetching customer by email:", error)
    throw new CustomerError("Failed to validate customer")
  }
}