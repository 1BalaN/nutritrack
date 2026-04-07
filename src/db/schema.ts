import { integer, real, text, sqliteTable } from 'drizzle-orm/sqlite-core'

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'),
  kcalPer100g: real('kcal_per_100g').notNull(),
  protein: real('protein').notNull(),
  fat: real('fat').notNull(),
  carbs: real('carbs').notNull(),
  barcode: text('barcode'),
  source: text('source', { enum: ['local', 'open_food_facts', 'manual'] })
    .notNull()
    .default('manual'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const mealEntries = sqliteTable('meal_entries', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  mealType: text('meal_type', {
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
  }).notNull(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  grams: real('grams').notNull(),
  kcal: real('kcal').notNull(),
  protein: real('protein').notNull(),
  fat: real('fat').notNull(),
  carbs: real('carbs').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  servings: integer('servings').notNull().default(1),
  totalKcal: real('total_kcal').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  grams: real('grams').notNull(),
})

export const userProfile = sqliteTable('user_profile', {
  id: text('id').primaryKey(),
  weight: real('weight'),
  height: real('height'),
  age: integer('age'),
  activityLevel: text('activity_level', {
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
  })
    .notNull()
    .default('moderate'),
  calorieGoal: integer('calorie_goal').notNull().default(2000),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})
