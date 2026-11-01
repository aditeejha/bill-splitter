import type { ErrorComponentProps } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { Button } from './ui'

// Shown by the router if a page throws while rendering, so one broken piece never leaves the
// person looking at a blank screen.
export function CrashScreen({ error, reset }: ErrorComponentProps) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-rose-50 text-rose-500">
          <TriangleAlert className="size-6" aria-hidden />
        </div>
        <h1 className="font-semibold text-lg text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-slate-500 text-sm">
          {error instanceof Error ? error.message : 'The page hit an unexpected problem.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
          <Button onClick={() => window.location.assign('/')}>Go to start</Button>
        </div>
      </div>
    </div>
  )
}
