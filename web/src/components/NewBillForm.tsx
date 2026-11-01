import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { api, type Member } from '../lib/api'
import { plural } from '../lib/format'
import { formatCents, parseDollars, previewSplit } from '../lib/money'
import { queryKeys } from '../lib/queries'
import { Avatar, Button, Card, InlineError, inputClass } from './ui'

type NewBillFormProps = {
  homeId: string
  members: Member[]
}

export function NewBillForm({ homeId, members }: NewBillFormProps) {
  const titleId = useId()
  const amountId = useId()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')

  const totalCents = parseDollars(amount)
  const amountProblem =
    amount.trim() === ''
      ? null
      : totalCents === null
        ? 'Enter an amount like 42 or 42.50.'
        : totalCents <= 0
          ? 'The amount must be more than $0.00.'
          : null
  const noMembers = members.length === 0
  const canSubmit =
    !noMembers && title.trim() !== '' && totalCents !== null && totalCents > 0 && !amountProblem

  const createBill = useMutation({
    mutationFn: (bill: { title: string; totalCents: number }) =>
      api.createBill(homeId, bill.title, bill.totalCents),
    onSuccess: () => {
      setTitle('')
      setAmount('')
      queryClient.invalidateQueries({ queryKey: queryKeys.bills(homeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(homeId) })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || totalCents === null) return
    createBill.mutate({ title: title.trim(), totalCents })
  }

  const preview = totalCents !== null && totalCents > 0 ? previewSplit(totalCents, members) : []

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Add a bill</h2>
        <p className="text-slate-500 text-xs">
          {noMembers
            ? 'Add people first'
            : `Split evenly between ${plural(members.length, 'person', 'people')}`}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <label htmlFor={titleId} className="sr-only">
              What is the bill for?
            </label>
            <input
              id={titleId}
              className={inputClass}
              placeholder="What is it for? e.g. Electricity"
              value={title}
              maxLength={120}
              disabled={noMembers}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="relative sm:w-40">
            <label htmlFor={amountId} className="sr-only">
              Total amount in dollars
            </label>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">
              $
            </span>
            <input
              id={amountId}
              className={`${inputClass} pl-7 tabular-nums`}
              placeholder="0.00"
              inputMode="decimal"
              value={amount}
              disabled={noMembers}
              aria-invalid={amountProblem ? true : undefined}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <Button type="submit" loading={createBill.isPending} disabled={!canSubmit}>
            {!createBill.isPending && <Plus className="size-4" aria-hidden />}
            Add bill
          </Button>
        </div>

        <InlineError message={amountProblem} />
        <InlineError message={createBill.isError ? createBill.error.message : null} />

        {noMembers ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600 text-sm">
            A bill is split between the people in a home, so add at least one person first.
          </p>
        ) : (
          preview.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-2 font-medium text-slate-500 text-xs uppercase tracking-wide">
                Preview
              </p>
              <ul className="flex flex-wrap gap-2">
                {preview.map(({ member, amountCents }) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm ring-1 ring-slate-200"
                  >
                    <Avatar name={member.name} seed={member.id} size="sm" />
                    <span className="text-slate-700">{member.name}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatCents(amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
              {totalCents !== null && totalCents % members.length !== 0 && (
                <p className="mt-2 text-slate-500 text-xs">
                  It does not split evenly, so the extra cents go to the people who joined first.
                </p>
              )}
            </div>
          )
        )}
      </form>
    </Card>
  )
}
