import { useEffect, useState, useRef } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'
import { WebView } from 'react-native-webview'
import { useRouter } from 'expo-router'
import { getSiftlyUrl } from '../../lib/storage'

export default function HomeScreen() {
  const router = useRouter()
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const webviewRef = useRef<WebView>(null)

  useEffect(() => {
    getSiftlyUrl().then((siftlyUrl) => {
      if (siftlyUrl) {
        setUrl(`${siftlyUrl.replace(/\/$/, '')}`)
      }
      setLoading(false)
    })
  }, [])

  function handleOpenExternal() {
    if (!url) return
    // Use expo-web-browser to open in external browser
    // For now, just reload
    webviewRef.current?.reload()
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  if (!url) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Siftly URL not configured</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Text style={styles.linkText}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        )}
      />
      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  centered: {
    flex: 1,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    color: '#71717a',
    fontSize: 16,
    marginBottom: 16,
  },
  linkText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#18181b',
  },
})
