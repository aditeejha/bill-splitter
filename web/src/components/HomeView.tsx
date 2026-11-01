import { useQuery } from '@tanstack/react-query'
import { House, Receipt, SearchX } from 'lucide-react'
import { useMemo } from 'react'
import { ApiError, type Member } from '../lib/api'
import { plural } from '../lib/format'
import { formatCents } from '../lib/money'
import { balancesQuery, billsQuery, homeQuery } from '../lib/queries'
import { BillCard } from './BillCard'
import { MembersPanel } from './MembersPanel'
import { NewBillForm } from './NewBillForm'
import { Button, EmptyState, ErrorState, Skeleton, SlowNotice } from './ui'

type HomeViewProps = {
  homeId: string
  onLeave: () => void
}

export function HomeView({ homeId, onLeave }: HomeViewProps) {
  const home = useQuery(homeQuery(homeId))

  if (home.data) {
    return (
      <div className="space-y-6">
        <HomeHeader homeId={homeId} name={home.data.name} memberCount={home.data.members.length} />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <NewBillForm homeId={homeId} members={home.data.members} />
            <BillList homeId={homeId} members={home.data.members} />
          </div>
          <MembersPanel homeId={homeId} />
        </div>
      </div>
    )
  }

  if (home.isError) {
    if (home.error instanceof ApiError && home.error.status === 404) {
      return (
        <EmptyState
          icon={SearchX}
          title="This home does not exist"
          description="The link may be old, or the home was never created. Pick another home from the list."
        >
          <Button variant="secondary" onClick={onLeave}>
            Back to my homes
          </Button>
        </EmptyState>
      )
    }
    return (
      <ErrorState
        title="Could not load this home"
        message={home.error.message}
        onRetry={() => home.refetch()}
        retrying={home.isFetching}
      />
    )
  }

  return (
    <div className="space-y-6" role="status" aria-label="Loading home">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
      <Skeleton className="h-36 rounded-2xl" />
      <SlowNotice active={home.isPending} />
    </div>
  )
}

function HomeHeader({
  homeId,
  name,
  memberCount,
}: {
  homeId: string
  name: string
  memberCount: number
}) {
  const bills = useQuery(billsQuery(homeId))
  const balances = useQuery(balancesQuery(homeId))

  const owedCents = balances.data?.balances.reduce(
    (total, balance) => total + balance.outstandingCents,
    0,
  )

  return (
    <header>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-emerald-600/25 shadow-lg">
          <House className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-emerald-700 text-xs uppercase tracking-wider">Home</p>
          <h1 className="truncate font-semibold text-2xl text-slate-900 tracking-tight">{name}</h1>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="People" value={String(memberCount)} />
        <Stat
          label="Bills"
          value={bills.data ? String(bills.data.bills.length) : bills.isError ? '–' : null}
        />
        <Stat
          label="Still owed"
          value={owedCents !== undefined ? formatCents(owedCents) : balances.isError ? '–' : null}
          highlight={owedCents !== undefined && owedCents > 0}
        />
      </dl>
    </header>
  )
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string | null
  highlight?: boolean
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-4">
      <dt className="text-slate-500 text-xs">{label}</dt>
      <dd
        className={`mt-1 break-words font-semibold text-base tabular-nums sm:text-xl ${highlight ? 'text-amber-700' : 'text-slate-900'}`}
      >
        {value ?? <Skeleton className="mt-1 h-6 w-16" />}
      </dd>
    </div>
  )
}

function BillList({ homeId, members }: { homeId: string; members: Member[] }) {
  const bills = useQuery(billsQuery(homeId))
  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members],
  )

  if (bills.data) {
    return (
      <section aria-label="Bills" className="space-y-4">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-semibold text-slate-900">Bills</h2>
          <p className="text-slate-500 text-xs">{plural(bills.data.bills.length, 'bill')}</p>
        </div>
        {bills.isError && (
          <ErrorState
            compact
            title="Could not refresh the bills"
            message={`Showing the last bills that loaded. ${bills.error.message}`}
            onRetry={() => bills.refetch()}
            retrying={bills.isFetching}
          />
        )}
        {bills.data.bills.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No bills yet"
            description="Add the first bill above. It is split between everyone in this home, to the cent."
          />
        ) : (
          <ul className="space-y-4">
            {bills.data.bills.map((bill) => (
              <li key={bill.id}>
                <BillCard bill={bill} memberNames={memberNames} />
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  if (bills.isError) {
    return (
      <ErrorState
        title="Could not load the bills"
        message={bills.error.message}
        onRetry={() => bills.refetch()}
        retrying={bills.isFetching}
      />
    )
  }

  return (
    <div className="space-y-4" role="status" aria-label="Loading bills">
      {[0, 1].map((card) => (
        <div key={card} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <SlowNotice active={bills.isPending} />
    </div>
  )
}
