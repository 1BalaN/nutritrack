import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { ensureAuthenticatedUser } from '@/lib/auth'
import type { PendingSync, SyncEntityType } from '@/types'

type SyncOutcome = 'synced' | 'skipped'

type SyncData = {
  id?: string
  updatedAt?: number
  createdAt?: number
  [key: string]: unknown
}

const ENTITY_COLLECTION: Record<SyncEntityType, string> = {
  meal_entry: 'meal_entries',
  recipe: 'recipes',
  product: 'products',
  user_profile: 'profile',
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function validatePayload(
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
  if (operation !== 'delete' && !isFiniteNumber(data.updatedAt)) {
    throw new Error(`Invalid payload updatedAt: ${entityType}`)
  }
}

function getEntityDocPath(uid: string, entityType: SyncEntityType, entityId: string) {
  const collection = ENTITY_COLLECTION[entityType]
  return doc(firestore, `users/${uid}/${collection}/${entityId}`)
}

function isRemoteNewer(remoteUpdatedAt: unknown, localUpdatedAt: unknown) {
  return (
    isFiniteNumber(remoteUpdatedAt) &&
    isFiniteNumber(localUpdatedAt) &&
    remoteUpdatedAt > localUpdatedAt
  )
}

export async function syncPendingItemToFirebase(item: PendingSync): Promise<SyncOutcome> {
  const user = await ensureAuthenticatedUser()
  const data = JSON.parse(item.payload) as SyncData
  validatePayload(item.entityType, item.operation, data)

  const entityId = data.id ?? item.entityId
  const ref = getEntityDocPath(user.uid, item.entityType, entityId)
  const remoteSnap = await getDoc(ref)
  const remote = remoteSnap.exists() ? (remoteSnap.data() as SyncData) : null

  if (item.operation === 'delete') {
    if (remote && isRemoteNewer(remote.updatedAt, data.updatedAt)) return 'skipped'
    await deleteDoc(ref)
    return 'synced'
  }

  if (remote && isRemoteNewer(remote.updatedAt, data.updatedAt)) {
    return 'skipped'
  }

  await setDoc(
    ref,
    {
      ...data,
      id: entityId,
      ownerUid: user.uid,
      updatedAt: data.updatedAt ?? Date.now(),
    },
    { merge: true }
  )

  return 'synced'
}
