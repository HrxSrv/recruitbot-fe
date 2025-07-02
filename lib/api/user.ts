import { baseUrl } from "@/lib/config"

export interface UserProfile {
  id: string
  email: string
  name: string
  picture?: string
  role?: string
  customer_id?: string
}

export interface UserProfileResponse {
  id: string
  email: string
  name: string
  picture?: string
  role?: string
  customer_id?: string
}

class UserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UserError"
  }
}

/**
 * Get current user's profile information
 */
export async function getCurrentUserProfile(): Promise<UserProfile> {
  try {
    const token = localStorage.getItem("auth_token")

    if (!token) {
      throw new UserError("No auth token found")
    }

    console.log("[User API] Fetching user profile")
    const res = await fetch(`${baseUrl}/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    })

    if (!res.ok) {
      if (res.status === 401) {
        throw new UserError("Unauthorized - please login again")
      }
      const error = await res.json().catch(() => ({}))
      throw new UserError(error.message || "Failed to fetch user profile")
    }

    const data: UserProfileResponse = await res.json()
    console.log("[User API] User profile fetched successfully")

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      role: data.role,
      customer_id: data.customer_id,
    }
  } catch (error) {
    console.error("[User API] Failed to fetch user profile:", error)
    if (error instanceof UserError) {
      throw error
    }
    throw new UserError("Failed to fetch user profile")
  }
}
