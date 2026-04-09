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
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
