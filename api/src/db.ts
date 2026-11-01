import { splitEvenly } from './split'

export type Home = { id: string; name: string }
export type HomeSummary = Home & { memberCount: number }
export type Member = { id: string; homeId: string; name: string }
export type Share = { id: string; memberId: string; amountCents: number; paidAt: string | null }
export type Bill = {
  id: string
  homeId: string
  title: string
  totalCents: number
  shares: Share[]
}
export type BillWithDate = Bill & { createdAt: string }
export type Balance = { memberId: string; name: string; outstandingCents: number }

type BillRow = Omit<BillWithDate, 'shares'>
type ShareRow = Share & { billId: string }
type StoredShare = Share & { idempotencyKey: string | null }

const SHARE_COLUMNS = 'id, member_id AS memberId, amount_cents AS amountCents, paid_at AS paidAt'

function now() {
  return new Date().toISOString()
}

export async function listHomes(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT h.id, h.name,
         (SELECT COUNT(*) FROM members m WHERE m.home_id = h.id) AS memberCount
       FROM homes h
       ORDER BY h.created_at DESC, h.rowid DESC`,
    )
    .all<HomeSummary>()
  return results
}

export async function insertHome(db: D1Database, name: string) {
  const home: Home = { id: crypto.randomUUID(), name }
  await db
    .prepare('INSERT INTO homes (id, name, created_at) VALUES (?, ?, ?)')
    .bind(home.id, home.name, now())
    .run()
  return home
}

export function findHome(db: D1Database, homeId: string) {
  return db.prepare('SELECT id, name FROM homes WHERE id = ?').bind(homeId).first<Home>()
}

export async function listMembers(db: D1Database, homeId: string) {
  const { results } = await db
    .prepare(
      `SELECT id, home_id AS homeId, name FROM members
       WHERE home_id = ?
       ORDER BY position`,
    )
    .bind(homeId)
    .all<Member>()
  return results
}

// One statement checks that the home exists and gives the member the next position, so two
// members added at the same time can never get the same place in the order.
// Returns null when the home does not exist.
export function insertMember(db: D1Database, homeId: string, name: string) {
  return db
    .prepare(
      `INSERT INTO members (id, home_id, name, position, created_at)
       SELECT ?1, h.id, ?2,
         (SELECT COALESCE(MAX(position), 0) + 1 FROM members WHERE home_id = h.id),
         ?3
       FROM homes h
       WHERE h.id = ?4
       RETURNING id, home_id AS homeId, name`,
    )
    .bind(crypto.randomUUID(), name, now(), homeId)
    .first<Member>()
}

// The bill and all its shares are written in one batch. D1 runs a batch as a transaction, so
// a bill is never saved without its shares.
export async function insertBill(
  db: D1Database,
  home: Home,
  title: string,
  totalCents: number,
  members: readonly Member[],
) {
  const bill: Bill = {
    id: crypto.randomUUID(),
    homeId: home.id,
    title,
    totalCents,
    shares: splitEvenly(totalCents, members).map(({ member, amountCents }) => ({
      id: crypto.randomUUID(),
      memberId: member.id,
      amountCents,
      paidAt: null,
    })),
  }

  await db.batch([
    db
      .prepare(
        'INSERT INTO bills (id, home_id, title, total_cents, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(bill.id, bill.homeId, bill.title, bill.totalCents, now()),
    ...bill.shares.map((share) =>
      db
        .prepare('INSERT INTO shares (id, bill_id, member_id, amount_cents) VALUES (?, ?, ?, ?)')
        .bind(share.id, bill.id, share.memberId, share.amountCents),
    ),
  ])

  return bill
}

export async function listBills(db: D1Database, homeId: string) {
  const [bills, shares] = await Promise.all([
    db
      .prepare(
        `SELECT id, home_id AS homeId, title, total_cents AS totalCents, created_at AS createdAt
         FROM bills
         WHERE home_id = ?
         ORDER BY created_at DESC, rowid DESC`,
      )
      .bind(homeId)
      .all<BillRow>(),
    db
      .prepare(
        `SELECT s.id, s.bill_id AS billId, s.member_id AS memberId,
           s.amount_cents AS amountCents, s.paid_at AS paidAt
         FROM shares s
         JOIN bills b ON b.id = s.bill_id
         JOIN members m ON m.id = s.member_id
         WHERE b.home_id = ?
         ORDER BY m.position`,
      )
      .bind(homeId)
      .all<ShareRow>(),
  ])

  const sharesByBill = new Map<string, Share[]>()
  for (const { billId, ...share } of shares.results) {
    const list = sharesByBill.get(billId) ?? []
    list.push(share)
    sharesByBill.set(billId, list)
  }

  return bills.results.map(
    (bill): BillWithDate => ({ ...bill, shares: sharesByBill.get(bill.id) ?? [] }),
  )
}

export function billExists(db: D1Database, billId: string) {
  return db
    .prepare('SELECT 1 AS found FROM bills WHERE id = ?')
    .bind(billId)
    .first<{ found: number }>()
    .then((row) => row !== null)
}

// Only an unpaid share is updated. If two requests race, the database runs the updates one
// after the other, the first one changes the row and the second one finds paid_at already set.
// Returns null when nothing was updated.
export function markSharePaid(db: D1Database, billId: string, shareId: string, key: string) {
  return db
    .prepare(
      `UPDATE shares
       SET paid_at = ?, idempotency_key = ?
       WHERE id = ? AND bill_id = ? AND paid_at IS NULL
       RETURNING ${SHARE_COLUMNS}`,
    )
    .bind(now(), key, shareId, billId)
    .first<Share>()
}

export function findShare(db: D1Database, billId: string, shareId: string) {
  return db
    .prepare(
      `SELECT ${SHARE_COLUMNS}, idempotency_key AS idempotencyKey
       FROM shares
       WHERE id = ? AND bill_id = ?`,
    )
    .bind(shareId, billId)
    .first<StoredShare>()
}

export async function listBalances(db: D1Database, homeId: string) {
  const { results } = await db
    .prepare(
      `SELECT m.id AS memberId, m.name,
         COALESCE(SUM(CASE WHEN s.paid_at IS NULL THEN s.amount_cents ELSE 0 END), 0)
           AS outstandingCents
       FROM members m
       LEFT JOIN shares s ON s.member_id = m.id
       WHERE m.home_id = ?
       GROUP BY m.id
       ORDER BY m.position`,
    )
    .bind(homeId)
    .all<Balance>()
  return results
}
