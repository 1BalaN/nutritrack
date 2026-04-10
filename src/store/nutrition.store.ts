import { create } from 'zustand'
import type { NutritionSummary } from '@/types'
import { appStorage } from '@/lib/storage'

export interface UndoAction {
  id: string
  label: string
  run: () => Promise<void>
}

interface NutritionState {
  selectedDate: string
  mealTypeFilter: 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
  undoStack: UndoAction[]

  setSelectedDate: (date: string) => void
  setMealTypeFilter: (filter: NutritionState['mealTypeFilter']) => void
  pushUndoAction: (action: UndoAction) => void
  popUndoAction: () => UndoAction | null
  clearUndoStack: () => void
}

const getTodayDate = () => new Date().toISOString().split('T')[0]
const defaultDate = appStorage.getSelectedDate() ?? getTodayDate()

export const useNutritionStore = create<NutritionState>((set, get) => ({
  selectedDate: defaultDate,
  mealTypeFilter: 'all',
  undoStack: [],

  setSelectedDate: (date) => {
    appStorage.setSelectedDate(date)
    set({ selectedDate: date })
  },

  setMealTypeFilter: (filter) => set({ mealTypeFilter: filter }),

  pushUndoAction: (action) =>
    set((prev) => ({
      undoStack: [action, ...prev.undoStack].slice(0, 20),
    })),

  popUndoAction: () => {
    const [latest, ...rest] = get().undoStack
    set({ undoStack: rest })
    return latest ?? null
  },

  clearUndoStack: () => set({ undoStack: [] }),
}))

export const nutritionSelectors = {
  selectedDate: (s: NutritionState) => s.selectedDate,
  mealTypeFilter: (s: NutritionState) => s.mealTypeFilter,
  canUndo: (s: NutritionState) => s.undoStack.length > 0,
}

export function calcNutrition(
  entries: Array<Pick<NutritionSummary, 'kcal' | 'protein' | 'fat' | 'carbs'>>
) {
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
