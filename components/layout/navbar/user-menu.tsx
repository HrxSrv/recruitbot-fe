"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Settings, LogOut, Mail, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/context/auth-context"

export function UserMenu() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative group">
          <span className="absolute inset-0 rounded-full bg-primary/10 scale-0 transition-transform duration-200 group-hover:scale-100"></span>
          <Avatar className="h-8 w-8 ring-2 ring-white/10 transition-all duration-200 group-hover:ring-primary/20">
            <AvatarImage src={user.picture || "/abstract-geometric-shapes.png"} alt="User" />
            <AvatarFallback className="bg-blue-500 text-white">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-100 glass-dropdown border border-white/20 shadow-[0_10px_40px_-5px_rgba(0,0,0,0.15)]"
      >
        {/* User Info Section */}
        <div className="p-4 space-y-3">
          <div className="flex items-center space-x-3">
            <Avatar className="h-24 w-24 ring-2 ring-blue-500/20">
              <AvatarImage src={user.picture || "/abstract-geometric-shapes.png"} alt="User" />
              <AvatarFallback className="bg-blue-500 text-white text-lg">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-foreground truncate">{user.name}</span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-3 w-3 text-gray-500" />
                <span className="text-sm text-muted-foreground truncate">{user.email}</span>
              </div>
              {user.role && (
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    {user.role}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Action Items */}
        <div className="p-2 space-y-1 flex justify-around">
          <DropdownMenuItem className="hover:bg-white/10 dark:hover:bg-white/5 transition-colors p-0">
          <Link href="/dashboard/settings" className="flex items-center w-full px-2 py-2">
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer text-blue-600 dark:text-blue-400 focus:bg-blue-50 focus:text-blue-700"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Log out
        </DropdownMenuItem>
         </div> 
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
