import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const ENCRYPTED_PREFIX = 'enc:'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-me-in-production-32ch', 'utf8').slice(0, 32)

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ENCRYPTED_PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(encrypted: string): string {
  const data = Buffer.from(encrypted.slice(ENCRYPTED_PREFIX.length), 'base64')
  const iv = data.slice(0, 12)
  const tag = data.slice(12, 28)
  const encrypted_text = data.slice(28)
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted_text) + decipher.final('utf8')
}

/**
 * Try to decrypt a value. If it fails (e.g., plain text legacy data),
 * return the value as-is.
 */
export function decryptSafe(value: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    // Not encrypted, return as-is (backwards compatibility)
    return value
  }
  try {
    return decrypt(value)
  } catch {
    // Decryption failed, return as-is (legacy plain text)
    return value
  }
}

/**
 * Encrypt a value only if it's not already encrypted.
 */
export function encryptIfNeeded(value: string): string {
  if (value.startsWith(ENCRYPTED_PREFIX)) {
    return value
  }
  return encrypt(value)
}
