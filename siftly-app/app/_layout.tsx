import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { isConfigured } from '../lib/storage'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    isConfigured().then((val) => {
      setConfigured(val)
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#18181b' },
        }}
      >
        {!configured ? (
          <Stack.Screen name="setup" />
        ) : (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="webview"
              options={{
                presentation: 'fullScreenModal',
                headerShown: true,
                headerTitle: 'Siftly',
                headerStyle: { backgroundColor: '#27272a' },
                headerTintColor: '#a1a1aa',
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'Settings',
                headerStyle: { backgroundColor: '#27272a' },
                headerTintColor: '#a1a1aa',
              }}
            />
          </>
        )}
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
