import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network'
import { syncService } from './sync.service'

let unsubscribeNetwork: { remove: () => void } | null = null
let running = false
let lastRunAt = 0

const MIN_SYNC_INTERVAL_MS = 10_000

async function runSyncIfNeeded() {
  if (running) return
  if (Date.now() - lastRunAt < MIN_SYNC_INTERVAL_MS) return

  running = true
  try {
    await syncService.sync()
    lastRunAt = Date.now()
  } finally {
    running = false
  }
}

export async function startSyncManager() {
  if (unsubscribeNetwork) return

  const initial = await getNetworkStateAsync()
  if (initial.isConnected) {
    void runSyncIfNeeded()
  }

  unsubscribeNetwork = addNetworkStateListener((state) => {
    if (state.isConnected) {
      void runSyncIfNeeded()
    }
  })
}

export function stopSyncManager() {
  unsubscribeNetwork?.remove()
  unsubscribeNetwork = null
}
