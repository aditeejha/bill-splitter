const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatCents(cents: number) {
  return dollars.format(cents / 100)
}

// Turns what a person types, like "12", "1,250.5" or "$12.50", into whole cents. It reads the
// digits as text, so no floating point maths can lose a cent. Returns null for anything else.
export function parseDollars(input: string) {
  const match = /^\$?(\d{1,13})(?:\.(\d{0,2}))?$/.exec(input.replaceAll(',', '').trim())
  if (!match) return null

  const whole = Number(match[1])
  const fraction = Number((match[2] ?? '').padEnd(2, '0'))
  return whole * 100 + fraction
}

// The same rule as the API: everyone gets the base amount and the leftover cents go one by one
// to the people who joined first. Used only to preview a split before the bill is saved.
export function previewSplit<T>(totalCents: number, members: readonly T[]) {
  if (members.length === 0) return []

  const baseCents = Math.floor(totalCents / members.length)
  const leftoverCents = totalCents % members.length

  return members.map((member, index) => ({
    member,
    amountCents: baseCents + (index < leftoverCents ? 1 : 0),
  }))
}
