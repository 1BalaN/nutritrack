jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: jest.fn(() => undefined),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}))

jest.mock('@/lib/mmkv', () => ({
  storage: {
    getString: jest.fn(() => undefined),
    set: jest.fn(),
    delete: jest.fn(),
  },
}))

import { useNutritionStore } from '@/store/nutrition.store'

describe('nutrition store', () => {
  it('initializes with today date', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(useNutritionStore.getState().selectedDate).toBe(today)
  })

  it('setSelectedDate updates the date', () => {
    useNutritionStore.getState().setSelectedDate('2024-01-15')
    expect(useNutritionStore.getState().selectedDate).toBe('2024-01-15')
  })

  it('addPendingChange adds to pendingChanges', () => {
    const entry = {
      id: 'e1',
      date: '2024-01-15',
      mealType: 'breakfast' as const,
      productId: 'p1',
      recipeId: null,
      grams: 100,
      kcal: 165,
      protein: 31,
      fat: 3.6,
      carbs: 0,
      syncedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    useNutritionStore.getState().clearPendingChanges()
    useNutritionStore.getState().addPendingChange(entry)
    expect(useNutritionStore.getState().pendingChanges).toHaveLength(1)
  })

  it('clearPendingChanges empties array', () => {
    useNutritionStore.getState().clearPendingChanges()
    expect(useNutritionStore.getState().pendingChanges).toHaveLength(0)
  })
})
