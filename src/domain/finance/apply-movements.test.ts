import { applyMovements, validateProposedMovement } from './apply-movements'

const originalBalances = [
  { participantId: 'a', amount: -1000 },
  { participantId: 'b', amount: 1000 },
]

describe('applyMovements', () => {
  it('applies a partial movement without changing original balances', () => {
    const result = applyMovements({
      originalBalances,
      movements: [{ id: 'movement', fromId: 'a', toId: 'b', amount: 600 }],
    })

    expect(result.balances).toEqual([
      {
        participantId: 'a',
        originalAmount: -1000,
        sentAmount: 600,
        receivedAmount: 0,
        amount: -400,
        contributions: [
          { movementId: 'movement', sentAmount: 600, receivedAmount: 0, netAmount: 600 },
        ],
      },
      {
        participantId: 'b',
        originalAmount: 1000,
        sentAmount: 0,
        receivedAmount: 600,
        amount: 400,
        contributions: [
          { movementId: 'movement', sentAmount: 0, receivedAmount: 600, netAmount: -600 },
        ],
      },
    ])
    expect(result.warnings).toEqual([])
    expect(originalBalances).toEqual([
      { participantId: 'a', amount: -1000 },
      { participantId: 'b', amount: 1000 },
    ])
  })

  it('applies retained overpayments algebraically and reports deterministic warnings', () => {
    const movements = [{ id: 'old-payment', fromId: 'a', toId: 'b', amount: 800 }]
    const result = applyMovements({
      originalBalances: [
        { participantId: 'a', amount: -500 },
        { participantId: 'b', amount: 500 },
      ],
      movements,
    })

    expect(
      result.balances.map(({ participantId, amount }) => ({ participantId, amount })),
    ).toEqual([
      { participantId: 'a', amount: 300 },
      { participantId: 'b', amount: -300 },
    ])
    expect(result.warnings).toEqual([
      { code: 'creditor-became-debtor', participantId: 'b' },
      { code: 'debtor-became-creditor', participantId: 'a' },
    ])
  })

  it('derives balances, explanations and warnings independently of movement order', () => {
    const balances = [
      { participantId: 'a', amount: -1000 },
      { participantId: 'b', amount: 600 },
      { participantId: 'c', amount: 400 },
    ]
    const movements = [
      { id: 'z', fromId: 'a', toId: 'b', amount: 500 },
      { id: 'a', fromId: 'c', toId: 'a', amount: 100 },
    ]

    expect(applyMovements({ originalBalances: balances, movements })).toEqual(
      applyMovements({
        originalBalances: [...balances].reverse(),
        movements: [...movements].reverse(),
      }),
    )
  })
})

describe('validateProposedMovement', () => {
  it('accepts any debtor-creditor pair within total pending limits', () => {
    const result = validateProposedMovement({
      originalBalances,
      movements: [],
      proposedMovement: { id: 'new', fromId: 'a', toId: 'b', amount: 333 },
    })

    expect(result).toEqual({
      movement: { id: 'new', fromId: 'a', toId: 'b', amount: 333 },
      availableDebt: 1000,
      availableCredit: 1000,
    })
  })

  it('validates a replacement after excluding the old movement', () => {
    const result = validateProposedMovement({
      originalBalances,
      movements: [{ id: 'payment', fromId: 'a', toId: 'b', amount: 600 }],
      proposedMovement: { id: 'payment', fromId: 'a', toId: 'b', amount: 800 },
      replacedMovementId: 'payment',
    })

    expect(result.availableDebt).toBe(1000)
  })

  it('rejects an ambiguous replacement when the source repeats the movement ID', () => {
    expect(() =>
      validateProposedMovement({
        originalBalances,
        movements: [
          { id: 'payment', fromId: 'a', toId: 'b', amount: 200 },
          { id: 'payment', fromId: 'a', toId: 'b', amount: 300 },
        ],
        proposedMovement: { id: 'payment', fromId: 'a', toId: 'b', amount: 400 },
        replacedMovementId: 'payment',
      }),
    ).toThrowError(expect.objectContaining({ code: 'duplicate-movement' }))
  })

  it('rejects invalid direction and amounts above pending limits', () => {
    expect(() =>
      validateProposedMovement({
        originalBalances,
        movements: [],
        proposedMovement: { id: 'wrong', fromId: 'b', toId: 'a', amount: 100 },
      }),
    ).toThrowError(expect.objectContaining({ code: 'invalid-movement-origin' }))
    expect(() =>
      validateProposedMovement({
        originalBalances,
        movements: [],
        proposedMovement: { id: 'too-much', fromId: 'a', toId: 'b', amount: 1001 },
      }),
    ).toThrowError(expect.objectContaining({ code: 'movement-exceeds-pending' }))
  })

  it('uses the aggregate movement net before checking the final safe balance', () => {
    const maximum = Number.MAX_SAFE_INTEGER
    const result = applyMovements({
      originalBalances: [
        { participantId: 'a', amount: maximum },
        { participantId: 'b', amount: -maximum },
      ],
      movements: [
        { id: 'a-to-b', fromId: 'a', toId: 'b', amount: 1 },
        { id: 'b-to-a', fromId: 'b', toId: 'a', amount: 1 },
      ],
    })

    expect(result.balances.map(({ amount }) => amount)).toEqual([maximum, -maximum])
  })
})
