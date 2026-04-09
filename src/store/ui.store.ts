import { create } from 'zustand'

interface UIState {
  isAddFoodModalOpen: boolean
  isOnboardingCompleted: boolean

  openAddFoodModal: () => void
  closeAddFoodModal: () => void
  setOnboardingCompleted: (completed: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isAddFoodModalOpen: false,
  isOnboardingCompleted: false,

  openAddFoodModal: () => set({ isAddFoodModalOpen: true }),
  closeAddFoodModal: () => set({ isAddFoodModalOpen: false }),
  setOnboardingCompleted: (completed) => set({ isOnboardingCompleted: completed }),
}))
