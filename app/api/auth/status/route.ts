import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

const SESSION_COOKIE = 'session'

/** GET /api/auth/status — return authentication status */
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false })
  }

  const sessionKey = `session_${sessionToken}`
  const session = await prisma.setting.findUnique({ where: { key: sessionKey } })

  if (!session) {
    return NextResponse.json({ authenticated: false })
  }

  // Check if session has expired
  const expiresAt = Number(session.value)
  if (Date.now() > expiresAt) {
    // Clean up expired session
    await prisma.setting.delete({ where: { key: sessionKey } }).catch(() => {})
    return NextResponse.json({ authenticated: false })
  }

  return NextResponse.json({ authenticated: true })
}
