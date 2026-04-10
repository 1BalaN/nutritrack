import { useQuery } from '@tanstack/react-query'
import { productsRepository } from '@/db/repositories'
import { queryKeys } from '@/query/query-keys'

export function useProductsQuery(search = '') {
  return useQuery({
    queryKey: queryKeys.products.list(search),
    queryFn: () =>
      search.trim() ? productsRepository.search(search.trim()) : productsRepository.findAll(),
  })
}
