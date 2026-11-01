import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { api } from '../lib/api'
import { formatCents } from '../lib/money'
import { balancesQuery, queryKeys } from '../lib/queries'
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  InlineError,
  inputClass,
  Skeleton,
  SlowNotice,
} from './ui'

export function MembersPanel({ homeId }: { homeId: string }) {
  const inputId = useId()
  const queryClient = useQueryClient()
  const balances = useQuery(balancesQuery(homeId))
  const [name, setName] = useState('')

  const addMember = useMutation({
    mutationFn: (memberName: string) => api.addMember(homeId, memberName),
    onSuccess: () => {
      setName('')
      queryClient.invalidateQueries({ queryKey: queryKeys.home(homeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.homes })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim() === '') return
    addMember.mutate(name.trim())
  }

  return (
    <Card className="p-4 sm:p-5 xl:sticky xl:top-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Users className="size-4 text-slate-400" aria-hidden />
          People
        </h2>
        {balances.data && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 text-xs">
            {balances.data.balances.length}
          </span>
        )}
      </div>
      <p className="mb-4 text-slate-500 text-xs">
        In the order they joined, with what each still owes.
      </p>

      {balances.data ? (
        balances.data.balances.length === 0 ? (
          <div className="rounded-xl border border-slate-300 border-dashed px-4 py-6 text-center">
            <p className="font-medium text-slate-700 text-sm">No one lives here yet</p>
            <p className="mt-1 text-slate-500 text-xs">Add the people who share this home.</p>
          </div>
        ) : (
          <ol className="space-y-1">
            {balances.data.balances.map((balance, index) => (
              <li key={balance.memberId} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                <span className="w-4 text-right text-slate-400 text-xs tabular-nums">
                  {index + 1}
                </span>
                <Avatar name={balance.name} seed={balance.memberId} />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800 text-sm">
                  {balance.name}
                </span>
                {balance.outstandingCents > 0 ? (
                  <span className="text-right">
                    <span className="block font-semibold text-amber-700 text-sm tabular-nums">
                      {formatCents(balance.outstandingCents)}
                    </span>
                    <span className="block text-[11px] text-slate-400">owes</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 text-xs">
                    Settled
                  </span>
                )}
              </li>
            ))}
          </ol>
        )
      ) : balances.isError ? (
        <ErrorState
          compact
          title="Could not load balances"
          message={balances.error.message}
          onRetry={() => balances.refetch()}
          retrying={balances.isFetching}
        />
      ) : (
        <div className="space-y-3" role="status" aria-label="Loading people">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 px-1">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3.5 w-14" />
            </div>
          ))}
          <SlowNotice active={balances.isPending} />
        </div>
      )}

      <form onSubmit={submit} className="mt-4 space-y-2 border-slate-100 border-t pt-4">
        <label htmlFor={inputId} className="sr-only">
          New person's name
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            className={inputClass}
            placeholder="Add a person"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            loading={addMember.isPending}
            disabled={name.trim() === ''}
            aria-label="Add person"
          >
            {!addMember.isPending && <UserPlus className="size-4" aria-hidden />}
            Add
          </Button>
        </div>
        <InlineError message={addMember.isError ? addMember.error.message : null} />
      </form>
    </Card>
  )
}
