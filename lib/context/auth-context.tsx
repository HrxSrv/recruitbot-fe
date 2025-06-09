"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { googleAuth, validateAuth, logout } from "@/lib/api/auth"
import { getCustomerByEmail } from "@/lib/api/customers"

interface User {
  id: string
  email: string
  name: string
  picture?: string
  customer?: {
    id: string
    company_name: string
    subscription_plan: string
    is_active: boolean
  }
  isSuperAdmin?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isCustomerValid: boolean
  isSuperAdmin: boolean
  loginWithGoogle: (response: { credential: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isCustomerValid: false,
  isSuperAdmin: false,
  loginWithGoogle: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        const response = await validateAuth()
        if (mounted) {
          // Check if user is super admin
          const isSuperAdmin = response.user.email === "harshitsrv2004@gmail.com"

          let customerData = null
          if (!isSuperAdmin) {
            // For regular users, validate customer
            try {
              customerData = await getCustomerByEmail(response.user.email)
            } catch (error) {
              console.error("Customer validation failed:", error)
            }
          }

          const userData: User = {
            ...response.user,
            customer: customerData
              ? {
                  id: customerData.id,
                  company_name: customerData.company_name,
                  subscription_plan: customerData.subscription_plan,
                  is_active: customerData.is_active,
                }
              : undefined,
            isSuperAdmin,
          }

          setUser(userData)
        }
      } catch (error) {
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
          setInitialized(true)
        }
      }
    }

    // Only check auth on initial load
    if (!initialized) {
      checkAuth()
    }

    return () => {
      mounted = false
    }
  }, [initialized]) // Only run when initialized changes

  const handleGoogleLogin = async (response: { credential: string }) => {
    try {
      setIsLoading(true)
      const authResponse = await googleAuth(response)

      // Check if user is super admin
      const isSuperAdmin = authResponse.user.email === "harshitsrv2004@gmail.com"

      let customerData = null
      let isValidCustomer = isSuperAdmin // Super admin is always valid

      if (!isSuperAdmin) {
        // For regular users, check if they have a customer record
        try {
          customerData = await getCustomerByEmail(authResponse.user.email)
          console.log("Customer data:", customerData)
          isValidCustomer = customerData !== null && customerData.is_active
        } catch (error) {
          console.error("Customer validation failed:", error)
          isValidCustomer = false
        }
      }

      const userData: User = {
        ...authResponse.user,
        customer: customerData
          ? {
              id: customerData.id,
              company_name: customerData.company_name,
              subscription_plan: customerData.subscription_plan,
              is_active: customerData.is_active,
            }
          : undefined,
        isSuperAdmin,
      }

      setUser(userData)

      // Redirect based on customer validation
      if (isValidCustomer) {
        window.location.replace("/dashboard")
      } else {
        window.location.replace("/buy-service")
      }
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
      // Clear all auth state
      setUser(null)
      setInitialized(false) // Allow re-initialization on next mount
      // Use Next.js router for client-side navigation
      window.location.replace("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      // Even if logout fails on server, clear client state
      setUser(null)
      setInitialized(false)
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
        isCustomerValid: !!user && (user.isSuperAdmin || (user.customer?.is_active ?? false)),
        isSuperAdmin: user?.isSuperAdmin ?? false,
        loginWithGoogle: handleGoogleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
