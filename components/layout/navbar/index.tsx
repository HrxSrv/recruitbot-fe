"use client";

import { BriefcaseIcon, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import { useAuth } from "@/lib/context/auth-context";
import Link from "next/link";
import Image from "next/image";
import eva from "@/public/eva.png";

function SuperAdminButton() {
  const { user } = useAuth();

  if (!user || user.email !== "harshitsrv2004@gmail.com") {
    return null;
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
  );
}

interface TopNavbarProps {
  onOpenSidebar: () => void;
}

export function TopNavbar({ onOpenSidebar }: TopNavbarProps) {
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

      <Button
        variant="ghost"
        size="icon"
        className="md:hidden relative z-10"
        onClick={onOpenSidebar}
      >
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
    <div className="relative bg-white/90 backdrop-blur-sm rounded-full p-1  border border-white/20">
      <Image
        src={eva}
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
    <div className="absolute inset-0 text-3xl font-bold text-primary/10 blur-sm">
      eva
    </div>
  </div>
</div>

      {/* Super Admin Button - Only visible for super admin */}
      <SuperAdminButton />
      {/* <SearchBar/> */}
      <div className="ml-auto flex items-center gap-4 relative z-10">
        {/* <NotificationsMenu /> */}
        {/* <ThemeToggle /> */}
        <UserMenu />
      </div>
    </header>
  );
}