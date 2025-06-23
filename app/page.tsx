"use client"

import { Suspense } from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/context/auth-context"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          cancel: () => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "your-google-client-id"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, isLoading: authLoading, loginWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [loginStep, setLoginStep] = useState<string>("")
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)
  const initializationAttempted = useRef(false)
  const redirectHandled = useRef(false)

  // Handle redirect for authenticated users - only once
  useEffect(() => {
    if (!authLoading && isAuthenticated && !redirectHandled.current) {
      redirectHandled.current = true
      const from = searchParams.get("from")
      const redirectTo = from && from !== "/" ? from : "/dashboard"

      // Use replace to avoid adding to history
      window.location.replace(redirectTo)
    }
  }, [isAuthenticated, authLoading, searchParams])

  // Load Google script only if not authenticated
  useEffect(() => {
    if (scriptLoaded.current || isAuthenticated || authLoading) return

    const loadGoogleScript = () => {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = () => {
        console.log("Google script loaded successfully")
        setGoogleLoaded(true)
        // Add a small delay to ensure Google SDK is fully initialized
        setTimeout(() => {
          initializeGoogle()
        }, 100)
      }
      script.onerror = (error) => {
        console.error("Failed to load Google Sign-In script:", error)
        setError("Failed to load Google Sign-In. Please refresh the page.")
      }
      document.head.appendChild(script)
      scriptLoaded.current = true
    }

    loadGoogleScript()

    return () => {
      // Cleanup
      if (window.google && !isAuthenticated) {
        try {
          window.google.accounts.id.cancel()
          window.google.accounts.id.disableAutoSelect()
        } catch (error) {
          console.error("Google cleanup failed:", error)
        }
      }
    }
  }, [isAuthenticated, authLoading])

  const initializeGoogle = () => {
    if (!window.google || !GOOGLE_CLIENT_ID || isAuthenticated || initializationAttempted.current) {
      return
    }

    initializationAttempted.current = true

    try {
      console.log("Initializing Google Sign-In...")

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: true,
        ux_mode: "popup",
        context: "signin",
        itp_support: true,
      })

      // Render Google's official button if element exists
      if (googleButtonRef.current) {
        try {
          // Clear any existing content
          googleButtonRef.current.innerHTML = ""

          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: theme === "dark" ? "filled_black" : "outline",
            size: "large",
            // width: "100%",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            locale: "en",
          })
          console.log("Google button rendered successfully")
        } catch (renderError) {
          console.error("Failed to render Google button:", renderError)
          setError("Failed to render Google Sign-In button")
        }
      }

      console.log("Google Sign-In initialized successfully")
    } catch (initError) {
      console.error("Google initialization failed:", initError)
      setError("Failed to initialize Google Sign-In")
    }
  }

  // Re-render Google button when theme changes
  useEffect(() => {
    if (googleLoaded && googleButtonRef.current && window.google && !isLoading) {
      try {
        // Clear existing button
        googleButtonRef.current.innerHTML = ""

        // Re-render with new theme
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          // width: "100%",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          locale: "en",
        })
      } catch (error) {
        console.error("Failed to re-render Google button:", error)
      }
    }
  }, [theme, googleLoaded, isLoading])

  const handleGoogleCallback = async (response: { credential: string }) => {
    if (isLoading) return // Prevent multiple simultaneous calls

    console.log("Google callback received")
    setIsLoading(true)
    setError(null)
    setLoginStep("Authenticating with Google...")

    try {
      await loginWithGoogle(response)
      console.log("Login process completed")
    } catch (error) {
      console.error("Login failed:", error)
      setError(error instanceof Error ? error.message : "Login failed. Please try again.")
      setLoginStep("")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render login form if user is authenticated - show redirecting message
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
      <div className="flex min-h-screen">
        {/* Left Side - Authentication */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm  p-1 shadow-lg border border-white/20 dark:bg-white mb-4 overflow-hidden">
                <Image src="/eva.png" alt="Eva Logo" width={32} height={32} className="object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">TalentHub</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Streamline your recruitment process with intelligent candidate management
              </p>
            </div>

            {/* Auth Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                  Sign in to continue
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Access your recruitment dashboard
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Loading Step Indicator */}
                {isLoading && loginStep && (
                  <div className="flex items-center justify-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin mr-3 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{loginStep}</span>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Google Sign-in Button Container */}
                <div className="flex justify-center">
                  <div className="w-full max-w-sm">
                    {googleLoaded && !error && !isLoading ? (
                      <div
                        ref={googleButtonRef}
                        className="flex justify-center [&>div]:!w-full [&>div]:!max-w-none [&>div]:!justify-center"
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      />
                    ) : !error ? (
                      <div className="flex items-center justify-center p-4 h-12 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400 mr-3"></div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">Loading Google Sign-In...</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center w-full leading-relaxed">
                  By signing in, you agree to our{" "}
                  <a
                    href="/terms"
                    className="underline underline-offset-4 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    className="underline underline-offset-4 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </CardFooter>
            </Card>

            {/* Debug info - only in development */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-6 text-xs text-slate-400 text-center space-y-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p>
                  Google: {googleLoaded ? "✅" : "❌"} | Client ID: {GOOGLE_CLIENT_ID ? "✅" : "❌"}
                </p>
                <p>
                  Auth: {authLoading ? "⏳" : "✅"} | Authenticated: {isAuthenticated ? "✅" : "❌"}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Side - Abstract Visual */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative w-full h-full max-w-lg"
          >
            {/* Abstract Geometric Shapes */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Main Circle */}
              <div className="w-80 h-80 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 opacity-20 absolute animate-pulse"></div>

              {/* Floating Elements */}
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 opacity-30 absolute -top-16 -left-16 rotate-12 animate-float"></div>

              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-600 opacity-25 absolute top-20 right-12 animate-float-delayed"></div>

              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 opacity-20 absolute bottom-24 left-20 rotate-45 animate-float"></div>

              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 opacity-15 absolute -bottom-10 -right-10 -rotate-12 animate-float-delayed"></div>

              {/* Grid Pattern */}
              <div className="absolute inset-0 opacity-5 dark:opacity-10">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `
                    linear-gradient(to right, currentColor 1px, transparent 1px),
                    linear-gradient(to bottom, currentColor 1px, transparent 1px)
                  `,
                    backgroundSize: "40px 40px",
                  }}
                ></div>
              </div>

              {/* Central Focus Element */}
              <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <div className="w-24 h-24 rounded-2xl bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-lg border border-white/20 dark:from-white dark:to-slate-200 flex items-center justify-center overflow-hidden">
                  <Image src="/eva.png" alt="Eva Logo" width={48} height={48} className="object-contain" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
  }
  @keyframes float-delayed {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(-3deg); }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  .animate-float-delayed {
    animation: float-delayed 8s ease-in-out infinite;
    animation-delay: 2s;
  }
  
  /* Google Button Consistency - ADD HERE */
  div[data-testid="google-signin-button"],
  div[role="button"][data-client-id] {
    width: 100% !important;
    min-width: 240px !important;
    justify-content: center !important;
    text-align: center !important;
  }
  
  div[data-testid="google-signin-button"] > div,
  div[role="button"][data-client-id] > div {
    width: 100% !important;
    justify-content: center !important;
  }
`}</style>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
