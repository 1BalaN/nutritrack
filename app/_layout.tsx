import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useDatabaseMigrations } from '@/db/migrations'
import { ensureAuthenticatedUser } from '@/lib/auth'
import { queryClient } from '@/query/query-client'
import { startSyncManager, stopSyncManager } from '@/services/sync-manager'

function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { success, error } = useDatabaseMigrations()

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>DB migration error: {error.message}</Text>
      </View>
    )
  }

  if (!success) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size='large' color='#1DB954' />
      </View>
    )
  }

  return <>{children}</>
}

function SyncBootstrap() {
  useEffect(() => {
    void ensureAuthenticatedUser()
    void startSyncManager()
    return () => stopSyncManager()
  }, [])

  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <DatabaseProvider>
          <SyncBootstrap />
          <Stack>
            <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
            <Stack.Screen name='add-food' options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen
              name='add-product'
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name='add-recipe'
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name='scanner'
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name='+not-found' />
          </Stack>
          <StatusBar style='auto' />
        </DatabaseProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
