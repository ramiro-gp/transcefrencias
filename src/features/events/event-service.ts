import type { Json } from '../../lib/supabase/database.types'
import { supabase } from '../../lib/supabase/client'

type EventClient = Pick<typeof supabase, 'from' | 'rpc'>

export type EventRole = 'owner' | 'coadmin' | 'member'

export interface EventSummary {
  readonly id: string
  readonly name: string
  readonly role: EventRole
  readonly lastActivityAt: string
}

export interface EventDetail {
  readonly id: string
  readonly name: string
  readonly ownerId: string
  readonly role: EventRole
  readonly members: readonly EventMember[]
  readonly blockedMembers: readonly BlockedMember[]
  readonly participants: readonly Participant[]
  readonly audit: readonly AuditEntry[]
}

export interface EventMember {
  readonly profileId: string
  readonly role: EventRole
  readonly fullName: string
  readonly nickname: string | null
}

export interface BlockedMember {
  readonly profileId: string
  readonly displayName: string
}

export interface Participant {
  readonly id: string
  readonly profileId: string | null
  readonly displayName: string
  readonly active: boolean
}

export interface AuditEntry {
  readonly id: string
  readonly action: string
  readonly summary: string
  readonly createdAt: string
  readonly actorId: string | null
  readonly actorDisplayName: string
}

export interface InvitationLink {
  readonly invitationId: string
  readonly token: string
}

export class EventRequestError extends Error {
  constructor(message = 'No pudimos completar la operación. Intentá de nuevo.') {
    super(message)
    this.name = 'EventRequestError'
  }
}

function asRecord(value: Json | null): Record<string, Json | undefined> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new EventRequestError()
  }
  return value
}

function asString(value: Json | undefined): string {
  if (typeof value !== 'string') throw new EventRequestError()
  return value
}

function toRole(value: string): EventRole {
  if (value === 'owner' || value === 'coadmin' || value === 'member') return value
  throw new EventRequestError()
}

export async function listEvents(
  client: EventClient,
  userId: string,
): Promise<EventSummary[]> {
  const { data, error } = await client
    .from('event_members')
    .select('role, events!inner(id, name, last_activity_at)')
    .eq('profile_id', userId)
    .is('left_at', null)
    .order('last_activity_at', { referencedTable: 'events', ascending: false })
  if (error || !data)
    throw new EventRequestError('No pudimos cargar tus eventos. Intentá de nuevo.')
  return data.map((row) => {
    const event = row.events
    if (!event || Array.isArray(event)) throw new EventRequestError()
    return {
      id: event.id,
      name: event.name,
      lastActivityAt: event.last_activity_at,
      role: toRole(row.role),
    }
  })
}

export async function getEventDetail(
  client: EventClient,
  eventId: string,
  userId: string,
): Promise<EventDetail> {
  const [
    { data: event, error: eventError },
    { data: membership, error: membershipError },
    { data: members, error: membersError },
    { data: memberships, error: membershipsError },
    { data: participants, error: participantsError },
    { data: audit, error: auditError },
  ] = await Promise.all([
    client.from('events').select('id, name, owner_id').eq('id', eventId).maybeSingle(),
    client
      .from('event_members')
      .select('role')
      .eq('event_id', eventId)
      .eq('profile_id', userId)
      .is('left_at', null)
      .maybeSingle(),
    client
      .from('event_members')
      .select('profile_id, role, profiles!inner(full_name, nickname)')
      .eq('event_id', eventId)
      .is('left_at', null),
    client
      .from('event_members')
      .select('profile_id, rejoin_blocked_at')
      .eq('event_id', eventId)
      .not('rejoin_blocked_at', 'is', null),
    client
      .from('participants')
      .select('id, profile_id, display_name, active')
      .eq('event_id', eventId)
      .order('created_at'),
    client
      .from('audit_log')
      .select('id, action, summary, created_at, actor_id, actor_display_name')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
  ])
  if (
    eventError ||
    membershipError ||
    membersError ||
    membershipsError ||
    participantsError ||
    auditError ||
    !event ||
    !membership ||
    !members ||
    !memberships ||
    !participants ||
    !audit
  )
    throw new EventRequestError('No pudimos abrir este evento.')
  const allParticipants = participants.map((participant) => ({
    id: participant.id,
    profileId: participant.profile_id,
    displayName: participant.display_name,
    active: participant.active,
  }))
  return {
    id: event.id,
    name: event.name,
    ownerId: event.owner_id,
    role: toRole(membership.role),
    members: members.map((member) => {
      const profile = member.profiles
      if (!profile || Array.isArray(profile)) throw new EventRequestError()
      return {
        profileId: member.profile_id,
        role: toRole(member.role),
        fullName: profile.full_name,
        nickname: profile.nickname,
      }
    }),
    blockedMembers: memberships.map((membership) => {
      const person = allParticipants.find(
        (participant) => participant.profileId === membership.profile_id,
      )
      if (!person) throw new EventRequestError()
      return { profileId: membership.profile_id, displayName: person.displayName }
    }),
    participants: allParticipants,
    audit: audit.map((entry) => ({
      id: entry.id,
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.created_at,
      actorId: entry.actor_id,
      actorDisplayName: entry.actor_display_name,
    })),
  }
}

export async function createEvent(
  client: EventClient,
  name: string,
): Promise<{ eventId: string; invitation: InvitationLink }> {
  const { data, error } = await client.rpc('create_event', { event_name: name.trim() })
  if (error)
    throw new EventRequestError(
      'No pudimos crear el evento. Revisá el nombre e intentá de nuevo.',
    )
  const result = asRecord(data)
  return {
    eventId: asString(result.event_id),
    invitation: {
      invitationId: asString(result.invitation_id),
      token: asString(result.token),
    },
  }
}

export async function renameEvent(client: EventClient, eventId: string, name: string) {
  const { error } = await client.rpc('rename_event', {
    target_event_id: eventId,
    event_name: name.trim(),
  })
  if (error) throw new EventRequestError('No pudimos renombrar el evento.')
}

export async function callEventRpc(
  client: EventClient,
  name:
    | 'leave_event'
    | 'deactivate_participant'
    | 'link_manual_participant'
    | 'set_coadmin'
    | 'expel_event_member'
    | 'allow_event_rejoin',
  args: Record<string, string | boolean>,
) {
  const { error } = await client.rpc(name, args as never)
  if (error) throw new EventRequestError()
}

export async function createManualParticipant(
  client: EventClient,
  eventId: string,
  name: string,
) {
  const { error } = await client.rpc('create_manual_participant', {
    target_event_id: eventId,
    participant_name: name.trim(),
  })
  if (error) throw new EventRequestError('No pudimos agregar el participante.')
}

export async function getEventInvitation(
  client: EventClient,
  eventId: string,
): Promise<InvitationLink> {
  const { data, error } = await client.rpc('get_event_invitation', {
    target_event_id: eventId,
  })
  if (error) throw new EventRequestError('No pudimos cargar la invitación.')
  const result = asRecord(data)
  return { invitationId: asString(result.invitation_id), token: asString(result.token) }
}

export async function getInvitationPreview(
  client: EventClient,
  invitationId: string,
  secret: string,
): Promise<{ eventId: string; name: string; alreadyMember: boolean }> {
  const { data, error } = await client.rpc('get_invitation_preview', {
    invitation_id: invitationId,
    invitation_secret: secret,
  })
  if (error) throw new EventRequestError('La invitación no es válida o fue revocada.')
  const result = asRecord(data)
  const alreadyMember = result.already_member
  if (typeof alreadyMember !== 'boolean') throw new EventRequestError()
  return {
    eventId: asString(result.event_id),
    name: asString(result.name),
    alreadyMember,
  }
}

export async function joinInvitation(
  client: EventClient,
  invitationId: string,
  secret: string,
): Promise<string> {
  const { data, error } = await client.rpc('join_event', {
    invitation_id: invitationId,
    invitation_secret: secret,
  })
  if (error || !data)
    throw new EventRequestError(
      'No pudimos unirte al evento. Revisá la invitación e intentá de nuevo.',
    )
  return data
}
