export function parseAmount(value: string): number | null {
  const compactSource = value.trim().toLowerCase().replace(/\$/g, '').replace(/\s/g, '')
  if (compactSource.endsWith('k') && compactSource.includes('.')) return null
  const normalized = compactSource.replace(/\./g, '')
  const match = /^(\d+)(k)?$/.exec(normalized)
  if (!match) return null
  const base = Number(match[1])
  if (!Number.isSafeInteger(base)) return null
  const result = match[2] ? base * 1000 : base
  return Number.isSafeInteger(result) ? result : null
}

export function roundToExpenseAmount(amount: number): number | null {
  if (!Number.isSafeInteger(amount) || amount <= 0) return null
  return amount
}

export function formatMoney(amount: number): string {
  return `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(amount)}`
}

export function formatCompactMoney(amount: number): string {
  if (amount >= 1000 && amount % 1000 === 0) return `$${amount / 1000}k`
  return formatMoney(amount)
}
