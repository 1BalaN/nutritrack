import { useQuery } from '@tanstack/react-query'
import { recipesRepository } from '@/db/repositories'
import { queryKeys } from '@/query/query-keys'

export function useRecipesQuery(search = '') {
  return useQuery({
    queryKey: queryKeys.recipes.list(search),
    queryFn: async () => {
      const all = await recipesRepository.findAll()
      const q = search.trim().toLowerCase()
      if (!q) return all
      return all.filter((r) => r.name.toLowerCase().includes(q))
    },
  })
}
