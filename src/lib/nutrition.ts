import type { Product, NutritionSummary, ActivityLevel } from '@/types'

export function calcNutritionFromGrams(
  product: Pick<Product, 'kcalPer100g' | 'protein' | 'fat' | 'carbs'>,
  grams: number
): NutritionSummary {
  const factor = grams / 100
  if (grams === 0) {
    return { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  }
  return {
    kcal: product.kcalPer100g * factor,
    protein: product.protein * factor,
    fat: product.fat * factor,
    carbs: product.carbs * factor,
  }
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calcBMR(weight: number, height: number, age: number, sex: 'male' | 'female') {
  if (sex === 'male') {
    return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
  }
  return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age
}

export function calcTDEE(
  weight: number,
  height: number,
  age: number,
  sex: 'male' | 'female',
  activityLevel: ActivityLevel
) {
  const bmr = calcBMR(weight, height, age, sex)
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

export function calcDayScore(
  actual: NutritionSummary,
  goal: { kcal: number; protein: number }
): number {
  const kcalAdherence = Math.max(0, 1 - Math.abs(actual.kcal - goal.kcal) / goal.kcal)
  const proteinAdherence = Math.min(1, actual.protein / goal.protein)
  return Math.round((kcalAdherence * 0.6 + proteinAdherence * 0.4) * 100)
}
