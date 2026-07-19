import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { getEventDetail, listEvents } from './event-service'

export const eventListKey = (userId: string) => ['events', userId] as const
export const eventDetailKey = (eventId: string) => ['event', eventId] as const

export function useEventList(userId: string | null) {
  return useQuery({
    queryKey: userId ? eventListKey(userId) : ['events', 'anonymous'],
    queryFn: () => listEvents(supabase, userId!),
    enabled: userId !== null,
    refetchOnWindowFocus: true,
  })
}

export function useEventDetail(eventId: string | undefined, userId: string | null) {
  return useQuery({
    queryKey: eventId ? eventDetailKey(eventId) : ['event', 'missing'],
    queryFn: () => getEventDetail(supabase, eventId!, userId!),
    enabled: Boolean(eventId && userId),
    refetchOnWindowFocus: true,
  })
}
