export const expenseCategories = [
  { value: 'food', label: 'Comida' },
  { value: 'drink', label: 'Bebida' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'cannabis', label: 'Porro' },
  { value: 'other', label: 'Otros' },
] as const

export type ExpenseCategory = (typeof expenseCategories)[number]['value']

export function categoryLabel(category: ExpenseCategory) {
  return expenseCategories.find((item) => item.value === category)?.label ?? 'Otros'
}
