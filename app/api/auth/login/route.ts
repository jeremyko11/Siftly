import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/db'

const SESSION_COOKIE = 'session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/** POST /api/auth/login — authenticate and set session cookie */
export async function POST(request: NextRequest) {
  let body: { password?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { password } = body
  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  // Get or create password hash (first-time setup)
  let passwordHashSetting = await prisma.setting.findUnique({
    where: { key: 'auth_password_hash' },
  })

  if (!passwordHashSetting) {
    // First-time setup: generate random password
    const rawPassword = crypto.randomBytes(6).toString('hex')
    const newHash = hashPassword(rawPassword)
    await prisma.setting.create({
      data: { key: 'auth_password_hash', value: newHash },
    })
    console.log(`\n[Auth] First-time setup: your password is ${rawPassword}\n`)

    // If this is the first login attempt, check against the newly created hash
    const providedHash = hashPassword(password)
    if (providedHash !== newHash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    passwordHashSetting = { key: 'auth_password_hash', value: newHash, userId: 'default' }
  }

  const providedHash = hashPassword(password)
  if (providedHash !== passwordHashSetting.value) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // Create session
  const sessionToken = generateSessionToken()
  const sessionKey = `session_${sessionToken}`
  const expiresAt = Date.now() + SESSION_TTL_MS

  await prisma.setting.upsert({
    where: { key: sessionKey },
    update: { value: String(expiresAt) },
    create: { key: sessionKey, value: String(expiresAt) },
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  })

  return response
}
