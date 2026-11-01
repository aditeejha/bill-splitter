import { createRootRoute, Outlet } from '@tanstack/react-router'
import { SquareSplitHorizontal } from 'lucide-react'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(16,185,129,0.14),transparent)]"
      />
      <header className="relative border-slate-200/70 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-emerald-400">
            <SquareSplitHorizontal className="size-4.5" aria-hidden />
          </span>
          <span className="font-semibold tracking-tight">HomeSplit</span>
          <span className="hidden text-slate-400 text-sm sm:inline">
            Shared bills, split fairly to the cent
          </span>
        </div>
      </header>
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </div>
    </div>
  )
}
