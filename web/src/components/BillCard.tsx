import { CircleCheck, Receipt } from 'lucide-react'
import type { Bill } from '../lib/api'
import { formatDay } from '../lib/format'
import { formatCents } from '../lib/money'
import { ShareRow } from './ShareRow'
import { Card } from './ui'

type BillCardProps = {
  bill: Bill
  memberNames: Map<string, string>
}

export function BillCard({ bill, memberNames }: BillCardProps) {
  const paidShares = bill.shares.filter((share) => share.paidAt !== null)
  const paidCents = paidShares.reduce((total, share) => total + share.amountCents, 0)
  const settled = paidShares.length === bill.shares.length
  const progress = bill.totalCents === 0 ? 0 : Math.round((paidCents / bill.totalCents) * 100)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
            settled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {settled ? (
            <CircleCheck className="size-5" aria-hidden />
          ) : (
            <Receipt className="size-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900">{bill.title}</h3>
          <p className="text-slate-500 text-xs">
            Added {formatDay(bill.createdAt)} · split {bill.shares.length} ways
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-lg text-slate-900 tabular-nums">
            {formatCents(bill.totalCents)}
          </p>
          <p className={`text-xs ${settled ? 'text-emerald-600' : 'text-slate-500'}`}>
            {settled ? 'Settled' : `${formatCents(bill.totalCents - paidCents)} left`}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-5">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`${bill.title} paid`}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-slate-500 text-xs">
          {paidShares.length} of {bill.shares.length} paid
        </p>
      </div>

      <ul className="mt-3 divide-y divide-slate-100 border-slate-100 border-t px-4 py-3 sm:px-5">
        {bill.shares.map((share) => (
          <ShareRow
            key={share.id}
            homeId={bill.homeId}
            billId={bill.id}
            share={share}
            memberName={memberNames.get(share.memberId) ?? 'Member'}
          />
        ))}
      </ul>
    </Card>
  )
}
