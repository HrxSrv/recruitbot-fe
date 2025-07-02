"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserMenu } from "./user-menu"
import { useAuth } from "@/lib/context/auth-context"
import Link from "next/link"
import Image from "next/image"
import eva from "@/public/eva.png"
import { useEffect, useState } from "react"
import { getCustomer } from "@/lib/api/customers"
import { useToast } from "@/hooks/use-toast"
import { JobsMonitorDropdown } from "./jobs-monitor-dropdown"

function SuperAdminButton() {
  const { user } = useAuth()

  if (!user || user.email !== "harshitsrv2004@gmail.com") {
    return null
  }

  return (
    <Link href="/dashboard/super-admin">
      <Button
        variant="outline"
        size="sm"
        className="relative z-10 bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/20"
      >
        Super Admin
      </Button>
    </Link>
  )
}

interface TopNavbarProps {
  onOpenSidebar: () => void
}

export function TopNavbar({ onOpenSidebar }: TopNavbarProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const customerId = user?.customer_id
  // console.log(user);
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!user || !customerId) {
      console.log("No user or customer ID found, skipping customer load")
      return
    }
    loadCustomers()
  }, [user])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await getCustomer(customerId!)
      setCustomer(data)
      console.log("Customer data loaded:", data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load customer",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 px-4 sm:px-6 shadow-sm relative overflow-hidden">
      {/* Enhanced glass effect with layered backgrounds */}
      <div className="absolute inset-0 glass-navbar backdrop-blur-md"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>

      {/* Subtle animated particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-1 w-1 rounded-full bg-primary/20 animate-pulse"></div>
        <div className="absolute top-3/4 left-1/3 h-1 w-1 rounded-full bg-primary/20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-2/3 h-1 w-1 rounded-full bg-primary/20 animate-pulse animation-delay-4000"></div>
      </div>

      <Button variant="ghost" size="icon" className="md:hidden relative z-10" onClick={onOpenSidebar}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex items-center gap-4 relative z-10">
        {/* Enhanced logo container with multiple visual effects */}
        <div className="relative group">
          {/* Outer glow ring */}
          {/* <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div> */}

          {/* Inner glow */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm animate-pulse"></div>

          {/* Logo container with shadow */}
          <div className="relative bg-white/90 backdrop-blur-sm rounded-full p-1 border border-white/20">
            <Image
              src={eva || "/placeholder.svg"}
              alt="Eva Logo"
              width={40}
              height={40}
              className="relative object-contain rounded-full"
              priority
            />
          </div>
        </div>

        {/* Enhanced text with gradient and effects */}
        <div className="relative">
          <span className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent tracking-tight">
            eva
          </span>
          {/* Subtle text shadow effect */}
          <div className="absolute inset-0 text-3xl font-bold text-primary/10 blur-sm">eva</div>
        </div>

        {/* Professional separator and company logo */}
        {customer?.avatar_url && (
          <>
            {/* Vertical separator */}
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-black to-transparent opacity-60"></div>

            {/* Company logo */}
            <div className="relative group">
              {customer.website ? (
                <a
                  href={customer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block transition-transform duration-200 hover:scale-105"
                >
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-lg p-1 border border-gray-200/60 hover:border-gray-300/80 transition-all duration-200 hover:shadow-sm">
                    <Image
                      src={customer.avatar_url || "/placeholder.svg"}
                      alt={`${customer.name || "Company"} Logo`}
                      width={82}
                      height={82}
                      className="object-contain rounded-sm"
                      onError={(e) => {
                        // Fallback to a default icon if image fails to load
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  </div>
                </a>
              ) : (
                <div className="relative bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-gray-200/60">
                  <Image
                    src={customer.avatar_url || "/placeholder.svg"}
                    alt={`${customer.name || "Company"} Logo`}
                    width={32}
                    height={32}
                    className="object-contain rounded-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Super Admin Button - Only visible for super admin */}
      <SuperAdminButton />
      {/* <SearchBar/> */}
      <div className="ml-auto flex items-center gap-4 relative z-10">
        <JobsMonitorDropdown />
        <UserMenu />
      </div>
    </header>
  )
}
