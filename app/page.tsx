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
  const [showFallbackButton, setShowFallbackButton] = useState(false)
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

      console.log("Google Sign-In initialized successfully")
    } catch (initError) {
      console.error("Google initialization failed:", initError)
      setError("Failed to initialize Google Sign-In")
    }
  }

  const renderGoogleButton = () => {
    if (!window.google || !googleButtonRef.current) return

    try {
      // Clear any existing content
      googleButtonRef.current.innerHTML = ""

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: theme === "dark" ? "filled_black" : "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        locale: "en",
      })

      console.log("Google fallback button rendered successfully")

      // Apply styling fixes after rendering
      setTimeout(() => {
        fixGoogleButtonStyling()
      }, 100)
    } catch (renderError) {
      console.error("Failed to render Google fallback button:", renderError)
      setError("Failed to render Google Sign-In button")
    }
  }

  const handleCustomGoogleSignIn = () => {
    if (!window.google || isLoading) return

    setIsLoading(true)
    setError(null)
    setLoginStep("Opening Google Sign-In...")

    try {
      // First try One Tap
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log("Google One Tap not displayed, falling back to official button")

          // Show fallback button instead of popup
          setShowFallbackButton(true)
          setIsLoading(false)
          setLoginStep("")

          // Render Google's official button after state update
          setTimeout(() => {
            renderGoogleButton()
          }, 100)
        } else {
          // One Tap is showing, reset loading state
          setIsLoading(false)
          setLoginStep("")
        }
      })
    } catch (error) {
      console.error("Failed to trigger Google Sign-In:", error)
      setError("Failed to start Google Sign-In. Please refresh and try again.")
      setIsLoading(false)
      setLoginStep("")
    }
  }

  const fixGoogleButtonStyling = () => {
    const container = googleButtonRef.current
    if (!container) return

    // Find all potential Google button elements
    const selectors = [
      'div[data-testid="google-signin-button"]',
      'div[role="button"][data-client-id]',
      ".g_id_signin",
      "[data-client-id]",
      "div[jsname]",
      'iframe[src*="accounts.google.com"]',
    ]

    selectors.forEach((selector) => {
      const elements = container.querySelectorAll(selector)
      elements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.width = "280px !important"
          element.style.minWidth = "280px !important"
          element.style.maxWidth = "280px !important"
          element.style.flexShrink = "0"
          element.style.justifyContent = "center"
          element.style.textAlign = "center"
          element.style.display = "flex"
          element.style.alignItems = "center"

          // Also fix child elements
          const children = element.querySelectorAll("div, span")
          children.forEach((child) => {
            if (child instanceof HTMLElement) {
              child.style.width = "280px !important"
              child.style.minWidth = "280px !important"
              child.style.flexShrink = "0"
              child.style.justifyContent = "center"
              child.style.textAlign = "center"
              if (child.tagName === "DIV") {
                child.style.display = "flex"
                child.style.alignItems = "center"
              }
            }
          })
        }
      })
    })
  }

  // Re-render Google button when theme changes (for fallback button)
  useEffect(() => {
    if (showFallbackButton && googleLoaded && googleButtonRef.current && window.google && !isLoading) {
      renderGoogleButton()

      // Set up observer to watch for changes on fallback button
      const observer = new MutationObserver(() => {
        fixGoogleButtonStyling()
      })

      if (googleButtonRef.current) {
        observer.observe(googleButtonRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["style", "class"],
        })
      }

      // Also fix on a slight delay to catch async changes
      const timeouts = [100, 500, 1000, 2000].map((delay) => setTimeout(fixGoogleButtonStyling, delay))

      return () => {
        observer.disconnect()
        timeouts.forEach(clearTimeout)
      }
    }
  }, [theme, showFallbackButton, googleLoaded, isLoading])

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
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm  p-1 shadow-lg border border-white/20  dark:bg-white mb-4 overflow-hidden">
                <Image
                  src="/eva.png"
                  alt="Eva Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div className="relative">
                <span className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent tracking-tight">
                  eva
                </span>
                {/* Subtle text shadow effect */}
                <div className="absolute inset-0 text-3xl font-bold text-primary/10 blur-sm">
                  eva
                </div>
              </div>
            </div>

            {/* Auth Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
              <CardHeader className="text-center ">
                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                  Sign in to continue
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Access your recruitment dashboard
                </CardDescription>
              </CardHeader>

              <CardContent >
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

                {/* Google Sign-in Button */}
                <div className="flex justify-center">
                  <div className="w-full max-w-sm">
                    {googleLoaded && !error && !isLoading ? (
                      <>
                        {!showFallbackButton ? (
                          // Custom Button (Primary)
                          <button
                            onClick={handleCustomGoogleSignIn}
                            disabled={isLoading}
                            className="w-full min-w-[280px] h-[44px] flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                            <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">
                              Sign in with Google
                            </span>
                          </button>
                        ) : (
                          // Google's Official Button (Fallback)
                          <div className="space-y-3">
                            <div className="text-center">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                Please use the official Google button below:
                              </p>
                            </div>
                            <div
                              ref={googleButtonRef}
                              className="flex justify-center items-center w-full min-w-[280px]"
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                width: "100%",
                                minWidth: "280px",
                              }}
                            />
                          </div>
                        )}
                      </>
                    ) : !error ? (
                      <div className="flex items-center justify-center p-4 h-12 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 w-full min-w-[280px]">
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
                <div className="w-24 h-24 rounded-2xl bg-white/90 backdrop-blur-sm rounded-full dark:from-white dark:to-slate-200 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/eva.png"
                    alt="Eva Logo"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
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
