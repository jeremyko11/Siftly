import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { getSiftlyUrl } from '../../lib/storage'

export default function SettingsTabScreen() {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSiftlyUrl().then((siftlyUrl) => {
      if (siftlyUrl) {
        setUrl(`${siftlyUrl.replace(/\/$/, '')}/settings`)
      }
      setLoading(false)
    })
  }, [])

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
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        javaScriptEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#18181b' },
  centered: { flex: 1, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#71717a', fontSize: 16 },
  webview: { flex: 1, backgroundColor: '#18181b' },
  webviewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' },
})
