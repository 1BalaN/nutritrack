import { create } from 'zustand'
import type { MealEntry, NutritionSummary } from '@/types'

interface NutritionState {
  selectedDate: string
  pendingChanges: MealEntry[]

  setSelectedDate: (date: string) => void
  addPendingChange: (entry: MealEntry) => void
  clearPendingChanges: () => void
}

const getTodayDate = () => new Date().toISOString().split('T')[0]

export const useNutritionStore = create<NutritionState>((set) => ({
  selectedDate: getTodayDate(),
  pendingChanges: [],

  setSelectedDate: (date) => set({ selectedDate: date }),

  addPendingChange: (entry) => set((prev) => ({ pendingChanges: [...prev.pendingChanges, entry] })),

  clearPendingChanges: () => set({ pendingChanges: [] }),
}))

export function calcNutrition(entries: MealEntry[]): NutritionSummary {
  return entries.reduce(
    (acc, entry) => ({
      kcal: acc.kcal + entry.kcal,
      protein: acc.protein + entry.protein,
      fat: acc.fat + entry.fat,
      carbs: acc.carbs + entry.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  )
}
