import { createMMKV } from 'react-native-mmkv'
import type { MMKV } from 'react-native-mmkv'

export const storage: MMKV = createMMKV({ id: 'nutritrack-storage' })

export const StorageKeys = {
  LAST_USED_PRODUCTS: 'last_used_products',
  THEME: 'theme',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  USER_CALORIE_GOAL: 'user_calorie_goal',
} as const

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys]

export const storageUtils = {
  getLastUsedProducts: (): string[] => {
    const raw = storage.getString(StorageKeys.LAST_USED_PRODUCTS)
    if (!raw) return []
    try {
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  },

  setLastUsedProducts: (productIds: string[]) => {
    storage.set(StorageKeys.LAST_USED_PRODUCTS, JSON.stringify(productIds.slice(0, 10)))
  },

  addLastUsedProduct: (productId: string) => {
    const current = storageUtils.getLastUsedProducts()
    const updated = [productId, ...current.filter((id) => id !== productId)].slice(0, 10)
    storageUtils.setLastUsedProducts(updated)
  },

  getTheme: (): 'light' | 'dark' | 'system' => {
    return (storage.getString(StorageKeys.THEME) as 'light' | 'dark' | 'system') ?? 'system'
  },

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    storage.set(StorageKeys.THEME, theme)
  },

  isOnboardingCompleted: (): boolean => {
    return storage.getBoolean(StorageKeys.ONBOARDING_COMPLETED) ?? false
  },

  setOnboardingCompleted: (completed: boolean) => {
    storage.set(StorageKeys.ONBOARDING_COMPLETED, completed)
  },
}
