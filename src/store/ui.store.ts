import { create } from 'zustand'
import { appStorage } from '@/lib/storage'

interface UIState {
  isAddFoodModalOpen: boolean
  isOnboardingCompleted: boolean
  theme: 'light' | 'dark' | 'system'
  isDiaryCompactMode: boolean

  openAddFoodModal: () => void
  closeAddFoodModal: () => void
  setOnboardingCompleted: (completed: boolean) => void
  setTheme: (theme: UIState['theme']) => void
  setDiaryCompactMode: (value: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isAddFoodModalOpen: false,
  isOnboardingCompleted: appStorage.isOnboardingCompleted(),
  theme: appStorage.getTheme(),
  isDiaryCompactMode: appStorage.isDiaryCompactMode(),

  openAddFoodModal: () => set({ isAddFoodModalOpen: true }),
  closeAddFoodModal: () => set({ isAddFoodModalOpen: false }),
  setOnboardingCompleted: (completed) => {
    appStorage.setOnboardingCompleted(completed)
    set({ isOnboardingCompleted: completed })
  },
  setTheme: (theme) => {
    appStorage.setTheme(theme)
    set({ theme })
  },
  setDiaryCompactMode: (value) => {
    appStorage.setDiaryCompactMode(value)
    set({ isDiaryCompactMode: value })
  },
}))

export const uiSelectors = {
  isAddFoodModalOpen: (s: UIState) => s.isAddFoodModalOpen,
  isOnboardingCompleted: (s: UIState) => s.isOnboardingCompleted,
  theme: (s: UIState) => s.theme,
  isDiaryCompactMode: (s: UIState) => s.isDiaryCompactMode,
}
