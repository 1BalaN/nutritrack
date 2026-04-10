import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userProfileRepository } from '@/db/repositories'
import type { UpdateUserProfileInput } from '@/types'

const PROFILE_KEY = ['userProfile'] as const

export function useUserProfileQuery() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => userProfileRepository.getOrCreate(),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateUserProfileInput) => userProfileRepository.update(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  })
}
