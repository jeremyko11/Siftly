import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { setSiftlyUrl } from '../lib/storage'

export default function SetupScreen() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleContinue() {
    const trimmed = url.trim()
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your Siftly server URL')
      return
    }
    // Basic URL validation
    try {
      new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    } catch {
      Alert.alert('Invalid URL', 'Please enter a valid URL (e.g. http://localhost:3000 or https://your-siftly.com)')
      return
    }

    setSaving(true)
    try {
      await setSiftlyUrl(trimmed)
      // Reload the app to pick up the new URL
      router.replace('/(tabs)')
    } catch (err) {
      Alert.alert('Error', String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>Sift<span style={styles.logoAccent}>ly</span></Text>
        </View>

        <Text style={styles.title}>Connect to Siftly</Text>
        <Text style={styles.subtitle}>
          Enter your Siftly server URL to get started.
          {'\n'}Use your Tailscale IP (e.g. http://100.96.146.5:3000) for local access.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://localhost:3000"
            placeholderTextColor="#52525b"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? 'Connecting…' : 'Continue'}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Don't have Siftly running locally?{'\n'}
          Deploy it and enter your public URL above.
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  logo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#f4f4f5',
  },
  logoAccent: {
    color: '#F5A623',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f4f4f5',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  input: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#e4e4e7',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
    lineHeight: 18,
  },
})
