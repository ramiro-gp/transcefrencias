import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { getOwnProfile } from './profile-service'

export function profileQueryKey(userId: string) {
  return ['profile', userId] as const
}

export function useProfileQuery(userId: string | null) {
  return useQuery({
    queryKey: userId ? profileQueryKey(userId) : ['profile', 'anonymous'],
    queryFn: () => getOwnProfile(supabase, userId!),
    enabled: userId !== null,
  })
}
