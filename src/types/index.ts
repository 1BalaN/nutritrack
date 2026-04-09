export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export type ProductSource = 'local' | 'open_food_facts' | 'manual'

export type Sex = 'male' | 'female'

export type SyncOperation = 'create' | 'update' | 'delete'

export type SyncEntityType = 'meal_entry' | 'recipe' | 'product' | 'user_profile'

export interface Product {
  id: string
  name: string
  brand: string | null
  kcalPer100g: number
  protein: number
  fat: number
  carbs: number
  fiber: number | null
  sugar: number | null
  sodium: number | null
  barcode: string | null
  source: ProductSource
  createdAt: number
  updatedAt: number
}

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateProductInput = Partial<CreateProductInput>

export interface MealEntry {
  id: string
  date: string
  mealType: MealType
  productId: string
  recipeId: string | null
  grams: number
  kcal: number
  protein: number
  fat: number
  carbs: number
  syncedAt: number | null
  createdAt: number
  updatedAt: number
}

export type CreateMealEntryInput = {
  date: string
  mealType: MealType
  productId: string
  recipeId?: string | null
  grams: number
}

export type UpdateMealEntryInput = Partial<
  Pick<MealEntry, 'grams' | 'mealType' | 'date'>
>

export interface RecipeIngredient {
  id: string
  recipeId: string
  productId: string
  grams: number
}

export interface Recipe {
  id: string
  name: string
  servings: number
  totalKcal: number
  totalProtein: number
  totalFat: number
  totalCarbs: number
  syncedAt: number | null
  ingredients: RecipeIngredient[]
  createdAt: number
  updatedAt: number
}

export type CreateRecipeInput = {
  name: string
  servings?: number
  ingredients: Array<{ productId: string; grams: number }>
}

export type UpdateRecipeInput = Partial<
  Pick<Recipe, 'name' | 'servings'>
> & {
  ingredients?: Array<{ productId: string; grams: number }>
}

export interface UserProfile {
  id: string
  weight: number | null
  height: number | null
  age: number | null
  sex: Sex | null
  activityLevel: ActivityLevel
  calorieGoal: number
  proteinGoal: number | null
  fatGoal: number | null
  carbsGoal: number | null
  createdAt: number
  updatedAt: number
}

export type UpdateUserProfileInput = Partial<
  Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
>

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

export interface PendingSync {
  id: string
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperation
  payload: string
  retryCount: number
  createdAt: number
}
