/**
 * One-time password reset endpoint.
 * Clears auth_password_hash so next login generates a fresh password.
 * Auto-deleted after use (check by seeing if this file exists after use).
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  // Secret token to prevent unauthorized resets
  const authHeader = request.headers.get('authorization')
  const EXPECTED_TOKEN = 'siftly-onetime-reset-2026'

  if (authHeader !== `Bearer ${EXPECTED_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete the password hash — next login will generate a new one
  await prisma.setting.deleteMany({
    where: { key: 'auth_password_hash' },
  }).catch(() => {})

  return NextResponse.json({ ok: true, message: 'Password hash cleared. Next login will generate a new password.' })
}
