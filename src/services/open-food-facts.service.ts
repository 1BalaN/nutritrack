import { productsRepository } from '@/db/repositories'
import type { CreateProductInput } from '@/types'

const SERVERS = ['https://world.openfoodfacts.org', 'https://ru.openfoodfacts.org']

const FIELDS =
  'product_name,product_name_ru,brands,nutriments,serving_size,quantity,categories_tags'

interface OFFNutriments {
  'energy-kcal_100g'?: number
  'energy-kcal'?: number
  proteins_100g?: number
  fat_100g?: number
  carbohydrates_100g?: number
  fiber_100g?: number
  sugars_100g?: number
  sodium_100g?: number
}

interface OFFProductData {
  product_name?: string
  product_name_ru?: string
  brands?: string
  serving_size?: string
  quantity?: string
  nutriments?: OFFNutriments
}

interface OFFResponseV2 {
  status: number
  product?: OFFProductData
}

interface OFFResponseV3 {
  status?: string
  product?: OFFProductData
}

export interface OFFResult {
  found: boolean
  product?: CreateProductInput & { barcode: string }
}

function parseProduct(
  barcode: string,
  p: OFFProductData
): (CreateProductInput & { barcode: string }) | null {
  const n = p.nutriments ?? {}
  const kcal = n['energy-kcal_100g'] ?? (n['energy-kcal'] ? n['energy-kcal'] : undefined)

  if (kcal === undefined && !p.product_name && !p.product_name_ru) return null

  const name = p.product_name_ru?.trim() || p.product_name?.trim() || `Продукт ${barcode.slice(-4)}`

  return {
    name,
    barcode,
    brand: p.brands?.split(',')[0]?.trim() ?? null,
    kcalPer100g: kcal ?? 0,
    protein: n.proteins_100g ?? 0,
    fat: n.fat_100g ?? 0,
    carbs: n.carbohydrates_100g ?? 0,
    fiber: n.fiber_100g ?? null,
    sugar: n.sugars_100g ?? null,
    sodium: n.sodium_100g ? n.sodium_100g * 1000 : null,
    source: 'open_food_facts',
  }
}

async function fetchFromServer(server: string, barcode: string): Promise<OFFProductData | null> {
  // Try v2 first
  try {
    const url = `${server}/api/v2/product/${barcode}.json?fields=${FIELDS}`
    const res = await fetch(url, { headers: { 'User-Agent': 'NutriTrack/1.0' } })
    if (res.ok) {
      const data = (await res.json()) as OFFResponseV2
      if ((data.status === 1 || data.status === 2) && data.product?.product_name) {
        return data.product
      }
    }
  } catch {
    // continue to v3
  }

  // Try v3
  try {
    const url = `${server}/api/v3/product/${barcode}?fields=${FIELDS}`
    const res = await fetch(url, { headers: { 'User-Agent': 'NutriTrack/1.0' } })
    if (res.ok) {
      const data = (await res.json()) as OFFResponseV3
      if (data.status === 'success' && data.product?.product_name) {
        return data.product
      }
    }
  } catch {
    // nothing
  }

  return null
}

export async function lookupBarcode(barcode: string): Promise<OFFResult> {
  const local = await productsRepository.findByBarcode(barcode)
  if (local) return { found: true }

  for (const server of SERVERS) {
    const productData = await fetchFromServer(server, barcode)
    if (productData) {
      const parsed = parseProduct(barcode, productData)
      if (parsed) {
        await productsRepository.create(parsed)
        return { found: true, product: parsed }
      }
    }
  }

  return { found: false }
}
