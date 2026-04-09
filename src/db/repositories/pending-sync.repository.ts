import { and, eq, asc } from 'drizzle-orm'
import { db } from '../client'
import { pendingSync } from '../schema'
import { generateId, now } from '../utils'
import type { PendingSync, SyncEntityType, SyncOperation } from '@/types'

type PendingSyncRow = typeof pendingSync.$inferSelect

function toPendingSync(row: PendingSyncRow): PendingSync {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    operation: row.operation,
    payload: row.payload,
    retryCount: row.retryCount,
    createdAt: row.createdAt,
  }
}

export const pendingSyncRepository = {
  async findAll(): Promise<PendingSync[]> {
    const rows = await db
      .select()
      .from(pendingSync)
      .orderBy(asc(pendingSync.createdAt))
    return rows.map(toPendingSync)
  },

  async findByEntity(
    entityType: SyncEntityType,
    entityId: string
  ): Promise<PendingSync[]> {
    const rows = await db
      .select()
      .from(pendingSync)
      .where(and(eq(pendingSync.entityType, entityType), eq(pendingSync.entityId, entityId)))
    return rows.map(toPendingSync)
  },

  async enqueue(
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperation,
    payload: unknown
  ): Promise<PendingSync> {
    const id = generateId()
    const ts = now()
    const row: PendingSyncRow = {
      id,
      entityType,
      entityId,
      operation,
      payload: JSON.stringify(payload),
      retryCount: 0,
      createdAt: ts,
    }
    await db.insert(pendingSync).values(row)
    return toPendingSync(row)
  },

  async incrementRetry(id: string): Promise<void> {
    const rows = await db
      .select()
      .from(pendingSync)
      .where(eq(pendingSync.id, id))
      .limit(1)
    if (!rows[0]) return
    await db
      .update(pendingSync)
      .set({ retryCount: rows[0].retryCount + 1 })
      .where(eq(pendingSync.id, id))
  },

  async delete(id: string): Promise<void> {
    await db.delete(pendingSync).where(eq(pendingSync.id, id))
  },

  async deleteByEntity(entityType: SyncEntityType, entityId: string): Promise<void> {
    await db
      .delete(pendingSync)
      .where(
        and(
          eq(pendingSync.entityType, entityType),
          eq(pendingSync.entityId, entityId)
        )
      )
  },

  async count(): Promise<number> {
    const rows = await db.select().from(pendingSync)
    return rows.length
  },
}
