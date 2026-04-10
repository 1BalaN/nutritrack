import { typedStorage } from '@/lib/storage'
import { fsBarcodeCacheKey, fsSearchCacheKey } from '@/lib/storage/keys'
import type { CreateProductInput } from '@/types'
import type { FatSecretOnlineResult } from '@/services/fatsecret.service'

const BARCODE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const SEARCH_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry<T> {
  data: T
  storedAt: number
}

function isExpired(storedAt: number, ttl: number): boolean {
  return Date.now() - storedAt > ttl
}

// ────── Barcode cache ──────

export function getBarcodeCache(barcode: string): CreateProductInput | null {
  const entry = typedStorage.getJson<CacheEntry<CreateProductInput> | null>(
    fsBarcodeCacheKey(barcode),
    null
  )
  if (!entry || isExpired(entry.storedAt, BARCODE_TTL_MS)) return null
  return entry.data
}

export function setBarcodeCache(barcode: string, product: CreateProductInput): void {
  typedStorage.setJson<CacheEntry<CreateProductInput>>(fsBarcodeCacheKey(barcode), {
    data: product,
    storedAt: Date.now(),
  })
}

export function clearBarcodeCache(barcode: string): void {
  typedStorage.remove(fsBarcodeCacheKey(barcode))
}

// ────── Search cache ──────

export function getSearchCache(query: string): FatSecretOnlineResult[] | null {
  const entry = typedStorage.getJson<CacheEntry<FatSecretOnlineResult[]> | null>(
    fsSearchCacheKey(query),
    null
  )
  if (!entry || isExpired(entry.storedAt, SEARCH_TTL_MS)) return null
  return entry.data
}

export function setSearchCache(query: string, results: FatSecretOnlineResult[]): void {
  typedStorage.setJson<CacheEntry<FatSecretOnlineResult[]>>(fsSearchCacheKey(query), {
    data: results,
    storedAt: Date.now(),
  })
}
