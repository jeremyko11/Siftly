import * as SecureStore from 'expo-secure-store'

const KEYS = {
  SIFLTY_URL: 'siftly_url',
  SIFLTY_TOKEN: 'siftly_token',
  SIFLTY_CONFIGURED: 'siftly_configured',
} as const

export async function getSiftlyUrl(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.SIFLTY_URL)
  } catch {
    return null
  }
}

export async function setSiftlyUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.SIFLTY_URL, url)
}

export async function getSiftlyToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.SIFLTY_TOKEN)
  } catch {
    return null
  }
}

export async function setSiftlyToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.SIFLTY_TOKEN, token)
}

export async function isConfigured(): Promise<boolean> {
  const url = await getSiftlyUrl()
  return !!url && url.length > 0
}

export async function clearAll(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.SIFLTY_URL)
  await SecureStore.deleteItemAsync(KEYS.SIFLTY_TOKEN)
}
