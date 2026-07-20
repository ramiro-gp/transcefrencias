import type { Json } from '../../lib/supabase/database.types'
import { supabase } from '../../lib/supabase/client'

type EventClient = Pick<typeof supabase, 'from' | 'rpc'>
type RevisionRpcName =
  | 'transition_event_to_paying'
  | 'reopen_event_expenses'
  | 'archive_event'
  | 'restore_event'

export type EventRole = 'owner' | 'coadmin' | 'member'
export type ActiveEventStatus = 'loading_expenses' | 'paying'
export type EventStatus = ActiveEventStatus | 'archived'
export type EventListScope = 'active' | 'archived'

export interface EventSummary {
  readonly id: string
  readonly name: string
  readonly role: EventRole
  readonly status: EventStatus
  readonly lastActivityAt: string
  readonly revision: number
  readonly archivedAt: string | null
  readonly archivedFromStatus: ActiveEventStatus | null
}

interface EventRow {
  readonly id: string
  readonly name: string
  readonly owner_id: string
  readonly status: string
  readonly last_activity_at: string
  readonly revision: number
  readonly archived_at: string | null
  readonly archived_from_status: string | null
}

export interface EventDetail {
  readonly id: string
  readonly name: string
  readonly ownerId: string
  readonly role: EventRole
  readonly status: EventStatus
  readonly revision: number
  readonly archivedAt: string | null
  readonly archivedFromStatus: ActiveEventStatus | null
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
  readonly mergedIntoId: string | null
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

function asNumber(value: Json | undefined): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw new EventRequestError()
  return value
}

function asNullableString(value: Json | undefined): string | null {
  if (value === null || value === undefined) return null
  return asString(value)
}

function toRole(value: string): EventRole {
  if (value === 'owner' || value === 'coadmin' || value === 'member') return value
  throw new EventRequestError()
}

function toStatus(value: string): EventStatus {
  if (value === 'loading_expenses' || value === 'paying' || value === 'archived')
    return value
  throw new EventRequestError()
}

function toActiveStatus(value: string | null): ActiveEventStatus | null {
  if (value === null) return null
  if (value === 'loading_expenses' || value === 'paying') return value
  throw new EventRequestError()
}

export function eventStatusLabel(status: ActiveEventStatus): string {
  return status === 'loading_expenses' ? 'CARGANDO GASTOS' : 'HORA DE PAGAR'
}

export async function listEvents(
  client: EventClient,
  userId: string,
  scope: EventListScope,
): Promise<EventSummary[]> {
  let query = client
    .from('event_members')
    .select(
      'role, events!inner(id, name, status, last_activity_at, revision, archived_at, archived_from_status)',
    )
    .eq('profile_id', userId)
    .is('left_at', null)
  query =
    scope === 'archived'
      ? query
          .eq('events.status', 'archived')
          .order('archived_at', { referencedTable: 'events', ascending: false })
      : query
          .neq('events.status', 'archived')
          .order('last_activity_at', { referencedTable: 'events', ascending: false })
  const { data, error } = await query
  if (error || !data)
    throw new EventRequestError('No pudimos cargar tus eventos. Intentá de nuevo.')
  return data.map((row) => {
    const event = row.events
    if (!event || Array.isArray(event)) throw new EventRequestError()
    const eventRow = event as unknown as EventRow
    return {
      id: eventRow.id,
      name: eventRow.name,
      lastActivityAt: eventRow.last_activity_at,
      role: toRole(row.role),
      status: toStatus(eventRow.status),
      revision: eventRow.revision,
      archivedAt: eventRow.archived_at,
      archivedFromStatus: toActiveStatus(eventRow.archived_from_status),
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
    client
      .from('events')
      .select('id, name, owner_id, status, revision, archived_at, archived_from_status')
      .eq('id', eventId)
      .maybeSingle(),
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
      .select('id, profile_id, display_name, active, merged_into_id')
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
    mergedIntoId: participant.merged_into_id,
  }))
  const eventRow = event as unknown as EventRow
  return {
    id: eventRow.id,
    name: eventRow.name,
    ownerId: eventRow.owner_id,
    role: toRole(membership.role),
    status: toStatus(eventRow.status),
    revision: eventRow.revision,
    archivedAt: eventRow.archived_at,
    archivedFromStatus: toActiveStatus(eventRow.archived_from_status),
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

export interface EventTransition {
  readonly status: EventStatus
  readonly revision: number
  readonly archivedAt: string | null
  readonly archivedFromStatus: ActiveEventStatus | null
}

function toEventTransition(data: Json | null): EventTransition {
  const result = asRecord(data)
  return {
    status: toStatus(asString(result.status)),
    revision: asNumber(result.revision),
    archivedAt: asNullableString(result.archived_at),
    archivedFromStatus: toActiveStatus(asNullableString(result.archived_from_status)),
  }
}

async function callRevisionRpc(
  client: EventClient,
  name: RevisionRpcName,
  eventId: string,
  expectedRevision: number,
) {
  return (
    client.rpc as unknown as (
      rpcName: RevisionRpcName,
      args: { target_event_id: string; expected_revision: number },
    ) => Promise<{
      data: Json | null
      error: { code?: string; message: string } | null
    }>
  )(name, {
    target_event_id: eventId,
    expected_revision: expectedRevision,
  })
}

function transitionError(error: { code?: string; message: string }): EventRequestError {
  return new EventRequestError(
    error.code === '40001'
      ? 'El evento cambió. Recargamos los datos; revisalos antes de continuar.'
      : error.message,
  )
}

export async function transitionEventToPaying(
  client: EventClient,
  eventId: string,
  expectedRevision: number,
): Promise<EventTransition> {
  const { data, error } = await callRevisionRpc(
    client,
    'transition_event_to_paying',
    eventId,
    expectedRevision,
  )
  if (error) throw transitionError(error)
  return toEventTransition(data)
}

export async function reopenEventExpenses(
  client: EventClient,
  eventId: string,
  expectedRevision: number,
): Promise<EventTransition> {
  const { data, error } = await callRevisionRpc(
    client,
    'reopen_event_expenses',
    eventId,
    expectedRevision,
  )
  if (error) throw transitionError(error)
  return toEventTransition(data)
}

export async function archiveEvent(
  client: EventClient,
  eventId: string,
  expectedRevision: number,
): Promise<EventTransition> {
  const { data, error } = await callRevisionRpc(
    client,
    'archive_event',
    eventId,
    expectedRevision,
  )
  if (error) throw transitionError(error)
  return toEventTransition(data)
}

export async function restoreEvent(
  client: EventClient,
  eventId: string,
  expectedRevision: number,
): Promise<EventTransition> {
  const { data, error } = await callRevisionRpc(
    client,
    'restore_event',
    eventId,
    expectedRevision,
  )
  if (error) throw transitionError(error)
  return toEventTransition(data)
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
): Promise<{
  eventId: string
  name: string
  alreadyMember: boolean
  status: EventStatus
}> {
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
    status: toStatus(asString(result.status)),
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
