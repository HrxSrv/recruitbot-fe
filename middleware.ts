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

  console.log(`[Middleware] Path: ${pathname}, IsPublic: ${isPublicPath}`)

  // Since we're using localStorage for auth state, we can't check auth in middleware
  // Let all requests through and handle auth on the client side
  console.log(`[Middleware] Using localStorage auth - allowing all requests`)
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)"],
}
