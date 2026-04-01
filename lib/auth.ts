import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

const SESSION_COOKIE = 'session'

/**
 * Validate the session cookie from a request.
 * Returns the session token if valid, null if invalid/missing.
 */
export async function validateSession(request: NextRequest): Promise<string | null> {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value
  if (!sessionToken) return null

  const sessionKey = `session_${sessionToken}`
  const session = await prisma.setting.findUnique({ where: { key: sessionKey } })

  if (!session) return null

  // Check if session has expired
  const expiresAt = Number(session.value)
  if (Date.now() > expiresAt) {
    await prisma.setting.delete({ where: { key: sessionKey } }).catch(() => {})
    return null
  }

  return sessionToken
}

/**
 * Require authentication — returns 401 JSON response if not authenticated.
 * Use this at the start of protected API route handlers.
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const sessionToken = await validateSession(request)
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
