import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { getEventDetail, listEvents, type EventListScope } from './event-service'

export const eventListKey = (userId: string, scope?: EventListScope) =>
  scope ? (['events', userId, scope] as const) : (['events', userId] as const)
export const eventDetailKey = (eventId: string) => ['event', eventId] as const

export function useEventList(userId: string | null, scope: EventListScope = 'active') {
  return useQuery({
    queryKey: userId ? eventListKey(userId, scope) : ['events', 'anonymous', scope],
    queryFn: () => listEvents(supabase, userId!, scope),
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
