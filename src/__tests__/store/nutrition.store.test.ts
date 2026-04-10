jest.mock('@/lib/storage', () => ({
  appStorage: {
    getSelectedDate: jest.fn(() => null),
    setSelectedDate: jest.fn(),
  },
}))

import { useNutritionStore } from '@/store/nutrition.store'

describe('nutrition store', () => {
  beforeEach(() => {
    useNutritionStore.setState({
      selectedDate: new Date().toISOString().split('T')[0],
      mealTypeFilter: 'all',
      undoStack: [],
    })
  })

  it('initializes with today date', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(useNutritionStore.getState().selectedDate).toBe(today)
  })

  it('setSelectedDate updates the date', () => {
    useNutritionStore.getState().setSelectedDate('2024-01-15')
    expect(useNutritionStore.getState().selectedDate).toBe('2024-01-15')
  })

  it('setMealTypeFilter updates filter', () => {
    useNutritionStore.getState().setMealTypeFilter('lunch')
    expect(useNutritionStore.getState().mealTypeFilter).toBe('lunch')
  })

  it('pushUndoAction + popUndoAction works', async () => {
    const run = jest.fn(async () => {})
    useNutritionStore.getState().pushUndoAction({
      id: 'u1',
      label: 'Undo test',
      run,
    })

    const action = useNutritionStore.getState().popUndoAction()
    expect(action?.id).toBe('u1')
    if (action) {
      await action.run()
    }
    expect(run).toHaveBeenCalledTimes(1)
    expect(useNutritionStore.getState().undoStack).toHaveLength(0)
  })

  it('clearUndoStack empties stack', () => {
    useNutritionStore.getState().pushUndoAction({
      id: 'u1',
      label: 'Undo test',
      run: async () => {},
    })
    expect(useNutritionStore.getState().undoStack).toHaveLength(1)
    useNutritionStore.getState().clearUndoStack()
    expect(useNutritionStore.getState().undoStack).toHaveLength(0)
  })
})
