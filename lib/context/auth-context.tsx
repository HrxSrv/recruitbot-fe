"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { googleAuth, validateAuth, logout as apiLogout, hasAuthToken } from "@/lib/api/auth"
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
  isLoading: false,
  isAuthenticated: false,
  isCustomerValid: false,
  isSuperAdmin: false,
  loginWithGoogle: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true)
        console.log("[Auth Context] Starting auth check")

        // Check if we have a token in localStorage
        if (!hasAuthToken()) {
          console.log("[Auth Context] No auth token found in localStorage")
          setIsLoading(false)
          setAuthChecked(true)
          return
        }

        console.log("[Auth Context] Token found, validating with backend")
        const response = await validateAuth()
        console.log("[Auth Context] Auth validation successful")

        // Check if user is super admin
        const isSuperAdmin = response.user.email === "harshitsrv2004@gmail.com"

        let customerData = null
        if (!isSuperAdmin) {
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
        console.log("[Auth Context] User authenticated:", userData.email)
      } catch (error) {
        console.log("[Auth Context] Auth validation failed:", error)
        setUser(null)
        // Token is already cleared by validateAuth if invalid
      } finally {
        setIsLoading(false)
        setAuthChecked(true)
      }
    }

    checkAuth()
  }, [])

  const handleGoogleLogin = async (response: { credential: string }) => {
    try {
      setIsLoading(true)
      console.log("[Auth Context] Starting Google login")
      const authResponse = await googleAuth(response)
      console.log("[Auth Context] Google auth successful")

      // Check if user is super admin
      const isSuperAdmin = authResponse.user.email === "harshitsrv2004@gmail.com"

      let customerData = null
      let isValidCustomer = isSuperAdmin

      if (!isSuperAdmin) {
        try {
          customerData = await getCustomerByEmail(authResponse.user.email)
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
      console.log("[Auth Context] Login complete, redirecting")

      // Immediate redirect since we're using localStorage
      if (isValidCustomer) {
        window.location.href = "/dashboard"
      } else {
        window.location.href = "/buy-service"
      }
    } catch (error) {
      console.error("[Auth Context] Login failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      console.log("[Auth Context] Starting logout")
      await apiLogout()
      setUser(null)
      
      console.log("[Auth Context] Logout complete")
      window.location.href = "/"
    } catch (error) {
      console.error("[Auth Context] Logout failed:", error)
      setUser(null)
      window.location.href = "/"
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
