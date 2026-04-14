jest.mock('@/lib/auth', () => ({
  ensureAuthenticatedUser: jest.fn(async () => ({ uid: 'user-1' })),
}))

jest.mock('@/lib/firebase', () => ({
  firestore: {},
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_fs: unknown, path: string) => ({ path })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
}))

import { deleteDoc, getDoc, setDoc } from 'firebase/firestore'
import { syncPendingItemToFirebase } from '@/services/firebase-sync.service'

function pendingItem(payload: unknown, operation: 'create' | 'update' | 'delete' = 'update') {
  return {
    id: 'ps-1',
    entityType: 'product' as const,
    entityId: 'prod-1',
    operation,
    payload: JSON.stringify(payload),
    retryCount: 0,
    createdAt: Date.now(),
  }
}

describe('syncPendingItemToFirebase', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('syncs payload when remote doc is missing', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false })
    ;(setDoc as jest.Mock).mockResolvedValue(undefined)

    const result = await syncPendingItemToFirebase(
      pendingItem({ id: 'prod-1', name: 'Chicken', updatedAt: 10 })
    )

    expect(result).toBe('synced')
    expect(setDoc).toHaveBeenCalled()
  })

  it('skips when remote has newer updatedAt', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ id: 'prod-1', updatedAt: 100 }),
    })

    const result = await syncPendingItemToFirebase(
      pendingItem({ id: 'prod-1', name: 'Chicken', updatedAt: 10 })
    )

    expect(result).toBe('skipped')
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('deletes remote document for delete operation', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false })
    ;(deleteDoc as jest.Mock).mockResolvedValue(undefined)

    const result = await syncPendingItemToFirebase(
      pendingItem({ id: 'prod-1', updatedAt: 10 }, 'delete')
    )

    expect(result).toBe('synced')
    expect(deleteDoc).toHaveBeenCalled()
  })
})
