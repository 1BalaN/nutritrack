import { STORAGE_KEYS } from './keys'
import { typedStorage } from './typed-storage'

export type Theme = 'light' | 'dark' | 'system'
export type AddFoodTab = 'search' | 'recent' | 'recipes'
export type AnalyticsPeriod = '7d' | '30d' | '90d'

const MAX_LAST_USED = 15

export const appStorage = {
  // ─── Last used products ──────────────────────────────────────────────────

  getLastUsedProducts(): string[] {
    return typedStorage.getJson<string[]>(STORAGE_KEYS.LAST_USED_PRODUCTS, [])
  },

  setLastUsedProducts(ids: string[]): void {
    typedStorage.setJson(STORAGE_KEYS.LAST_USED_PRODUCTS, ids.slice(0, MAX_LAST_USED))
  },

  addLastUsedProduct(productId: string): void {
    const current = this.getLastUsedProducts()
    const updated = [productId, ...current.filter((id) => id !== productId)].slice(0, MAX_LAST_USED)
    this.setLastUsedProducts(updated)
  },

  clearLastUsedProducts(): void {
    typedStorage.remove(STORAGE_KEYS.LAST_USED_PRODUCTS)
  },

  // ─── Onboarding ──────────────────────────────────────────────────────────

  isOnboardingCompleted(): boolean {
    return typedStorage.getBoolean(STORAGE_KEYS.ONBOARDING_COMPLETED, false)
  },

  setOnboardingCompleted(value: boolean): void {
    typedStorage.setBoolean(STORAGE_KEYS.ONBOARDING_COMPLETED, value)
  },

  // ─── Theme ───────────────────────────────────────────────────────────────

  getTheme(): Theme {
    const raw = typedStorage.getString(STORAGE_KEYS.THEME)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
    return 'system'
  },

  setTheme(theme: Theme): void {
    typedStorage.setString(STORAGE_KEYS.THEME, theme)
  },

  // ─── UI flags ────────────────────────────────────────────────────────────

  isDiaryCompactMode(): boolean {
    return typedStorage.getBoolean(STORAGE_KEYS.DIARY_COMPACT_MODE, false)
  },

  setDiaryCompactMode(value: boolean): void {
    typedStorage.setBoolean(STORAGE_KEYS.DIARY_COMPACT_MODE, value)
  },

  getAddFoodLastTab(): AddFoodTab {
    const raw = typedStorage.getString(STORAGE_KEYS.ADD_FOOD_LAST_TAB)
    if (raw === 'search' || raw === 'recent' || raw === 'recipes') return raw
    return 'recent'
  },

  setAddFoodLastTab(tab: AddFoodTab): void {
    typedStorage.setString(STORAGE_KEYS.ADD_FOOD_LAST_TAB, tab)
  },

  getAnalyticsPeriod(): AnalyticsPeriod {
    const raw = typedStorage.getString(STORAGE_KEYS.ANALYTICS_PERIOD)
    if (raw === '7d' || raw === '30d' || raw === '90d') return raw
    return '7d'
  },

  setAnalyticsPeriod(period: AnalyticsPeriod): void {
    typedStorage.setString(STORAGE_KEYS.ANALYTICS_PERIOD, period)
  },

  // ─── Sync meta ───────────────────────────────────────────────────────────

  getLastSyncedAt(): number | null {
    const val = typedStorage.getNumber(STORAGE_KEYS.LAST_SYNCED_AT, 0)
    return val === 0 ? null : val
  },

  setLastSyncedAt(ts: number): void {
    typedStorage.setNumber(STORAGE_KEYS.LAST_SYNCED_AT, ts)
  },

  isSyncEnabled(): boolean {
    return typedStorage.getBoolean(STORAGE_KEYS.SYNC_ENABLED, true)
  },

  setSyncEnabled(value: boolean): void {
    typedStorage.setBoolean(STORAGE_KEYS.SYNC_ENABLED, value)
  },

  // ─── Misc ─────────────────────────────────────────────────────────────────

  getSelectedDate(): string | null {
    return typedStorage.getString(STORAGE_KEYS.SELECTED_DATE) ?? null
  },

  setSelectedDate(date: string): void {
    typedStorage.setString(STORAGE_KEYS.SELECTED_DATE, date)
  },
}
