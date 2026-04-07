import { useMemo } from 'react'
import type { MealEntry, NutritionSummary } from '@/types'

export function useNutritionSummary(entries: MealEntry[]): NutritionSummary {
  return useMemo(
    () =>
      entries.reduce(
        (acc, entry) => ({
          kcal: acc.kcal + entry.kcal,
          protein: acc.protein + entry.protein,
          fat: acc.fat + entry.fat,
          carbs: acc.carbs + entry.carbs,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0 }
      ),
    [entries]
  )
}
