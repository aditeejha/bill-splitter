import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { billExists, findShare, markSharePaid } from '../db'
import type { AppEnv } from '../env'
import { requireIdempotencyKey } from '../validation'

export const bills = new Hono<AppEnv>()

bills.post('/bills/:billId/shares/:shareId/pay', async (c) => {
  const key = requireIdempotencyKey(c.req.header('Idempotency-Key'))
  const { billId, shareId } = c.req.param()

  const paid = await markSharePaid(c.env.DB, billId, shareId, key)
  if (paid) return c.json(paid, 200)

  // Nothing was updated: the share does not exist, or it is already paid.
  const share = await findShare(c.env.DB, billId, shareId)
  if (!share) {
    const message = (await billExists(c.env.DB, billId)) ? 'Share not found' : 'Bill not found'
    throw new HTTPException(404, { message })
  }
  if (share.idempotencyKey !== key) {
    throw new HTTPException(409, { message: 'This share is already paid' })
  }

  return c.json(
    {
      id: share.id,
      memberId: share.memberId,
      amountCents: share.amountCents,
      paidAt: share.paidAt,
    },
    200,
  )
})
