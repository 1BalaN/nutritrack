import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { mealEntriesRepository } from '@/db/repositories'
import { queryKeys } from '@/query/query-keys'
import { calcNutrition } from '@/store/nutrition.store'
import type { MealEntry, EnrichedMealEntry } from '@/types'

export function useMealEntriesByDateQuery(
  date: string,
  mealTypeFilter: MealEntry['mealType'] | 'all' = 'all'
) {
  const query = useQuery({
    queryKey: queryKeys.mealEntries.byDate(date),
    queryFn: () => mealEntriesRepository.findByDateEnriched(date),
  })

  const filteredEntries = useMemo(() => {
    const list = query.data ?? []
    if (mealTypeFilter === 'all') return list
    return list.filter((entry) => entry.mealType === mealTypeFilter)
  }, [query.data, mealTypeFilter])

  const entriesByMeal = useMemo(() => {
    const list = query.data ?? []
    const buckets: Record<string, EnrichedMealEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }
    for (const e of list) {
      const arr = buckets[e.mealType]
      if (arr) arr.push(e)
    }
    return buckets
  }, [query.data])

  const summary = useMemo(() => calcNutrition(filteredEntries), [filteredEntries])

  return {
    ...query,
    filteredEntries,
    entriesByMeal,
    summary,
  }
}
