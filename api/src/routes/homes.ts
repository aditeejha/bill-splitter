import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import {
  findHome,
  insertBill,
  insertHome,
  insertMember,
  listBalances,
  listBills,
  listHomes,
  listMembers,
} from '../db'
import type { AppEnv } from '../env'
import { readJsonObject, requirePositiveCents, requireText } from '../validation'

export const homes = new Hono<AppEnv>()

async function requireHome(db: D1Database, homeId: string) {
  const home = await findHome(db, homeId)
  if (!home) throw new HTTPException(404, { message: 'Home not found' })
  return home
}

homes.get('/homes', async (c) => {
  return c.json({ homes: await listHomes(c.env.DB) })
})

homes.post('/homes', async (c) => {
  const body = await readJsonObject(c)
  const name = requireText(body.name, 'name', 80)

  return c.json(await insertHome(c.env.DB, name), 201)
})

homes.get('/homes/:homeId', async (c) => {
  const home = await requireHome(c.env.DB, c.req.param('homeId'))
  const members = await listMembers(c.env.DB, home.id)

  return c.json({ ...home, members })
})

homes.post('/homes/:homeId/members', async (c) => {
  const body = await readJsonObject(c)
  const name = requireText(body.name, 'name', 80)

  const member = await insertMember(c.env.DB, c.req.param('homeId'), name)
  if (!member) throw new HTTPException(404, { message: 'Home not found' })

  return c.json(member, 201)
})

homes.get('/homes/:homeId/bills', async (c) => {
  const home = await requireHome(c.env.DB, c.req.param('homeId'))

  return c.json({ bills: await listBills(c.env.DB, home.id) })
})

homes.post('/homes/:homeId/bills', async (c) => {
  const body = await readJsonObject(c)
  const title = requireText(body.title, 'title', 120)
  const totalCents = requirePositiveCents(body.totalCents, 'totalCents')

  const home = await requireHome(c.env.DB, c.req.param('homeId'))
  const members = await listMembers(c.env.DB, home.id)
  if (members.length === 0) {
    throw new HTTPException(422, { message: 'Add at least one member before adding a bill' })
  }

  return c.json(await insertBill(c.env.DB, home, title, totalCents, members), 201)
})

homes.get('/homes/:homeId/balances', async (c) => {
  const home = await requireHome(c.env.DB, c.req.param('homeId'))

  return c.json({ balances: await listBalances(c.env.DB, home.id) })
})
