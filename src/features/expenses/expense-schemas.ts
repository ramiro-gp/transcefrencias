import { z } from 'zod'
import type { ExpenseCategory } from './expense-categories'

export const expenseFormSchema = z
  .object({
    concept: z
      .string()
      .trim()
      .min(1, 'Ingresá qué se compró.')
      .max(100, 'El concepto admite hasta 100 caracteres.')
      .refine(
        (value) => !/[\p{Cc}]/u.test(value),
        'El concepto contiene caracteres no válidos.',
      ),
    category: z.enum(['food', 'drink', 'alcohol', 'cannabis', 'other'] satisfies [
      ExpenseCategory,
      ...ExpenseCategory[],
    ]),
    amount: z.number().int().positive().safe(),
    payers: z
      .array(
        z.object({
          participantId: z.string().uuid(),
          amount: z.number().int().positive().safe(),
        }),
      )
      .min(1),
    participantIds: z.array(z.string().uuid()).min(1, 'Elegí al menos una persona.'),
  })
  .superRefine((value, context) => {
    if (
      new Set(value.payers.map((payer) => payer.participantId)).size !==
      value.payers.length
    )
      context.addIssue({
        code: 'custom',
        path: ['payers'],
        message: 'Una persona no puede figurar dos veces como pagadora.',
      })
    const total = value.payers.reduce((sum, payer) => sum + payer.amount, 0)
    if (total !== value.amount)
      context.addIssue({
        code: 'custom',
        path: ['payers'],
        message: 'Los aportes deben coincidir exactamente con el total.',
      })
  })

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>
