import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react-native'
import {
  useCreateMealEntryMutation,
  useCreateRecipeMealEntryMutation,
  useDeleteMealEntryMutation,
} from '@/hooks/useMealEntryMutations'
import { useNutritionStore } from '@/store/nutrition.store'
import type { MealEntry } from '@/types'

jest.mock('@/db/repositories', () => ({
  mealEntriesRepository: {
    create: jest.fn(),
    createFromRecipe: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  productsRepository: {
    findById: jest.fn(),
  },
  recipesRepository: {
    findById: jest.fn(),
  },
}))

jest.mock('@/services', () => ({
  enqueueSync: jest.fn(),
}))

const repos = jest.requireMock('@/db/repositories') as {
  mealEntriesRepository: {
    create: jest.Mock
    createFromRecipe: jest.Mock
    delete: jest.Mock
  }
  productsRepository: { findById: jest.Mock }
  recipesRepository: { findById: jest.Mock }
}
const services = jest.requireMock('@/services') as {
  enqueueSync: jest.Mock
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

let consoleErrorSpy: jest.SpyInstance

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : ''
    if (first.includes('not wrapped in act')) return
    // eslint-disable-next-line no-console
    console.warn(...args)
  })
})

afterAll(() => {
  consoleErrorSpy.mockRestore()
})

beforeEach(() => {
  jest.clearAllMocks()
  useNutritionStore.setState({ undoStack: [] })
})

describe('useMealEntryMutations integration', () => {
  it('add food flow enqueues sync on create', async () => {
    repos.productsRepository.findById.mockResolvedValue({
      id: 'p1',
      name: 'Chicken',
      brand: null,
      kcalPer100g: 120,
      protein: 24,
      fat: 2,
      carbs: 0,
    })
    repos.mealEntriesRepository.create.mockResolvedValue({
      id: 'm1',
      date: '2026-04-15',
      mealType: 'breakfast',
      productId: 'p1',
      recipeId: null,
      grams: 150,
      kcal: 180,
      protein: 36,
      fat: 3,
      carbs: 0,
      syncedAt: null,
      createdAt: 1,
      updatedAt: 1,
    })

    const { result } = renderHook(() => useCreateMealEntryMutation(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({
        date: '2026-04-15',
        mealType: 'breakfast',
        productId: 'p1',
        grams: 150,
      })
    })

    expect(repos.mealEntriesRepository.create).toHaveBeenCalled()
    expect(services.enqueueSync).toHaveBeenCalledWith(
      'meal_entry',
      'm1',
      'create',
      expect.objectContaining({ id: 'm1' })
    )
  })

  it('delete entry flow adds undo action and restore creates entry', async () => {
    const deleted: MealEntry = {
      id: 'm2',
      date: '2026-04-15',
      mealType: 'lunch',
      productId: 'p1',
      recipeId: null,
      grams: 200,
      kcal: 200,
      protein: 20,
      fat: 10,
      carbs: 5,
      syncedAt: null,
      createdAt: 1,
      updatedAt: 1,
    }
    repos.mealEntriesRepository.delete.mockResolvedValue(undefined)
    repos.mealEntriesRepository.create.mockResolvedValue({
      ...deleted,
      id: 'm3',
    })

    const { result } = renderHook(() => useDeleteMealEntryMutation(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(deleted)
    })

    const undoAction = useNutritionStore.getState().popUndoAction()
    expect(undoAction).toBeTruthy()
    if (undoAction) {
      await act(async () => {
        await undoAction.run()
      })
    }

    expect(repos.mealEntriesRepository.create).toHaveBeenCalled()
    expect(services.enqueueSync).toHaveBeenCalledWith(
      'meal_entry',
      'm3',
      'create',
      expect.objectContaining({ id: 'm3' })
    )
  })

  it('recipe to diary flow enqueues sync on createFromRecipe', async () => {
    repos.recipesRepository.findById.mockResolvedValue({
      id: 'r1',
      name: 'Salad',
      servings: 1,
      totalKcal: 300,
      totalProtein: 20,
      totalFat: 15,
      totalCarbs: 25,
      syncedAt: null,
      ingredients: [{ id: 'i1', recipeId: 'r1', productId: 'p1', grams: 300 }],
      createdAt: 1,
      updatedAt: 1,
    })
    repos.mealEntriesRepository.createFromRecipe.mockResolvedValue({
      id: 'm4',
      date: '2026-04-15',
      mealType: 'dinner',
      productId: 'p1',
      recipeId: 'r1',
      grams: 150,
      kcal: 150,
      protein: 10,
      fat: 7.5,
      carbs: 12.5,
      syncedAt: null,
      createdAt: 1,
      updatedAt: 1,
    })

    const { result } = renderHook(() => useCreateRecipeMealEntryMutation(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({
        date: '2026-04-15',
        mealType: 'dinner',
        recipeId: 'r1',
        grams: 150,
      })
    })

    expect(repos.mealEntriesRepository.createFromRecipe).toHaveBeenCalled()
    expect(services.enqueueSync).toHaveBeenCalledWith(
      'meal_entry',
      'm4',
      'create',
      expect.objectContaining({ id: 'm4' })
    )
  })
})
