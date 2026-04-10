import { typedStorage } from '@/lib/storage'

const FS_TOKEN_URL = 'https://oauth.fatsecret.com/connect/token'
const FS_API_URL = 'https://platform.fatsecret.com/rest'

const CLIENT_ID = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET ?? ''

/** Bumped when token scope logic changes (invalidates old basic-only tokens). */
const TOKEN_CACHE_KEY = 'fatsecret:token:v3'
const DAILY_COUNT_KEY = 'fatsecret:daily_count'
const DAILY_DATE_KEY = 'fatsecret:daily_date'
const DAILY_SOFT_LIMIT = 4500

// Locale settings for Belarus (Russian language, BY region)
const FS_LANGUAGE = 'ru'
const FS_REGION = 'by'

/** Remember API capability for this app session (Basic tier has no barcode / premier). */
let fatSecretBarcodeScopeUnavailable = false
/** After HTTP error 12, pause calls to avoid burning quota and log spam. */
let fatSecretBackoffUntil = 0
const FATSECRET_BACKOFF_MS = 120_000

function isFatSecretInBackoff(): boolean {
  return Date.now() < fatSecretBackoffUntil
}

function noteFatSecretRateLimitFromMessage(message: string): void {
  if (/\b12\b/.test(message) && /too many/i.test(message)) {
    fatSecretBackoffUntil = Date.now() + FATSECRET_BACKOFF_MS
  }
}

interface TokenCache {
  accessToken: string
  expiresAt: number
}

function encodeBase64(input: string): string {
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(input)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let output = ''
  let i = 0
  while (i < input.length) {
    const a = input.charCodeAt(i++) || 0
    const b = input.charCodeAt(i++) || 0
    const c = input.charCodeAt(i++) || 0
    const triple = (a << 16) | (b << 8) | c
    output += chars[(triple >> 18) & 0x3f]
    output += chars[(triple >> 12) & 0x3f]
    output += i - 2 < input.length ? chars[(triple >> 6) & 0x3f] : '='
    output += i - 1 < input.length ? chars[triple & 0x3f] : '='
  }
  return output
}

export interface FatSecretServing {
  serving_id: string
  serving_description: string
  metric_serving_amount: string
  metric_serving_unit: string
  calories: string
  protein: string
  fat: string
  carbohydrate: string
  fiber?: string
  sugar?: string
  sodium?: string
  is_default?: string
}

export interface FatSecretFood {
  food_id: string
  food_name: string
  brand_name?: string
  food_type: 'Brand' | 'Generic'
  food_url: string
  servings: {
    serving: FatSecretServing | FatSecretServing[]
  }
}

export interface FatSecretSearchResult {
  food_id: string
  food_name: string
  brand_name?: string
  food_type: 'Brand' | 'Generic'
  /** v1 search only; v2/v3 may omit — build from servings in mapRawFoodToSearchResult */
  food_description?: string
}

// ────── Token management ──────

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('FatSecret credentials not configured')
  }

  const cached = typedStorage.getJson<TokenCache | null>(TOKEN_CACHE_KEY, null)
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken
  }

  const rawCredentials = `${CLIENT_ID}:${CLIENT_SECRET}`
  const credentials = encodeBase64(rawCredentials)
  const res = await fetch(FS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    // Omit scope: FatSecret returns every scope your app is allowed (basic + barcode + premier, etc.)
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error(`FatSecret auth failed: ${res.status}`)

  const data = (await res.json()) as { access_token: string; expires_in: number }
  const tokenCache: TokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  typedStorage.setJson<TokenCache>(TOKEN_CACHE_KEY, tokenCache)
  return data.access_token
}

// ────── Rate limiting ──────

function checkAndIncrementDailyCount(): boolean {
  const today = new Date().toISOString().slice(0, 10)
  const storedDate = typedStorage.getString(DAILY_DATE_KEY)

  if (storedDate !== today) {
    typedStorage.setString(DAILY_DATE_KEY, today)
    typedStorage.setNumber(DAILY_COUNT_KEY, 1)
    return true
  }

  const count = typedStorage.getNumber(DAILY_COUNT_KEY, 0)
  if (count >= DAILY_SOFT_LIMIT) return false
  typedStorage.setNumber(DAILY_COUNT_KEY, count + 1)
  return true
}

export function getDailyUsage(): { count: number; limit: number; date: string } {
  const today = new Date().toISOString().slice(0, 10)
  const storedDate = typedStorage.getString(DAILY_DATE_KEY)
  const count = storedDate === today ? typedStorage.getNumber(DAILY_COUNT_KEY, 0) : 0
  return { count, limit: DAILY_SOFT_LIMIT, date: today }
}

// ────── API helpers ──────

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (isFatSecretInBackoff()) {
    throw new Error('FatSecret: 12 backing off locally')
  }
  if (!checkAndIncrementDailyCount()) {
    throw new Error('FatSecret daily limit reached')
  }

  const token = await getAccessToken()
  const qs = new URLSearchParams({ ...params, format: 'json' }).toString()
  const res = await fetch(`${FS_API_URL}${path}?${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) throw new Error(`FatSecret API error: ${res.status}`)
  const data = (await res.json()) as T & {
    error?: { code?: string; message?: string }
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    const e = data.error
    const msg = `${e.code ?? '?'} ${e.message ?? ''}`
    noteFatSecretRateLimitFromMessage(msg)
    throw new Error(`FatSecret: ${msg}`)
  }
  return data as T
}

function mapRawFoodToSearchResult(raw: Record<string, unknown>): FatSecretSearchResult {
  const servingBlock = raw.servings as { serving?: unknown } | undefined
  let desc = typeof raw.food_description === 'string' ? raw.food_description : ''
  if (!desc && servingBlock?.serving) {
    const sraw = servingBlock.serving
    const arr = Array.isArray(sraw) ? sraw : [sraw]
    const s = arr[0] as Record<string, string> | undefined
    if (s?.calories) {
      desc = `Calories: ${s.calories}kcal | Protein: ${s.protein ?? '0'}g | Fat: ${s.fat ?? '0'}g | Carbs: ${s.carbohydrate ?? '0'}g`
    }
  }
  return {
    food_id: String(raw.food_id ?? ''),
    food_name: String(raw.food_name ?? ''),
    brand_name: raw.brand_name != null ? String(raw.brand_name) : undefined,
    food_type: (raw.food_type === 'Brand' ? 'Brand' : 'Generic') as 'Brand' | 'Generic',
    food_description: desc || undefined,
  }
}

function shouldStopFatSecretSearchRetries(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const m = err.message
  return /\b21\b/.test(m) && m.includes('Invalid IP')
}

/** v2/v3 search need `premier` scope — Basic keys only have `basic`, so skip remaining premier endpoints. */
function isPremierScopeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const m = err.message
  return /\b14\b/.test(m) && m.includes('premier')
}

function isBarcodeScopeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const m = err.message
  return /\b14\b/.test(m) && m.includes('barcode')
}

function isLocalBackoffError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.message.includes('backing off locally')
}

/** v3/v2: foods_search.results.food — v1: foods.food */
function extractSearchFoodItems(data: unknown): FatSecretSearchResult[] {
  if (!data || typeof data !== 'object') return []
  const d = data as Record<string, unknown>

  const fs = d.foods_search as Record<string, unknown> | undefined
  if (fs?.results && typeof fs.results === 'object') {
    const results = fs.results as { food?: unknown }
    const raw = results.food
    if (raw === undefined || raw === null) return []
    const list = Array.isArray(raw) ? raw : [raw]
    return list
      .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
      .map(mapRawFoodToSearchResult)
  }

  const foods = d.foods as Record<string, unknown> | undefined
  if (foods?.food !== undefined && foods?.food !== null) {
    const raw = foods.food
    const list = Array.isArray(raw) ? raw : [raw]
    return list
      .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
      .map(mapRawFoodToSearchResult)
  }

  return []
}

// ────── Public API ──────

export async function fsFindByBarcode(barcode: string): Promise<FatSecretFood | null> {
  if (fatSecretBarcodeScopeUnavailable || isFatSecretInBackoff()) {
    return null
  }

  const gtin13 = barcode.padStart(13, '0')
  const paramsBy: Record<string, string> = {
    barcode: gtin13,
    flag_default_serving: 'true',
    language: FS_LANGUAGE,
    region: FS_REGION,
  }
  const paramsGlobal: Record<string, string> = {
    barcode: gtin13,
    flag_default_serving: 'true',
    language: FS_LANGUAGE,
  }

  let logged = false

  const attempt = async (
    label: string,
    extra: Record<string, string>
  ): Promise<FatSecretFood | null> => {
    try {
      const data = await get<{ food?: FatSecretFood }>('/food/barcode/find-by-id/v2', extra)
      return data.food ?? null
    } catch (err) {
      if (!logged && !isLocalBackoffError(err)) {
        // eslint-disable-next-line no-console
        console.warn(`[fatsecret] barcode ${label} failed:`, err)
        logged = true
      }
      if (isBarcodeScopeError(err)) {
        fatSecretBarcodeScopeUnavailable = true
      }
      return null
    }
  }

  const primary = await attempt('lookup', paramsBy)
  if (primary) return primary
  if (fatSecretBarcodeScopeUnavailable) return null

  return await attempt('fallback', paramsGlobal)
}

export async function fsSearchFoods(
  query: string,
  page = 0,
  maxResults = 20
): Promise<FatSecretSearchResult[]> {
  if (!query.trim()) return []
  if (isFatSecretInBackoff()) {
    return []
  }
  const base = {
    search_expression: query.trim(),
    page_number: String(page),
    max_results: String(maxResults),
  }

  const attempts: Array<{ path: string; extra: Record<string, string> }> = [
    { path: '/foods/search/v3', extra: { ...base, language: FS_LANGUAGE, region: FS_REGION } },
    { path: '/foods/search/v3', extra: { ...base, language: FS_LANGUAGE } },
    { path: '/foods/search/v3', extra: { ...base } },
    { path: '/foods/search/v2', extra: { ...base, language: FS_LANGUAGE, region: FS_REGION } },
    { path: '/foods/search/v2', extra: { ...base } },
    { path: '/foods/search/v1', extra: { ...base } },
  ]

  let logged = false
  let premierUnavailable = false

  for (const { path, extra } of attempts) {
    if (premierUnavailable && (path.includes('/v3') || path.includes('/v2'))) {
      continue
    }
    try {
      const data = await get<unknown>(path, extra)
      const items = extractSearchFoodItems(data)
      if (items.length > 0) return items
    } catch (err) {
      if (!logged && !isLocalBackoffError(err)) {
        // eslint-disable-next-line no-console
        console.warn(`[fatsecret] search ${path} failed:`, err)
        logged = true
      }
      if (isLocalBackoffError(err)) break
      if (shouldStopFatSecretSearchRetries(err)) break
      if (isPremierScopeError(err)) premierUnavailable = true
    }
  }
  return []
}

export async function fsGetFood(foodId: string): Promise<FatSecretFood | null> {
  if (isFatSecretInBackoff()) {
    return null
  }
  try {
    const data = await get<{ food?: FatSecretFood }>('/food/v5', {
      food_id: foodId,
      language: FS_LANGUAGE,
      region: FS_REGION,
    })
    if (data.food) return data.food
  } catch (err) {
    if (!isLocalBackoffError(err)) {
      // eslint-disable-next-line no-console
      console.warn('[fatsecret] food v5 BY failed:', err)
    }
  }
  try {
    const data = await get<{ food?: FatSecretFood }>('/food/v5', {
      food_id: foodId,
      language: FS_LANGUAGE,
    })
    return data.food ?? null
  } catch (err) {
    if (!isLocalBackoffError(err)) {
      // eslint-disable-next-line no-console
      console.warn('[fatsecret] food v5 failed:', err)
    }
    return null
  }
}

export const isFatSecretConfigured = Boolean(CLIENT_ID && CLIENT_SECRET)
