import { eq } from 'drizzle-orm'
import { db } from '../client'
import { userProfile } from '../schema'
import { now } from '../utils'
import { calcTDEE } from '@/lib/nutrition'
import type { UserProfile, UpdateUserProfileInput } from '@/types'

const SINGLETON_ID = 'local_user'

type UserProfileRow = typeof userProfile.$inferSelect

function toUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    weight: row.weight,
    height: row.height,
    age: row.age,
    sex: row.sex,
    activityLevel: row.activityLevel,
    calorieGoal: row.calorieGoal,
    proteinGoal: row.proteinGoal,
    fatGoal: row.fatGoal,
    carbsGoal: row.carbsGoal,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const userProfileRepository = {
  async get(): Promise<UserProfile | null> {
    const rows = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.id, SINGLETON_ID))
      .limit(1)
    return rows[0] ? toUserProfile(rows[0]) : null
  },

  async getOrCreate(): Promise<UserProfile> {
    const existing = await this.get()
    if (existing) return existing

    const ts = now()
    const row: UserProfileRow = {
      id: SINGLETON_ID,
      weight: null,
      height: null,
      age: null,
      sex: null,
      activityLevel: 'moderate',
      calorieGoal: 2000,
      proteinGoal: null,
      fatGoal: null,
      carbsGoal: null,
      createdAt: ts,
      updatedAt: ts,
    }

    await db.insert(userProfile).values(row)
    return toUserProfile(row)
  },

  async update(input: UpdateUserProfileInput): Promise<UserProfile> {
    const existing = await this.getOrCreate()
    const ts = now()

    const patch: Partial<UserProfileRow> = { ...input, updatedAt: ts }

    if (
      input.weight !== undefined ||
      input.height !== undefined ||
      input.age !== undefined ||
      input.sex !== undefined ||
      input.activityLevel !== undefined
    ) {
      const w = input.weight ?? existing.weight
      const h = input.height ?? existing.height
      const a = input.age ?? existing.age
      const s = input.sex ?? existing.sex
      const al = input.activityLevel ?? existing.activityLevel

      if (w && h && a && s) {
        patch.calorieGoal = input.calorieGoal ?? calcTDEE(w, h, a, s, al)
      }
    }

    await db.update(userProfile).set(patch).where(eq(userProfile.id, SINGLETON_ID))

    const updated = await this.get()
    if (!updated) throw new Error('Failed to update user profile')
    return updated
  },

  async reset(): Promise<void> {
    await db.delete(userProfile).where(eq(userProfile.id, SINGLETON_ID))
    await this.getOrCreate()
  },
}
