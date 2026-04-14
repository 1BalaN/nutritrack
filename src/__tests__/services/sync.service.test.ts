jest.mock('@/db/repositories', () => ({
  pendingSyncRepository: {
    findAll: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    incrementRetry: jest.fn(),
    enqueue: jest.fn(),
  },
  mealEntriesRepository: {
    markSynced: jest.fn(),
  },
}))

jest.mock('@/lib/api', () => ({
  normalizeError: jest.fn((err: unknown) => ({
    message: err instanceof Error ? err.message : 'error',
    status: null,
    code: null,
    isNetworkError: true,
  })),
}))

jest.mock('@/services/firebase-sync.service', () => ({
  syncPendingItemToFirebase: jest.fn(),
}))

jest.mock('@/lib/storage', () => ({
  appStorage: {
    isSyncEnabled: jest.fn(() => true),
    setLastSyncedAt: jest.fn(),
    getLastSyncedAt: jest.fn(() => null),
  },
}))

jest.mock('@/store/sync.store', () => ({
  __mockSyncState: {
    setSyncing: jest.fn(),
    setSyncSuccess: jest.fn(),
    setSyncError: jest.fn(),
    setSyncIdle: jest.fn(),
    setPendingCount: jest.fn(),
  },
  useSyncStore: {
    getState: jest.fn(
      () => (jest.requireMock('@/store/sync.store') as { __mockSyncState: unknown }).__mockSyncState
    ),
    setState: jest.fn(),
  },
}))

import { syncService } from '@/services/sync.service'

beforeEach(() => {
  jest.clearAllMocks()
})

function getMocks() {
  const repos = jest.requireMock('@/db/repositories') as {
    pendingSyncRepository: {
      findAll: jest.Mock
      count: jest.Mock
      delete: jest.Mock
      incrementRetry: jest.Mock
      enqueue: jest.Mock
    }
    mealEntriesRepository: {
      markSynced: jest.Mock
    }
  }
  const api = jest.requireMock('@/lib/api') as {
    normalizeError: jest.Mock
  }
  const firebaseSync = jest.requireMock('@/services/firebase-sync.service') as {
    syncPendingItemToFirebase: jest.Mock
  }
  const storage = jest.requireMock('@/lib/storage') as {
    appStorage: { isSyncEnabled: jest.Mock }
  }
  const syncStore = jest.requireMock('@/store/sync.store') as {
    __mockSyncState: {
      setSyncing: jest.Mock
      setSyncSuccess: jest.Mock
      setSyncError: jest.Mock
      setSyncIdle: jest.Mock
      setPendingCount: jest.Mock
    }
    useSyncStore: { getState: jest.Mock }
  }
  const syncState = syncStore.__mockSyncState
  return {
    pending: repos.pendingSyncRepository,
    mealEntries: repos.mealEntriesRepository,
    api,
    firebaseSync,
    storage: storage.appStorage,
    syncState,
  }
}

describe('syncService.sync', () => {
  it('returns empty result when sync is disabled', async () => {
    const { storage, pending } = getMocks()
    storage.isSyncEnabled.mockReturnValue(false)
    const result = await syncService.sync()
    expect(result).toEqual({ synced: 0, failed: 0, skipped: 0 })
    expect(pending.findAll).not.toHaveBeenCalled()
  })

  it('returns empty result when no pending items', async () => {
    const { storage, pending, syncState } = getMocks()
    storage.isSyncEnabled.mockReturnValue(true)
    pending.findAll.mockResolvedValue([])
    pending.count.mockResolvedValue(0)

    const result = await syncService.sync()
    expect(result).toEqual({ synced: 0, failed: 0, skipped: 0 })
    expect(syncState.setSyncIdle).toHaveBeenCalled()
  })

  it('syncs items successfully', async () => {
    const { storage, pending, mealEntries, firebaseSync, syncState } = getMocks()
    storage.isSyncEnabled.mockReturnValue(true)
    const item = {
      id: 'sync1',
      entityType: 'meal_entry',
      entityId: 'e1',
      operation: 'create',
      payload: JSON.stringify({ test: true }),
      retryCount: 0,
      createdAt: Date.now(),
    }
    pending.findAll.mockResolvedValue([item])
    pending.count.mockResolvedValue(0)
    firebaseSync.syncPendingItemToFirebase.mockResolvedValue('synced')
    mealEntries.markSynced.mockResolvedValue(undefined)
    pending.delete.mockResolvedValue(undefined)

    const result = await syncService.sync()
    expect(result.synced).toBe(1)
    expect(result.failed).toBe(0)
    expect(syncState.setSyncSuccess).toHaveBeenCalled()
  })

  it('skips items with too many retries', async () => {
    const { storage, pending, firebaseSync } = getMocks()
    storage.isSyncEnabled.mockReturnValue(true)
    const item = {
      id: 'sync2',
      entityType: 'meal_entry',
      entityId: 'e2',
      operation: 'create',
      payload: JSON.stringify({}),
      retryCount: 5,
      createdAt: Date.now(),
    }
    pending.findAll.mockResolvedValue([item])
    pending.count.mockResolvedValue(1)

    const result = await syncService.sync()
    expect(result.skipped).toBe(1)
    expect(firebaseSync.syncPendingItemToFirebase).not.toHaveBeenCalled()
  })

  it('increments retry on network error', async () => {
    const { storage, pending, firebaseSync, syncState } = getMocks()
    storage.isSyncEnabled.mockReturnValue(true)
    const item = {
      id: 'sync3',
      entityType: 'meal_entry',
      entityId: 'e3',
      operation: 'create',
      payload: JSON.stringify({}),
      retryCount: 0,
      createdAt: Date.now(),
    }
    pending.findAll.mockResolvedValue([item])
    pending.count.mockResolvedValue(1)
    firebaseSync.syncPendingItemToFirebase.mockRejectedValue(new Error('network error'))
    pending.incrementRetry.mockResolvedValue(undefined)

    const result = await syncService.sync()
    expect(result.failed).toBe(1)
    expect(pending.incrementRetry).toHaveBeenCalledWith('sync3')
    expect(syncState.setSyncError).toHaveBeenCalled()
  })

  it('deletes item when firebase sync reports skipped conflict', async () => {
    const { storage, pending, firebaseSync } = getMocks()
    storage.isSyncEnabled.mockReturnValue(true)
    const item = {
      id: 'sync4',
      entityType: 'product',
      entityId: 'p1',
      operation: 'update',
      payload: JSON.stringify({}),
      retryCount: 0,
      createdAt: Date.now(),
    }
    pending.findAll.mockResolvedValue([item])
    pending.count.mockResolvedValue(0)

    firebaseSync.syncPendingItemToFirebase.mockResolvedValue('skipped')
    pending.delete.mockResolvedValue(undefined)

    const result = await syncService.sync()
    expect(result.skipped).toBe(1)
    expect(pending.delete).toHaveBeenCalledWith('sync4')
    expect(pending.incrementRetry).not.toHaveBeenCalled()
  })
})

describe('syncService.getPendingCount', () => {
  it('returns pending count from repository', async () => {
    const { pending } = getMocks()
    pending.count.mockResolvedValue(7)
    expect(await syncService.getPendingCount()).toBe(7)
  })
})
