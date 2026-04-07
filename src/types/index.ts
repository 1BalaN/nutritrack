export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export type ProductSource = 'local' | 'open_food_facts' | 'manual'

export interface Product {
  id: string
  name: string
  brand: string | null
  kcalPer100g: number
  protein: number
  fat: number
  carbs: number
  barcode: string | null
  source: ProductSource
  createdAt: number
  updatedAt: number
}

export interface MealEntry {
  id: string
  date: string
  mealType: MealType
  productId: string
  grams: number
  kcal: number
  protein: number
  fat: number
  carbs: number
  createdAt: number
  updatedAt: number
}

export interface RecipeIngredient {
  productId: string
  grams: number
}

export interface Recipe {
  id: string
  name: string
  servings: number
  totalKcal: number
  ingredients: RecipeIngredient[]
  createdAt: number
  updatedAt: number
}

export interface UserProfile {
  id: string
  weight: number | null
  height: number | null
  age: number | null
  activityLevel: ActivityLevel
  calorieGoal: number
  createdAt: number
  updatedAt: number
}

export interface NutritionSummary {
  kcal: number
  protein: number
  fat: number
  carbs: number
}

export interface DayScore {
  score: number
  kcalAdherence: number
  proteinAdherence: number
}
