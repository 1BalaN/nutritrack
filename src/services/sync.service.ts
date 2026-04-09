import { pendingSyncRepository } from '@/db/repositories'
import { mealEntriesRepository } from '@/db/repositories'
import { apiClient, normalizeError } from '@/lib/api'
import { appStorage } from '@/lib/storage'
import { useSyncStore } from '@/store/sync.store'
import type { PendingSync, SyncEntityType, SyncOperation } from '@/types'

const MAX_BATCH_SIZE = 50
const MAX_RETRY_COUNT = 5

interface SyncPayload {
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperation
  data: unknown
}

interface SyncResult {
  synced: number
  failed: number
  skipped: number
}

async function processBatch(items: PendingSync[]): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, skipped: 0 }

  for (const item of items) {
    if (item.retryCount >= MAX_RETRY_COUNT) {
      result.skipped++
      continue
    }

    let data: unknown
    try {
      data = JSON.parse(item.payload)
    } catch {
      await pendingSyncRepository.incrementRetry(item.id)
      result.failed++
      continue
    }

    const payload: SyncPayload = {
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      data,
    }

    try {
      await apiClient.post('/sync', payload)

      if (item.entityType === 'meal_entry' && item.operation !== 'delete') {
        await mealEntriesRepository.markSynced([item.entityId])
      }

      await pendingSyncRepository.delete(item.id)
      result.synced++
    } catch (err) {
      const apiError = normalizeError(err)

      if (apiError.status === 409) {
        await pendingSyncRepository.delete(item.id)
        result.skipped++
      } else {
        await pendingSyncRepository.incrementRetry(item.id)
        result.failed++
      }
    }
  }

  return result
}

export const syncService = {
  async sync(): Promise<SyncResult> {
    if (!appStorage.isSyncEnabled()) {
      return { synced: 0, failed: 0, skipped: 0 }
    }

    const { setSyncing, setSyncSuccess, setSyncError, setSyncIdle, setPendingCount } =
      useSyncStore.getState()

    const pending = await pendingSyncRepository.findAll()
    setPendingCount(pending.length)

    if (pending.length === 0) {
      setSyncIdle()
      return { synced: 0, failed: 0, skipped: 0 }
    }

    setSyncing()

    const totalResult: SyncResult = { synced: 0, failed: 0, skipped: 0 }

    try {
      for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
        const batch = pending.slice(i, i + MAX_BATCH_SIZE)
        const batchResult = await processBatch(batch)
        totalResult.synced += batchResult.synced
        totalResult.failed += batchResult.failed
        totalResult.skipped += batchResult.skipped
      }

      const remaining = await pendingSyncRepository.count()
      setPendingCount(remaining)

      if (totalResult.failed === 0) {
        setSyncSuccess(Date.now())
      } else {
        setSyncError(`${totalResult.failed} items failed to sync`)
      }
    } catch (err) {
      const apiError = normalizeError(err)
      setSyncError(apiError.message)
    }

    return totalResult
  },

  async getPendingCount(): Promise<number> {
    return pendingSyncRepository.count()
  },

  async clearFailed(): Promise<void> {
    const all = await pendingSyncRepository.findAll()
    const failed = all.filter((item) => item.retryCount >= MAX_RETRY_COUNT)
    await Promise.all(failed.map((item) => pendingSyncRepository.delete(item.id)))
  },
}
