import { describe, expect, it } from 'vitest'
import { type Balance, type Bill, call, createBill, createHome, type Share } from './helpers'

function pay(billId: string, shareId: string, key: string) {
  return call<Share>('POST', `/api/bills/${billId}/shares/${shareId}/pay`, {
    headers: { 'Idempotency-Key': key },
  })
}

function balances(homeId: string) {
  return call<{ balances: Balance[] }>('GET', `/api/homes/${homeId}/balances`)
}

async function homeWithBill(totalCents = 1000) {
  const { homeId, members } = await createHome(['Asha', 'Ben'])
  const bill = await createBill(homeId, totalCents)
  const [firstShare, secondShare] = bill.body.shares
  if (!firstShare || !secondShare) throw new Error('bill has no shares')
  return { homeId, members, bill: bill.body, firstShare, secondShare }
}

describe('error responses', () => {
  it('answers JSON for a route that does not exist', async () => {
    const response = await call('GET', '/api/nothing-here')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: expect.any(String) })
  })

  it('answers 400 with JSON for a body that is not JSON', async () => {
    const { homeId } = await createHome(['Asha'])
    const response = await call('POST', `/api/homes/${homeId}/bills`, { body: undefined })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: expect.any(String) })
  })

  it.each([{ name: '' }, { name: '   ' }, { name: 42 }, {}])(
    'rejects the home %j',
    async (body) => {
      const response = await call('POST', '/api/homes', { body })

      expect(response.status).toBe(422)
      expect(response.body).toEqual({ error: expect.any(String) })
    },
  )

  it('rejects a bill without a title', async () => {
    const { homeId } = await createHome(['Asha'])
    const response = await call('POST', `/api/homes/${homeId}/bills`, {
      body: { title: ' ', totalCents: 100 },
    })

    expect(response.status).toBe(422)
  })

  it.each([Number.MAX_SAFE_INTEGER + 1, true, [100], { cents: 100 }])(
    'rejects the amount %j',
    async (totalCents) => {
      const { homeId } = await createHome(['Asha'])
      const response = await call('POST', `/api/homes/${homeId}/bills`, {
        body: { title: 'Rent', totalCents },
      })

      expect(response.status).toBe(422)
    },
  )

  it('does not save a bill for a home with no members', async () => {
    const { homeId } = await createHome([])
    await createBill(homeId, 1000)

    const list = await call<{ bills: Bill[] }>('GET', `/api/homes/${homeId}/bills`)
    expect(list.body.bills).toEqual([])
  })
})

describe('members', () => {
  it('keeps members in the order they were added', async () => {
    const { homeId, members } = await createHome(['Chitra', 'Asha', 'Ben'])

    const home = await call<{ members: { id: string }[] }>('GET', `/api/homes/${homeId}`)

    expect(home.body.members.map((member) => member.id)).toEqual(members.map((m) => m.id))
  })

  it('keeps every member when many are added at the same time', async () => {
    const home = await call<{ id: string }>('POST', '/api/homes', { body: { name: 'Busy flat' } })
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

    const added = await Promise.all(
      names.map((name) => call('POST', `/api/homes/${home.body.id}/members`, { body: { name } })),
    )

    expect(added.map((response) => response.status)).toEqual(names.map(() => 201))
    const list = await balances(home.body.id)
    expect(list.body.balances).toHaveLength(names.length)
  })
})

describe('bills', () => {
  it('gives 0 cents to the last members when the total is smaller than the member count', async () => {
    const { homeId } = await createHome(['Asha', 'Ben', 'Chitra'])

    const bill = await createBill(homeId, 2)

    expect(bill.body.shares.map((share) => share.amountCents)).toEqual([1, 1, 0])
  })

  it('answers exactly the documented fields', async () => {
    const { homeId, members } = await createHome(['Asha'])

    const bill = await createBill(homeId, 700)

    expect(bill.body).toEqual({
      id: expect.any(String),
      homeId,
      title: 'Electricity',
      totalCents: 700,
      shares: [
        { id: expect.any(String), memberId: members[0]?.id, amountCents: 700, paidAt: null },
      ],
    })
  })

  it('lists the bills of a home with their shares, newest first', async () => {
    const { homeId } = await createHome(['Asha', 'Ben'])
    const first = await createBill(homeId, 100)
    const second = await createBill(homeId, 200)

    const list = await call<{ bills: Bill[] }>('GET', `/api/homes/${homeId}/bills`)

    expect(list.status).toBe(200)
    expect(list.body.bills.map((bill) => bill.id)).toEqual([second.body.id, first.body.id])
    expect(list.body.bills[1]?.shares).toEqual(first.body.shares)
  })

  it('returns 404 for the bills of a home that does not exist', async () => {
    const list = await call('GET', '/api/homes/does-not-exist/bills')

    expect(list.status).toBe(404)
  })
})

describe('paying a share', () => {
  it('pays only once when the same request is sent twice at the same time', async () => {
    const { homeId, bill, firstShare } = await homeWithBill()
    const key = crypto.randomUUID()

    const [first, second] = await Promise.all([
      pay(bill.id, firstShare.id, key),
      pay(bill.id, firstShare.id, key),
    ])

    expect([first.status, second.status]).toEqual([200, 200])
    expect(second.body).toEqual(first.body)
    const outstanding = await balances(homeId)
    expect(outstanding.body.balances.map((b) => b.outstandingCents)).toEqual([0, 500])
  })

  it('lets only one of two different payments of the same share succeed', async () => {
    const { homeId, bill, firstShare } = await homeWithBill()

    const results = await Promise.all(
      Array.from({ length: 5 }, () => pay(bill.id, firstShare.id, crypto.randomUUID())),
    )

    const statuses = results.map((result) => result.status).sort()
    expect(statuses).toEqual([200, 409, 409, 409, 409])
    const outstanding = await balances(homeId)
    expect(outstanding.body.balances.map((b) => b.outstandingCents)).toEqual([0, 500])
  })

  it('still returns the first result when the same key is replayed after a conflict', async () => {
    const { bill, firstShare } = await homeWithBill()
    const key = crypto.randomUUID()
    const first = await pay(bill.id, firstShare.id, key)
    await pay(bill.id, firstShare.id, crypto.randomUUID())

    const replay = await pay(bill.id, firstShare.id, key)

    expect(replay.status).toBe(200)
    expect(replay.body).toEqual(first.body)
  })

  it('answers exactly the documented fields', async () => {
    const { bill, firstShare } = await homeWithBill()

    const paid = await pay(bill.id, firstShare.id, crypto.randomUUID())

    expect(paid.body).toEqual({ ...firstShare, paidAt: expect.any(String) })
  })

  it('returns 404 for a share that belongs to another bill', async () => {
    const one = await homeWithBill()
    const other = await homeWithBill()

    const paid = await pay(one.bill.id, other.firstShare.id, crypto.randomUUID())

    expect(paid.status).toBe(404)
  })

  it('rejects a blank Idempotency-Key', async () => {
    const { bill, firstShare } = await homeWithBill()

    const paid = await pay(bill.id, firstShare.id, '   ')

    expect(paid.status).toBe(400)
    expect(paid.body).toEqual({ error: expect.any(String) })
  })

  it('pays a different share with a key that was used before', async () => {
    const { bill, firstShare, secondShare } = await homeWithBill()
    const key = crypto.randomUUID()
    await pay(bill.id, firstShare.id, key)

    const second = await pay(bill.id, secondShare.id, key)

    expect(second.status).toBe(200)
    expect(second.body.id).toBe(secondShare.id)
  })
})

describe('balances', () => {
  it('shows 0 for a member who has never had a bill', async () => {
    const { homeId, members } = await createHome(['Asha'])

    const outstanding = await balances(homeId)

    expect(outstanding.body.balances).toEqual([
      { memberId: members[0]?.id, name: 'Asha', outstandingCents: 0 },
    ])
  })

  it('returns an empty list for a home with no members', async () => {
    const { homeId } = await createHome([])

    const outstanding = await balances(homeId)

    expect(outstanding.status).toBe(200)
    expect(outstanding.body.balances).toEqual([])
  })
})
