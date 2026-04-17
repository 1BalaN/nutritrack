import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userProfileRepository } from '@/db/repositories'
import { enqueueSync } from '@/services'
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
    mutationFn: async (input: UpdateUserProfileInput) => {
      const updated = await userProfileRepository.update(input)
      await enqueueSync('user_profile', updated.id, 'update', updated)
      return updated
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  })
}
