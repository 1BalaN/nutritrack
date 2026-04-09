import { create } from 'zustand'
import { appStorage } from '@/lib/storage'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success'

interface SyncState {
  status: SyncStatus
  lastSyncedAt: number | null
  pendingCount: number
  error: string | null

  setSyncing: () => void
  setSyncSuccess: (ts: number) => void
  setSyncError: (message: string) => void
  setSyncIdle: () => void
  setPendingCount: (count: number) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: appStorage.getLastSyncedAt(),
  pendingCount: 0,
  error: null,

  setSyncing: () => set({ status: 'syncing', error: null }),

  setSyncSuccess: (ts) => {
    appStorage.setLastSyncedAt(ts)
    set({ status: 'success', lastSyncedAt: ts, error: null })
  },

  setSyncError: (message) => set({ status: 'error', error: message }),

  setSyncIdle: () => set({ status: 'idle', error: null }),

  setPendingCount: (count) => set({ pendingCount: count }),
}))
