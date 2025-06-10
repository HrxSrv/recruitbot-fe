import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes, static files, and public assets
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Define public paths that don't require authentication
  const publicPaths = ["/", "/login", "/terms", "/privacy", "/buy-service"]
  const isPublicPath = publicPaths.includes(pathname)

  // Get auth cookie
  const authCookie = request.cookies.get("auth_token")
  const hasAuthCookie = !!authCookie?.value

  // If accessing a protected route without auth cookie, redirect to login
  if (!isPublicPath && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If accessing login page with auth cookie, redirect to dashboard
  if (pathname === "/login" && hasAuthCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)"],
}
