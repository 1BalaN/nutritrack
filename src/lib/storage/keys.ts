export const STORAGE_KEYS = {
  // User
  LAST_USED_PRODUCTS: 'last_used_products',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SELECTED_DATE: 'selected_date',

  // Appearance
  THEME: 'theme',

  // UI flags
  DIARY_COMPACT_MODE: 'diary_compact_mode',
  ADD_FOOD_LAST_TAB: 'add_food_last_tab',
  ANALYTICS_PERIOD: 'analytics_period',

  // Sync
  LAST_SYNCED_AT: 'last_synced_at',
  SYNC_ENABLED: 'sync_enabled',

  // FatSecret API
  FATSECRET_TOKEN: 'fatsecret:token',
  FATSECRET_DAILY_COUNT: 'fatsecret:daily_count',
  FATSECRET_DAILY_DATE: 'fatsecret:daily_date',
} as const

// Prefix-based keys (dynamic, not listed in STORAGE_KEYS)
export const fsBarcodeCacheKey = (barcode: string) => `fatsecret:bc:${barcode}`
export const fsSearchCacheKey = (query: string) =>
  `fatsecret:search:${query.toLowerCase().trim()}`

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
