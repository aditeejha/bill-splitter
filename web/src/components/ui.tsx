import { LoaderCircle, type LucideIcon, RotateCw, TriangleAlert } from 'lucide-react'
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useState } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'pay' | 'ghost'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 ring-inset hover:bg-slate-50',
  pay: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 font-medium text-sm transition focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export const inputClass =
  'w-full rounded-lg border-0 bg-white px-3 py-2 text-slate-900 text-sm shadow-xs ring-1 ring-slate-200 ring-inset transition placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50'

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] ${className}`}
    >
      {children}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />
}

// True once something has been loading for longer than the delay, so the page can say the
// server is slow instead of showing a skeleton with no explanation.
export function useIsSlow(active: boolean, delayMs = 2500) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) {
      setSlow(false)
      return
    }
    const timer = setTimeout(() => setSlow(true), delayMs)
    return () => clearTimeout(timer)
  }, [active, delayMs])
  return slow
}

export function SlowNotice({ active }: { active: boolean }) {
  const slow = useIsSlow(active)
  if (!slow) return null
  return (
    <p className="flex items-center gap-2 text-slate-500 text-xs" role="status">
      <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
      The server is slow to answer. Still trying…
    </p>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-300 border-dashed bg-white/60 px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-slate-500 text-sm">{description}</p>
      {children && <div className="mt-5 w-full max-w-sm">{children}</div>}
    </div>
  )
}

export function ErrorState({
  title,
  message,
  onRetry,
  retrying = false,
  compact = false,
}: {
  title: string
  message: string
  onRetry?: () => void
  retrying?: boolean
  compact?: boolean
}) {
  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 text-left ${compact ? 'p-3' : 'p-5'}`}
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-rose-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-rose-900 text-sm">{title}</p>
        <p className="mt-0.5 text-rose-700 text-sm">{message}</p>
        {onRetry && (
          <Button variant="secondary" className="mt-3" onClick={onRetry} loading={retrying}>
            {!retrying && <RotateCw className="size-4" aria-hidden />}
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-start gap-1.5 text-rose-600 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  )
}

const avatarColors = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
]

function colorFor(seed: string) {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return avatarColors[hash % avatarColors.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function Avatar({
  name,
  seed,
  size = 'md',
}: {
  name: string
  seed: string
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'sm' ? 'size-7 text-[11px]' : 'size-9 text-xs'
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${sizeClass} ${colorFor(seed)}`}
    >
      {initials(name)}
    </span>
  )
}
