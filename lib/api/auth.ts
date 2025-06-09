import { baseUrl } from '@/lib/config'

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
    this.name = 'AuthError'
  }
}

export async function googleAuth(response: GoogleResponse): Promise<AuthResponse> {
  try {
    const res = await fetch(`${baseUrl}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: response.credential,
      }),
      credentials: 'include', // Important for cookies
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new AuthError(error.message || 'Authentication failed')
    }

    const data = await res.json()
    if (!data.success || !data.user) {
      throw new AuthError('Invalid authentication response')
    }

    return data
  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }
    throw new AuthError('Authentication request failed')
  }
}

export async function logout(): Promise<void> {
  try {
    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new AuthError(error.message || 'Logout failed')
    }

    // Clear any client-side auth state
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }
    throw new AuthError('Logout request failed')
  }
}

export async function validateAuth(): Promise<ValidationResponse> {
  try {
    const res = await fetch(`${baseUrl}/auth/validate`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      // If unauthorized, we want to handle it gracefully
      if (res.status === 401) {
        throw new AuthError('Session expired')
      }
      const error = await res.json().catch(() => ({}))
      throw new AuthError(error.message || 'Session validation failed')
    }

    const data: ValidationResponse = await res.json()
    
    if (!data.success || !data.user) {
      throw new AuthError('Invalid validation response')
    }

    return data
  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }
    throw new AuthError('Validation request failed')
  }
}