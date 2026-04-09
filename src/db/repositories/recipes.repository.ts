import { eq, asc } from 'drizzle-orm'
import { db } from '../client'
import { recipes, recipeIngredients, products } from '../schema'
import { generateId, now } from '../utils'
import { calcNutritionFromGrams } from '@/lib/nutrition'
import type { Recipe, RecipeIngredient, CreateRecipeInput, UpdateRecipeInput } from '@/types'

type RecipeRow = typeof recipes.$inferSelect
type IngredientRow = typeof recipeIngredients.$inferSelect

function toRecipeIngredient(row: IngredientRow): RecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipeId,
    productId: row.productId,
    grams: row.grams,
  }
}

async function loadRecipeWithIngredients(recipeRow: RecipeRow): Promise<Recipe> {
  const ingredientRows = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeRow.id))
    .orderBy(asc(recipeIngredients.id))

  return {
    id: recipeRow.id,
    name: recipeRow.name,
    servings: recipeRow.servings,
    totalKcal: recipeRow.totalKcal,
    totalProtein: recipeRow.totalProtein,
    totalFat: recipeRow.totalFat,
    totalCarbs: recipeRow.totalCarbs,
    syncedAt: recipeRow.syncedAt,
    ingredients: ingredientRows.map(toRecipeIngredient),
    createdAt: recipeRow.createdAt,
    updatedAt: recipeRow.updatedAt,
  }
}

async function calcTotalsForIngredients(
  ingredients: Array<{ productId: string; grams: number }>
) {
  let totalKcal = 0
  let totalProtein = 0
  let totalFat = 0
  let totalCarbs = 0

  for (const ing of ingredients) {
    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.id, ing.productId))
      .limit(1)

    if (!productRows[0]) {
      throw new Error(`Product not found: ${ing.productId}`)
    }

    const nutrition = calcNutritionFromGrams(productRows[0], ing.grams)
    totalKcal += nutrition.kcal
    totalProtein += nutrition.protein
    totalFat += nutrition.fat
    totalCarbs += nutrition.carbs
  }

  return {
    totalKcal: Math.round(totalKcal * 10) / 10,
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    totalCarbs: Math.round(totalCarbs * 10) / 10,
  }
}

export const recipesRepository = {
  async findAll(): Promise<Recipe[]> {
    const rows = await db.select().from(recipes).orderBy(asc(recipes.name))
    return Promise.all(rows.map(loadRecipeWithIngredients))
  },

  async findById(id: string): Promise<Recipe | null> {
    const rows = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1)
    if (!rows[0]) return null
    return loadRecipeWithIngredients(rows[0])
  },

  async create(input: CreateRecipeInput): Promise<Recipe> {
    const id = generateId()
    const ts = now()
    const totals = await calcTotalsForIngredients(input.ingredients)

    await db.insert(recipes).values({
      id,
      name: input.name,
      servings: input.servings ?? 1,
      totalKcal: totals.totalKcal,
      totalProtein: totals.totalProtein,
      totalFat: totals.totalFat,
      totalCarbs: totals.totalCarbs,
      syncedAt: null,
      createdAt: ts,
      updatedAt: ts,
    })

    const ingredientRows = input.ingredients.map((ing) => ({
      id: generateId(),
      recipeId: id,
      productId: ing.productId,
      grams: ing.grams,
    }))

    if (ingredientRows.length > 0) {
      await db.insert(recipeIngredients).values(ingredientRows)
    }

    const result = await this.findById(id)
    if (!result) throw new Error('Failed to create recipe')
    return result
  },

  async update(id: string, input: UpdateRecipeInput): Promise<Recipe | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const ts = now()

    if (input.ingredients !== undefined) {
      await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id))

      const newIngredients = input.ingredients
      const totals = await calcTotalsForIngredients(newIngredients)

      await db
        .update(recipes)
        .set({
          name: input.name ?? existing.name,
          servings: input.servings ?? existing.servings,
          totalKcal: totals.totalKcal,
          totalProtein: totals.totalProtein,
          totalFat: totals.totalFat,
          totalCarbs: totals.totalCarbs,
          syncedAt: null,
          updatedAt: ts,
        })
        .where(eq(recipes.id, id))

      const ingredientRows = newIngredients.map((ing) => ({
        id: generateId(),
        recipeId: id,
        productId: ing.productId,
        grams: ing.grams,
      }))

      if (ingredientRows.length > 0) {
        await db.insert(recipeIngredients).values(ingredientRows)
      }
    } else {
      await db
        .update(recipes)
        .set({
          name: input.name ?? existing.name,
          servings: input.servings ?? existing.servings,
          syncedAt: null,
          updatedAt: ts,
        })
        .where(eq(recipes.id, id))
    }

    return this.findById(id)
  },

  async delete(id: string): Promise<void> {
    await db.delete(recipes).where(eq(recipes.id, id))
  },
}
