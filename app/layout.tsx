import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@/styles/glass-effects.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/context/auth-context"
import { Toaster } from "@/components/ui/toaster"
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "eva",
  description: "A comprehensive HR dashboard for managing recruitment, candidates, and hiring processes",
  keywords: "HR, recruitment, dashboard, hiring, candidates, jobs, talent management",
  authors: [{ name: "vFoundry Team" }],
  icons: {
    icon: "/eva.png",
    shortcut: "/eva.png",
    apple: "/eva.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
