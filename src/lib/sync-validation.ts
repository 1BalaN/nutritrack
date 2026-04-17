import type { PendingSync, SyncEntityType } from '@/types'

export type SyncData = {
  id?: string
  updatedAt?: number
  createdAt?: number
  [key: string]: unknown
}

export function parseSyncPayload(payload: string): SyncData {
  return JSON.parse(payload) as SyncData
}

export function validateSyncPayload(
  entityType: SyncEntityType,
  operation: PendingSync['operation'],
  data: SyncData
) {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid payload: ${entityType}`)
  }
  if (operation !== 'delete' && !data.id) {
    throw new Error(`Invalid payload id: ${entityType}`)
  }
  if (
    operation !== 'delete' &&
    (typeof data.updatedAt !== 'number' || !Number.isFinite(data.updatedAt))
  ) {
    throw new Error(`Invalid payload updatedAt: ${entityType}`)
  }
}
