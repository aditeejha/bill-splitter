import { describe, expect, it } from 'vitest'
import { splitEvenly } from '../src/split'

function amounts(totalCents: number, memberCount: number) {
  const members = Array.from({ length: memberCount }, (_, index) => index)
  return splitEvenly(totalCents, members).map((share) => share.amountCents)
}

describe('splitEvenly', () => {
  it('splits an even amount equally', () => {
    expect(amounts(900, 3)).toEqual([300, 300, 300])
  })

  it('gives the leftover cents to the first members', () => {
    expect(amounts(1000, 3)).toEqual([334, 333, 333])
    expect(amounts(1001, 3)).toEqual([334, 334, 333])
  })

  it('gives 0 to the last members when there are fewer cents than members', () => {
    expect(amounts(2, 3)).toEqual([1, 1, 0])
  })

  it('keeps the order of the members it was given', () => {
    const split = splitEvenly(5, ['Asha', 'Ben'])

    expect(split).toEqual([
      { member: 'Asha', amountCents: 3 },
      { member: 'Ben', amountCents: 2 },
    ])
  })

  it('always adds up to the total', () => {
    for (const memberCount of [1, 2, 3, 7, 13]) {
      for (const totalCents of [1, 99, 100, 101, 100001, 9_007_199_254_740_991]) {
        const sum = amounts(totalCents, memberCount).reduce((total, amount) => total + amount, 0)
        expect(sum).toBe(totalCents)
      }
    }
  })

  it('returns no shares for no members', () => {
    expect(amounts(1000, 0)).toEqual([])
  })
})
