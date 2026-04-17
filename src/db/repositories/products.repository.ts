import { eq, desc, asc, sql } from 'drizzle-orm'
import { db } from '../client'
import { products, recipeIngredients } from '../schema'
import { generateId, now } from '../utils'
import type { CreateProductInput, UpdateProductInput, Product } from '@/types'

export type ProductRow = typeof products.$inferSelect

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    kcalPer100g: row.kcalPer100g,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    fiber: row.fiber,
    sugar: row.sugar,
    sodium: row.sodium,
    barcode: row.barcode,
    source: row.source,
    fatsecretId: row.fatsecretId ?? null,
    cachedAt: row.cachedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const productsRepository = {
  async findAll(): Promise<Product[]> {
    const rows = await db.select().from(products).orderBy(asc(products.name))
    return rows.map(toProduct)
  },

  async findById(id: string): Promise<Product | null> {
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1)
    return rows[0] ? toProduct(rows[0]) : null
  },

  async findByBarcode(barcode: string): Promise<Product | null> {
    const rows = await db.select().from(products).where(eq(products.barcode, barcode)).limit(1)
    return rows[0] ? toProduct(rows[0]) : null
  },

  async findByFatsecretId(fatsecretId: string): Promise<Product | null> {
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.fatsecretId, fatsecretId))
      .limit(1)
    return rows[0] ? toProduct(rows[0]) : null
  },

  async search(query: string, limit = 50): Promise<Product[]> {
    const q = query.trim().toLocaleLowerCase('ru-RU')
    if (!q) return []

    // SQLite LOWER/NOCASE is unreliable for Cyrillic on mobile builds.
    // Use locale-aware filtering in JS to make RU/BY search predictable.
    const rows = await db.select().from(products).orderBy(asc(products.name))
    const filtered = rows
      .filter((row) => {
        const haystack = `${row.name} ${row.brand ?? ''}`.toLocaleLowerCase('ru-RU')
        return haystack.includes(q)
      })
      .slice(0, limit)

    return filtered.map(toProduct)
  },

  async findRecent(limit = 20): Promise<Product[]> {
    const rows = await db.select().from(products).orderBy(desc(products.updatedAt)).limit(limit)
    return rows.map(toProduct)
  },

  async create(input: CreateProductInput): Promise<Product> {
    const id = generateId()
    const ts = now()
    const row: ProductRow = {
      id,
      name: input.name,
      brand: input.brand ?? null,
      kcalPer100g: input.kcalPer100g,
      protein: input.protein,
      fat: input.fat,
      carbs: input.carbs,
      fiber: input.fiber ?? null,
      sugar: input.sugar ?? null,
      sodium: input.sodium ?? null,
      barcode: input.barcode ?? null,
      source: input.source,
      fatsecretId: input.fatsecretId ?? null,
      cachedAt: input.cachedAt ?? null,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.insert(products).values(row)
    return toProduct(row)
  },

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const existing = await this.findById(id)
    if (!existing) return null
    const ts = now()
    await db
      .update(products)
      .set({
        name: input.name ?? existing.name,
        brand: input.brand !== undefined ? input.brand : existing.brand,
        kcalPer100g: input.kcalPer100g ?? existing.kcalPer100g,
        protein: input.protein ?? existing.protein,
        fat: input.fat ?? existing.fat,
        carbs: input.carbs ?? existing.carbs,
        fiber: input.fiber !== undefined ? input.fiber : existing.fiber,
        sugar: input.sugar !== undefined ? input.sugar : existing.sugar,
        sodium: input.sodium !== undefined ? input.sodium : existing.sodium,
        barcode: input.barcode !== undefined ? input.barcode : existing.barcode,
        source: input.source ?? existing.source,
        fatsecretId: input.fatsecretId !== undefined ? input.fatsecretId : existing.fatsecretId,
        cachedAt: input.cachedAt !== undefined ? input.cachedAt : existing.cachedAt,
        updatedAt: ts,
      })
      .where(eq(products.id, id))
    return this.findById(id)
  },

  /** Recipe ingredients reference this product — block delete until user adjusts recipes. */
  async countRecipeIngredientRefs(productId: string): Promise<number> {
    const rows = await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.productId, productId))
    return rows.length
  },

  async delete(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id))
  },

  async restore(product: Product): Promise<void> {
    const row: ProductRow = {
      id: product.id,
      name: product.name,
      brand: product.brand ?? null,
      kcalPer100g: product.kcalPer100g,
      protein: product.protein,
      fat: product.fat,
      carbs: product.carbs,
      fiber: product.fiber ?? null,
      sugar: product.sugar ?? null,
      sodium: product.sodium ?? null,
      barcode: product.barcode ?? null,
      source: product.source,
      fatsecretId: product.fatsecretId ?? null,
      cachedAt: product.cachedAt ?? null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }
    await db.insert(products).values(row)
  },

  async upsertMany(items: Product[]): Promise<void> {
    if (items.length === 0) return
    await db
      .insert(products)
      .values(items)
      .onConflictDoUpdate({
        target: products.id,
        set: {
          name: sql`excluded.name`,
          brand: sql`excluded.brand`,
          kcalPer100g: sql`excluded.kcal_per_100g`,
          protein: sql`excluded.protein`,
          fat: sql`excluded.fat`,
          carbs: sql`excluded.carbs`,
          fiber: sql`excluded.fiber`,
          sugar: sql`excluded.sugar`,
          sodium: sql`excluded.sodium`,
          barcode: sql`excluded.barcode`,
          source: sql`excluded.source`,
          fatsecretId: sql`excluded.fatsecret_id`,
          cachedAt: sql`excluded.cached_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
  },
}
