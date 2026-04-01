import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

const SESSION_COOKIE = 'session'

/** POST /api/auth/logout — clear session cookie and delete session from DB */
export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value

  if (sessionToken) {
    // Delete session from DB
    const sessionKey = `session_${sessionToken}`
    try {
      await prisma.setting.delete({ where: { key: sessionKey } })
    } catch {
      // Session might not exist, ignore
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}
