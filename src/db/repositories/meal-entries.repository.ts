import { between, eq, desc, inArray, isNull } from 'drizzle-orm'
import { db } from '../client'
import { mealEntries, products } from '../schema'
import { generateId, now } from '../utils'
import { calcNutritionFromGrams } from '@/lib/nutrition'
import type {
  MealEntry,
  CreateMealEntryInput,
  UpdateMealEntryInput,
  NutritionSummary,
} from '@/types'

type MealEntryRow = typeof mealEntries.$inferSelect

function toMealEntry(row: MealEntryRow): MealEntry {
  return {
    id: row.id,
    date: row.date,
    mealType: row.mealType,
    productId: row.productId,
    recipeId: row.recipeId,
    grams: row.grams,
    kcal: row.kcal,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    syncedAt: row.syncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const mealEntriesRepository = {
  async findByDate(date: string): Promise<MealEntry[]> {
    const rows = await db
      .select()
      .from(mealEntries)
      .where(eq(mealEntries.date, date))
      .orderBy(mealEntries.mealType, mealEntries.createdAt)
    return rows.map(toMealEntry)
  },

  async findByDateRange(from: string, to: string): Promise<MealEntry[]> {
    const rows = await db
      .select()
      .from(mealEntries)
      .where(between(mealEntries.date, from, to))
      .orderBy(desc(mealEntries.date), mealEntries.mealType)
    return rows.map(toMealEntry)
  },

  async findById(id: string): Promise<MealEntry | null> {
    const rows = await db.select().from(mealEntries).where(eq(mealEntries.id, id)).limit(1)
    return rows[0] ? toMealEntry(rows[0]) : null
  },

  async findUnsynced(): Promise<MealEntry[]> {
    const rows = await db
      .select()
      .from(mealEntries)
      .where(isNull(mealEntries.syncedAt))
      .orderBy(mealEntries.createdAt)
    return rows.map(toMealEntry)
  },

  async create(input: CreateMealEntryInput): Promise<MealEntry> {
    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1)

    if (!productRows[0]) {
      throw new Error(`Product not found: ${input.productId}`)
    }

    const product = productRows[0]
    const nutrition = calcNutritionFromGrams(product, input.grams)
    const id = generateId()
    const ts = now()

    const row: MealEntryRow = {
      id,
      date: input.date,
      mealType: input.mealType,
      productId: input.productId,
      recipeId: input.recipeId ?? null,
      grams: input.grams,
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      fat: nutrition.fat,
      carbs: nutrition.carbs,
      syncedAt: null,
      createdAt: ts,
      updatedAt: ts,
    }

    await db.insert(mealEntries).values(row)
    return toMealEntry(row)
  },

  async update(id: string, input: UpdateMealEntryInput): Promise<MealEntry | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const ts = now()
    const newGrams = input.grams ?? existing.grams

    if (input.grams !== undefined) {
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.id, existing.productId))
        .limit(1)

      if (productRows[0]) {
        const nutrition = calcNutritionFromGrams(productRows[0], newGrams)
        await db
          .update(mealEntries)
          .set({
            grams: newGrams,
            kcal: nutrition.kcal,
            protein: nutrition.protein,
            fat: nutrition.fat,
            carbs: nutrition.carbs,
            mealType: input.mealType ?? existing.mealType,
            date: input.date ?? existing.date,
            syncedAt: null,
            updatedAt: ts,
          })
          .where(eq(mealEntries.id, id))
      }
    } else {
      await db
        .update(mealEntries)
        .set({
          mealType: input.mealType ?? existing.mealType,
          date: input.date ?? existing.date,
          syncedAt: null,
          updatedAt: ts,
        })
        .where(eq(mealEntries.id, id))
    }

    return this.findById(id)
  },

  async delete(id: string): Promise<void> {
    await db.delete(mealEntries).where(eq(mealEntries.id, id))
  },

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const ts = now()
    await db.update(mealEntries).set({ syncedAt: ts }).where(inArray(mealEntries.id, ids))
  },

  async summarizeByDate(date: string): Promise<NutritionSummary> {
    const entries = await this.findByDate(date)
    return entries.reduce(
      (acc, e) => ({
        kcal: acc.kcal + e.kcal,
        protein: acc.protein + e.protein,
        fat: acc.fat + e.fat,
        carbs: acc.carbs + e.carbs,
      }),
      { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    )
  },

  async deleteByDate(date: string): Promise<void> {
    await db.delete(mealEntries).where(eq(mealEntries.date, date))
  },
}
