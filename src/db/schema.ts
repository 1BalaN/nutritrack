import { index, integer, real, text, sqliteTable } from 'drizzle-orm/sqlite-core'

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    brand: text('brand'),
    kcalPer100g: real('kcal_per_100g').notNull(),
    protein: real('protein').notNull(),
    fat: real('fat').notNull(),
    carbs: real('carbs').notNull(),
    barcode: text('barcode').unique(),
    source: text('source', { enum: ['local', 'open_food_facts', 'manual'] })
      .notNull()
      .default('manual'),
    fiber: real('fiber'),
    sugar: real('sugar'),
    sodium: real('sodium'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('idx_products_name').on(t.name),
    index('idx_products_barcode').on(t.barcode),
    index('idx_products_source').on(t.source),
  ]
)

export const mealEntries = sqliteTable(
  'meal_entries',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    mealType: text('meal_type', {
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    }).notNull(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    recipeId: text('recipe_id').references(() => recipes.id, {
      onDelete: 'restrict',
    }),
    grams: real('grams').notNull(),
    kcal: real('kcal').notNull(),
    protein: real('protein').notNull(),
    fat: real('fat').notNull(),
    carbs: real('carbs').notNull(),
    syncedAt: integer('synced_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('idx_meal_entries_date').on(t.date),
    index('idx_meal_entries_date_meal').on(t.date, t.mealType),
    index('idx_meal_entries_product').on(t.productId),
    index('idx_meal_entries_synced').on(t.syncedAt),
  ]
)

export const recipes = sqliteTable(
  'recipes',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    servings: integer('servings').notNull().default(1),
    totalKcal: real('total_kcal').notNull(),
    totalProtein: real('total_protein').notNull().default(0),
    totalFat: real('total_fat').notNull().default(0),
    totalCarbs: real('total_carbs').notNull().default(0),
    syncedAt: integer('synced_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('idx_recipes_name').on(t.name)]
)

export const recipeIngredients = sqliteTable(
  'recipe_ingredients',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    grams: real('grams').notNull(),
  },
  (t) => [index('idx_recipe_ingredients_recipe').on(t.recipeId)]
)

export const userProfile = sqliteTable('user_profile', {
  id: text('id').primaryKey(),
  weight: real('weight'),
  height: real('height'),
  age: integer('age'),
  sex: text('sex', { enum: ['male', 'female'] }),
  activityLevel: text('activity_level', {
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
  })
    .notNull()
    .default('moderate'),
  calorieGoal: integer('calorie_goal').notNull().default(2000),
  proteinGoal: real('protein_goal'),
  fatGoal: real('fat_goal'),
  carbsGoal: real('carbs_goal'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const pendingSync = sqliteTable(
  'pending_sync',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type', {
      enum: ['meal_entry', 'recipe', 'product', 'user_profile'],
    }).notNull(),
    entityId: text('entity_id').notNull(),
    operation: text('operation', {
      enum: ['create', 'update', 'delete'],
    }).notNull(),
    payload: text('payload').notNull(),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('idx_pending_sync_entity').on(t.entityType, t.entityId),
    index('idx_pending_sync_retry').on(t.retryCount),
  ]
)
