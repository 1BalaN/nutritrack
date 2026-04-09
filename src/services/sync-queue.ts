import { pendingSyncRepository } from '@/db/repositories'
import { appStorage } from '@/lib/storage'
import { useSyncStore } from '@/store/sync.store'
import type { SyncEntityType, SyncOperation } from '@/types'

export async function enqueueSync(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: unknown
): Promise<void> {
  if (!appStorage.isSyncEnabled()) return

  await pendingSyncRepository.enqueue(entityType, entityId, operation, payload)

  const count = await pendingSyncRepository.count()
  useSyncStore.getState().setPendingCount(count)
}
