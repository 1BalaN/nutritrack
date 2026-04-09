import { eq, like, desc, asc } from 'drizzle-orm'
import { db } from '../client'
import { products } from '../schema'
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
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.barcode, barcode))
      .limit(1)
    return rows[0] ? toProduct(rows[0]) : null
  },

  async search(query: string, limit = 30): Promise<Product[]> {
    const rows = await db
      .select()
      .from(products)
      .where(like(products.name, `%${query}%`))
      .orderBy(asc(products.name))
      .limit(limit)
    return rows.map(toProduct)
  },

  async findRecent(limit = 20): Promise<Product[]> {
    const rows = await db
      .select()
      .from(products)
      .orderBy(desc(products.updatedAt))
      .limit(limit)
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
      createdAt: ts,
      updatedAt: ts,
    }
    await db.insert(products).values(row)
    return toProduct(row)
  },

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const ts = now()
    await db
      .update(products)
      .set({ ...input, updatedAt: ts })
      .where(eq(products.id, id))
    return this.findById(id)
  },

  async delete(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id))
  },

  async upsertMany(items: Product[]): Promise<void> {
    if (items.length === 0) return
    await db.insert(products).values(items).onConflictDoUpdate({
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
        updatedAt: sql`excluded.updated_at`,
      },
    })
  },
}

import { sql } from 'drizzle-orm'
