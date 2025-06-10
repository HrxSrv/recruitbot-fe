import { baseUrl } from "@/lib/config"

export interface GoogleResponse {
  credential: string
}

export interface AuthResponse {
  success: boolean
  token: string
  user: {
    id: string
    email: string
    name: string
    picture?: string
    created_at?: string
  }
}

export interface ValidationResponse {
  success: boolean
  user: {
    id: string
    email: string
    name: string
    picture?: string
    created_at?: string
  }
  message?: string
}

class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

/**
 * Store auth token in localStorage (reliable across all environments)
 */
function setAuthToken(token: string) {
  localStorage.setItem("auth_token", token)
  console.log("[Auth API] Token stored in localStorage")
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth_token")
}

/**
 * Clear auth token from localStorage
 */
function clearAuthToken() {
  localStorage.removeItem("auth_token")
  console.log("[Auth API] Token cleared from localStorage")
}

/**
 * Authenticate with Google OAuth
 */
export async function googleAuth(response: GoogleResponse): Promise<AuthResponse> {
  try {
    console.log("[Auth API] Sending Google auth request")
    const res = await fetch(`${baseUrl}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credential: response.credential,
      }),
      credentials: "include", // Still send cookies for backend session
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new AuthError(error.message || "Authentication failed")
    }

    const data = await res.json()
    if (!data.success || !data.user) {
      throw new AuthError("Invalid authentication response")
    }

    console.log("[Auth API] Auth response received:", data.success ? "Success" : "Failed")

    // Store token in localStorage for reliable client-side access
    if (data.token) {
      setAuthToken(data.token)
    }

    return data
  } catch (error) {
    console.error("[Auth API] Auth request failed:", error)
    if (error instanceof AuthError) {
      throw error
    }
    throw new AuthError("Authentication request failed")
  }
}

/**
 * Log out the current user
 */
export async function logout(): Promise<void> {
  try {
    const token = getAuthToken()

    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new AuthError(error.message || "Logout failed")
    }

    // Clear localStorage token
    clearAuthToken()

    // Also clear any cookies
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure"
  } catch (error) {
    // Always clear local storage even if logout fails
    clearAuthToken()
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure"

    if (error instanceof AuthError) {
      throw error
    }
    throw new AuthError("Logout request failed")
  }
}

/**
 * Validate the current authentication session using localStorage token
 */
export async function validateAuth(): Promise<ValidationResponse> {
  try {
    const token = getAuthToken()

    if (!token) {
      throw new AuthError("No auth token found")
    }

    console.log("[Auth API] Sending validation request with token")
    const res = await fetch(`${baseUrl}/auth/validate`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    console.log("[Auth API] Validation response status:", res.status)

    if (!res.ok) {
      if (res.status === 401) {
        // Token is invalid, clear it
        clearAuthToken()
        throw new AuthError("Session expired")
      }
      const error = await res.json().catch(() => ({}))
      throw new AuthError(error.message || "Session validation failed")
    }

    const data: ValidationResponse = await res.json()
    console.log("[Auth API] Validation data:", data.success ? "Success" : "Failed")

    if (!data.success || !data.user) {
      clearAuthToken()
      throw new AuthError("Invalid validation response")
    }

    return data
  } catch (error) {
    console.error("[Auth API] Validation failed:", error)
    if (error instanceof AuthError) {
      throw error
    }
    throw new AuthError("Validation request failed")
  }
}

/**
 * Check if the user has an auth token (client-side only)
 */
export function hasAuthToken(): boolean {
  return !!getAuthToken()
}

/**
 * Get auth token for external use
 */
export { getAuthToken }
