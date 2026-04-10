import {
  fsFindByBarcode,
  fsSearchFoods,
  fsGetFood,
  isFatSecretConfigured,
} from '@/lib/api/fatsecret.client'
import type { FatSecretFood, FatSecretServing, FatSecretSearchResult } from '@/lib/api'
import type { CreateProductInput } from '@/types'

// ────── Serving normalization ──────

function getServingsArray(food: FatSecretFood): FatSecretServing[] {
  const raw = food.servings.serving
  return Array.isArray(raw) ? raw : [raw]
}

/**
 * Find the best serving for 100g normalization:
 * 1. Prefer serving with metric_serving_amount ≈ 100 and unit 'g'
 * 2. Otherwise use any gram-based serving and scale
 * 3. Fallback to default or first serving (ml ≈ g for water-based drinks)
 */
function findBestServing(servings: FatSecretServing[]): FatSecretServing | null {
  if (servings.length === 0) return null

  // Exact 100g serving
  const exact100g = servings.find(
    (s) =>
      s.metric_serving_unit?.toLowerCase() === 'g' &&
      Math.abs(parseFloat(s.metric_serving_amount) - 100) < 0.1
  )
  if (exact100g) return exact100g

  // Any gram-based serving
  const gramServing = servings.find((s) => s.metric_serving_unit?.toLowerCase() === 'g')
  if (gramServing) return gramServing

  // ml-based (liquids: 100ml ≈ 100g for most drinks)
  const mlServing = servings.find((s) => s.metric_serving_unit?.toLowerCase() === 'ml')
  if (mlServing) return mlServing

  // Default marked serving
  const defaultServing = servings.find((s) => s.is_default === '1')
  if (defaultServing) return defaultServing

  return servings[0]
}

/** Normalize per-serving macros → per 100g */
function normalizeTo100g(serving: FatSecretServing): {
  kcalPer100g: number
  protein: number
  fat: number
  carbs: number
  fiber: number | null
  sugar: number | null
  sodium: number | null
} {
  const amount = parseFloat(serving.metric_serving_amount) || 100
  const factor = 100 / amount

  const f = (v: string | undefined) => (v ? parseFloat(v) * factor : null)

  return {
    kcalPer100g: parseFloat(serving.calories) * factor,
    protein: parseFloat(serving.protein) * factor,
    fat: parseFloat(serving.fat) * factor,
    carbs: parseFloat(serving.carbohydrate) * factor,
    fiber: f(serving.fiber),
    sugar: f(serving.sugar),
    sodium: serving.sodium ? parseFloat(serving.sodium) * factor : null,
  }
}

export function fsNormalizeFood(food: FatSecretFood): CreateProductInput | null {
  const servings = getServingsArray(food)
  const serving = findBestServing(servings)
  if (!serving) return null

  const macros = normalizeTo100g(serving)
  if (!macros.kcalPer100g || macros.kcalPer100g <= 0) return null

  return {
    name: food.food_name,
    brand: food.brand_name ?? null,
    barcode: null,
    source: 'fatsecret',
    fatsecretId: food.food_id,
    cachedAt: Date.now(),
    ...macros,
  }
}

// ────── Barcode lookup ──────

export async function fsBarcodeToProduct(barcode: string): Promise<CreateProductInput | null> {
  if (!isFatSecretConfigured) return null
  const food = await fsFindByBarcode(barcode)
  if (!food) return null
  const product = fsNormalizeFood(food)
  if (product) {
    product.barcode = barcode
  }
  return product
}

// ────── Online search ──────

export interface FatSecretOnlineResult {
  fatsecretId: string
  name: string
  brand: string | null
  description: string
  type: 'Brand' | 'Generic'
}

export async function fsSearchOnline(query: string): Promise<FatSecretOnlineResult[]> {
  if (!isFatSecretConfigured || !query.trim()) return []
  const results: FatSecretSearchResult[] = await fsSearchFoods(query, 0, 20)
  return results.map((r) => ({
    fatsecretId: r.food_id,
    name: r.food_name,
    brand: r.brand_name ?? null,
    description: r.food_description ?? '',
    type: r.food_type,
  }))
}

/** Fetch full nutrition for a search result and normalize to CreateProductInput */
export async function fsFetchAndNormalize(fatsecretId: string): Promise<CreateProductInput | null> {
  if (!isFatSecretConfigured) return null
  const food = await fsGetFood(fatsecretId)
  if (!food) return null
  return fsNormalizeFood(food)
}
