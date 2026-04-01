import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'session'

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/status',
  '/api/settings/test',
  '/api/import/x-oauth/authorize',
  '/api/import/x-oauth/callback',
  '/api/import/x-oauth/disconnect',
  '/api/import/x-oauth/status',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p)
  )
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value

  if (!sessionToken) {
    // No session token
    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // For page routes, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For page routes, we trust the cookie presence and let the page component
  // validate the session via /api/auth/status if needed
  // For API routes, they must validate the session themselves

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match everything except Next.js internals and static files
    '/((?!_next/|favicon.ico|icon.svg).*)',
  ],
}
