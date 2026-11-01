import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, RotateCw } from 'lucide-react'
import { useRef } from 'react'
import { ApiError, api, type Bill, type Share } from '../lib/api'
import { formatDayAndTime } from '../lib/format'
import { formatCents } from '../lib/money'
import { queryKeys } from '../lib/queries'
import { Avatar, Button, InlineError } from './ui'

type ShareRowProps = {
  homeId: string
  billId: string
  share: Share
  memberName: string
}

export function ShareRow({ homeId, billId, share, memberName }: ShareRowProps) {
  const queryClient = useQueryClient()
  // One key per payment attempt. If the request fails without a clear answer (timeout, network
  // error, 5xx) the retry sends the same key, so the server can never pay this share twice.
  const idempotencyKey = useRef<string | null>(null)

  const pay = useMutation({
    mutationFn: () => {
      idempotencyKey.current ??= crypto.randomUUID()
      return api.payShare(billId, share.id, idempotencyKey.current)
    },
    onSuccess: (paidShare) => {
      idempotencyKey.current = null
      queryClient.setQueryData(queryKeys.bills(homeId), (current: { bills: Bill[] } | undefined) =>
        current
          ? {
              bills: current.bills.map((bill) =>
                bill.id === billId
                  ? {
                      ...bill,
                      shares: bill.shares.map((s) => (s.id === paidShare.id ? paidShare : s)),
                    }
                  : bill,
              ),
            }
          : current,
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(homeId) })
    },
    onError: (error) => {
      // A 4xx answer is final, so the next click starts a new attempt with a new key.
      if (error instanceof ApiError && error.isClientError) idempotencyKey.current = null
      if (error instanceof ApiError && error.status === 409) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bills(homeId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.balances(homeId) })
      }
    },
  })

  const paid = share.paidAt !== null
  const errorMessage =
    pay.isError && !paid
      ? pay.error instanceof ApiError && pay.error.status === 409
        ? 'Someone else already paid this share.'
        : `Payment failed. ${pay.error.message}`
      : null

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <Avatar name={memberName} seed={share.memberId} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-800 text-sm">{memberName}</p>
          <p className="text-slate-500 text-xs">
            {paid && share.paidAt ? `Paid ${formatDayAndTime(share.paidAt)}` : 'Not paid yet'}
          </p>
        </div>
        <p
          className={`font-semibold text-sm tabular-nums ${paid ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`}
        >
          {formatCents(share.amountCents)}
        </p>
        <div className="flex w-24 justify-end">
          {paid ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 text-xs ring-1 ring-emerald-200 ring-inset">
              <Check className="size-3.5" aria-hidden />
              Paid
            </span>
          ) : (
            <Button
              variant="pay"
              className="w-full px-3 py-1.5"
              loading={pay.isPending}
              onClick={() => pay.mutate()}
              aria-label={`Pay ${formatCents(share.amountCents)} for ${memberName}`}
            >
              {pay.isPending ? (
                'Paying'
              ) : pay.isError ? (
                <>
                  <RotateCw className="size-3.5" aria-hidden />
                  Retry
                </>
              ) : (
                'Pay'
              )}
            </Button>
          )}
        </div>
      </div>
      {errorMessage && (
        <div className="mt-2 pl-10">
          <InlineError message={errorMessage} />
        </div>
      )}
    </li>
  )
}
