import { vi } from 'vitest'
import { archiveEvent, listEvents, restoreEvent } from './event-service'

function eventListClient(status: 'loading_expenses' | 'archived') {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [
          {
            role: 'owner',
            events: {
              id: 'event-id',
              name: 'SÁBADO',
              status,
              last_activity_at: '2026-07-20T10:00:00Z',
              revision: 3,
              archived_at: status === 'archived' ? '2026-07-20T11:00:00Z' : null,
              archived_from_status: status === 'archived' ? 'paying' : null,
            },
          },
        ],
        error: null,
      }).then(resolve),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.is.mockReturnValue(query)
  query.neq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  return { client: { from: vi.fn(() => query) }, query }
}

describe('event revision transitions', () => {
  it('archives with the expected revision and parses the returned state', async () => {
    const rpc = vi.fn(() =>
      Promise.resolve({
        data: {
          status: 'archived',
          revision: 6,
          archived_at: '2026-07-20T10:00:00Z',
          archived_from_status: 'paying',
        },
        error: null,
      }),
    )

    await expect(archiveEvent({ rpc } as never, 'event-id', 5)).resolves.toEqual({
      status: 'archived',
      revision: 6,
      archivedAt: '2026-07-20T10:00:00Z',
      archivedFromStatus: 'paying',
    })
    expect(rpc).toHaveBeenCalledWith('archive_event', {
      target_event_id: 'event-id',
      expected_revision: 5,
    })
  })

  it('restores to the state returned by the server', async () => {
    const rpc = vi.fn(() =>
      Promise.resolve({
        data: {
          status: 'loading_expenses',
          revision: 7,
          archived_at: null,
          archived_from_status: null,
        },
        error: null,
      }),
    )

    await expect(restoreEvent({ rpc } as never, 'event-id', 6)).resolves.toEqual({
      status: 'loading_expenses',
      revision: 7,
      archivedAt: null,
      archivedFromStatus: null,
    })
  })

  it('turns revision conflicts into a reload instruction', async () => {
    const rpc = vi.fn(() =>
      Promise.resolve({
        data: null,
        error: { code: '40001', message: 'The event changed.' },
      }),
    )

    await expect(archiveEvent({ rpc } as never, 'event-id', 5)).rejects.toThrow(
      'El evento cambió. Recargamos los datos; revisalos antes de continuar.',
    )
  })
})

describe('event lists', () => {
  it('excludes archived events from the active list and orders by activity', async () => {
    const { client, query } = eventListClient('loading_expenses')

    await expect(listEvents(client as never, 'user-id', 'active')).resolves.toHaveLength(
      1,
    )
    expect(query.neq).toHaveBeenCalledWith('events.status', 'archived')
    expect(query.order).toHaveBeenCalledWith('last_activity_at', {
      referencedTable: 'events',
      ascending: false,
    })
  })

  it('selects archived events and orders by archive date', async () => {
    const { client, query } = eventListClient('archived')

    await expect(
      listEvents(client as never, 'user-id', 'archived'),
    ).resolves.toMatchObject([{ status: 'archived', archivedFromStatus: 'paying' }])
    expect(query.eq).toHaveBeenCalledWith('events.status', 'archived')
    expect(query.order).toHaveBeenCalledWith('archived_at', {
      referencedTable: 'events',
      ascending: false,
    })
  })
})
