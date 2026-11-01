// Splits a total between members. Every member gets the same base amount, and the cents that
// are left over go one by one to the members that were added first.
export function splitEvenly<T>(totalCents: number, members: readonly T[]) {
  if (members.length === 0) return []

  const baseCents = Math.floor(totalCents / members.length)
  const leftoverCents = totalCents % members.length

  return members.map((member, index) => ({
    member,
    amountCents: baseCents + (index < leftoverCents ? 1 : 0),
  }))
}
