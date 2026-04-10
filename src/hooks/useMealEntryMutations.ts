import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mealEntriesRepository, productsRepository } from '@/db/repositories'
import { enqueueSync } from '@/services'
import { queryKeys } from '@/query/query-keys'
import { calcNutritionFromGrams } from '@/lib/nutrition'
import { useNutritionStore } from '@/store/nutrition.store'
import type { CreateMealEntryInput, MealEntry } from '@/types'

type MutationContext = {
  previousEntries?: MealEntry[]
  previousDate?: string
}

function makeTempMealEntry(
  input: CreateMealEntryInput,
  nutrition: ReturnType<typeof calcNutritionFromGrams>
): MealEntry {
  const ts = Date.now()
  return {
    id: `temp-${ts}`,
    date: input.date,
    mealType: input.mealType,
    productId: input.productId,
    recipeId: input.recipeId ?? null,
    grams: input.grams,
    kcal: nutrition.kcal,
    protein: nutrition.protein,
    fat: nutrition.fat,
    carbs: nutrition.carbs,
    syncedAt: null,
    createdAt: ts,
    updatedAt: ts,
  }
}

export function useCreateMealEntryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateMealEntryInput) => {
      const created = await mealEntriesRepository.create(input)
      await enqueueSync('meal_entry', created.id, 'create', created)
      return created
    },
    onMutate: async (input): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.mealEntries.byDate(input.date) })
      const previousEntries =
        queryClient.getQueryData<MealEntry[]>(queryKeys.mealEntries.byDate(input.date)) ?? []

      const product = await productsRepository.findById(input.productId)
      if (product) {
        const nutrition = calcNutritionFromGrams(product, input.grams)
        const optimistic = makeTempMealEntry(input, nutrition)
        queryClient.setQueryData<MealEntry[]>(queryKeys.mealEntries.byDate(input.date), [
          optimistic,
          ...previousEntries,
        ])
      }

      return { previousEntries, previousDate: input.date }
    },
    onError: (_err, input, context) => {
      if (context?.previousEntries && context.previousDate) {
        queryClient.setQueryData(
          queryKeys.mealEntries.byDate(context.previousDate),
          context.previousEntries
        )
      }
    },
    onSuccess: (created, input) => {
      const entries =
        queryClient.getQueryData<MealEntry[]>(queryKeys.mealEntries.byDate(input.date)) ?? []
      const cleaned = entries.filter((e) => !e.id.startsWith('temp-'))
      queryClient.setQueryData<MealEntry[]>(queryKeys.mealEntries.byDate(input.date), [
        created,
        ...cleaned,
      ])

      useNutritionStore.getState().pushUndoAction({
        id: `undo-create-${created.id}`,
        label: 'Undo add meal',
        run: async () => {
          await mealEntriesRepository.delete(created.id)
          await enqueueSync('meal_entry', created.id, 'delete', {
            id: created.id,
            date: created.date,
          })
          await queryClient.invalidateQueries({
            queryKey: queryKeys.mealEntries.byDate(created.date),
          })
        },
      })
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealEntries.byDate(input.date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.mealEntries.summaryByDate(input.date) })
    },
  })
}

export function useDeleteMealEntryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entry: MealEntry) => {
      await mealEntriesRepository.delete(entry.id)
      await enqueueSync('meal_entry', entry.id, 'delete', { id: entry.id, date: entry.date })
      return entry
    },
    onMutate: async (entry): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.mealEntries.byDate(entry.date) })
      const previousEntries =
        queryClient.getQueryData<MealEntry[]>(queryKeys.mealEntries.byDate(entry.date)) ?? []
      queryClient.setQueryData<MealEntry[]>(
        queryKeys.mealEntries.byDate(entry.date),
        previousEntries.filter((e) => e.id !== entry.id)
      )
      return { previousEntries, previousDate: entry.date }
    },
    onError: (_err, _entry, context) => {
      if (context?.previousEntries && context.previousDate) {
        queryClient.setQueryData(
          queryKeys.mealEntries.byDate(context.previousDate),
          context.previousEntries
        )
      }
    },
    onSuccess: (deleted) => {
      useNutritionStore.getState().pushUndoAction({
        id: `undo-delete-${deleted.id}`,
        label: 'Undo delete meal',
        run: async () => {
          const restored = await mealEntriesRepository.create({
            date: deleted.date,
            mealType: deleted.mealType,
            productId: deleted.productId,
            recipeId: deleted.recipeId,
            grams: deleted.grams,
          })
          await enqueueSync('meal_entry', restored.id, 'create', restored)
          await queryClient.invalidateQueries({
            queryKey: queryKeys.mealEntries.byDate(deleted.date),
          })
        },
      })
    },
    onSettled: (_data, _error, entry) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealEntries.byDate(entry.date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.mealEntries.summaryByDate(entry.date) })
    },
  })
}
