"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { googleAuth, validateAuth, logout } from "@/lib/api/auth"

interface User {
  id: string
  email: string
  name: string
  picture?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  loginWithGoogle: (response: { credential: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  loginWithGoogle: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await validateAuth()
        setUser(response.user)
      } catch (error) {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleGoogleLogin = async (response: { credential: string }) => {
    try {
      setIsLoading(true)
      const authResponse = await googleAuth(response)
      setUser(authResponse.user)
      
      // Redirect to dashboard after successful login
      window.location.replace("/dashboard")
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await logout()
      setUser(null)
      window.location.replace("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      // Clear client state even if server logout fails
      setUser(null)
      window.location.replace("/login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithGoogle: handleGoogleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

// Route protection hook
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.replace("/login")
    }
  }, [isAuthenticated, isLoading])

  return { isAuthenticated, isLoading }
}