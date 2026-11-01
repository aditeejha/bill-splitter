import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { createBill, createHome } from './helpers'

// These tests write to the database directly, past the API, to show that the schema itself
// refuses bad data.
const now = new Date().toISOString()

function run(sql: string, ...values: unknown[]) {
  return env.DB.prepare(sql)
    .bind(...values)
    .run()
}

describe('database constraints', () => {
  it('refuses a member of a home that does not exist', async () => {
    await expect(
      run(
        'INSERT INTO members (id, home_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)',
        crypto.randomUUID(),
        'no-such-home',
        'Asha',
        1,
        now,
      ),
    ).rejects.toThrow(/FOREIGN KEY/)
  })

  it('refuses two members in the same place of the order', async () => {
    const { homeId } = await createHome(['Asha'])

    await expect(
      run(
        'INSERT INTO members (id, home_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)',
        crypto.randomUUID(),
        homeId,
        'Ben',
        1,
        now,
      ),
    ).rejects.toThrow(/UNIQUE/)
  })

  it.each([0, -5, 10.5])('refuses a bill with the total %j', async (totalCents) => {
    const { homeId } = await createHome(['Asha'])

    await expect(
      run(
        'INSERT INTO bills (id, home_id, title, total_cents, created_at) VALUES (?, ?, ?, ?, ?)',
        crypto.randomUUID(),
        homeId,
        'Rent',
        totalCents,
        now,
      ),
    ).rejects.toThrow(/CHECK/)
  })

  it('refuses a second share for the same member on the same bill', async () => {
    const { homeId, members } = await createHome(['Asha'])
    const bill = await createBill(homeId, 100)

    await expect(
      run(
        'INSERT INTO shares (id, bill_id, member_id, amount_cents) VALUES (?, ?, ?, ?)',
        crypto.randomUUID(),
        bill.body.id,
        members[0]?.id,
        100,
      ),
    ).rejects.toThrow(/UNIQUE/)
  })

  it('refuses a paid share without the key that paid it', async () => {
    const { homeId } = await createHome(['Asha'])
    const bill = await createBill(homeId, 100)

    await expect(
      run('UPDATE shares SET paid_at = ? WHERE bill_id = ?', now, bill.body.id),
    ).rejects.toThrow(/CHECK/)
  })
})
