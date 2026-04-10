import { useMutation } from '@tanstack/react-query'
import { useNutritionStore } from '@/store/nutrition.store'

export function useUndoLastMutation() {
  return useMutation({
    mutationFn: async () => {
      const action = useNutritionStore.getState().popUndoAction()
      if (!action) return null
      await action.run()
      return action
    },
  })
}
