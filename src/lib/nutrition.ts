import type { Product, NutritionSummary, ActivityLevel } from '@/types'

export function calcNutritionFromGrams(
  product: Pick<Product, 'kcalPer100g' | 'protein' | 'fat' | 'carbs'>,
  grams: number
): NutritionSummary {
  const factor = grams / 100
  return {
    kcal: Math.round(product.kcalPer100g * factor * 10) / 10,
    protein: Math.round(product.protein * factor * 10) / 10,
    fat: Math.round(product.fat * factor * 10) / 10,
    carbs: Math.round(product.carbs * factor * 10) / 10,
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
