import { baseUrl } from "@/lib/config"

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

export interface PreferredCallTimeResponse {
  status: string
  customer_id: string
  company_name: string
  preferred_call_time: string
  preferred_call_time_raw?: string
}

export interface PreferredCallTimeUpdate {
  preferred_call_time: string
}

class CustomerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CustomerError"
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

// Get preferred call time
export async function getPreferredCallTime(): Promise<PreferredCallTimeResponse> {
  const response = await fetchWithAutoRefresh(`${baseUrl}/customers/call/preferred-call-time`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new CustomerError(error.detail || "Failed to fetch preferred call time")
  }

  return response.json()
}

// Update preferred call time
export async function updatePreferredCallTime(callTime: string): Promise<{
  status: string
  message: string
  customer_id: string
  preferred_call_time: string
  updated_by: string
  updated_at: string
}> {
  const response = await fetchWithAutoRefresh(`${baseUrl}/customers/call/preferred-call-time`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      preferred_call_time: callTime,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new CustomerError(error.detail || "Failed to update preferred call time")
  }

  return response.json()
}