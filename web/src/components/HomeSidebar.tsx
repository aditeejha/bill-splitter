import { useQuery } from '@tanstack/react-query'
import { ChevronRight, House } from 'lucide-react'
import type { Home } from '../lib/api'
import { plural } from '../lib/format'
import { homesQuery } from '../lib/queries'
import { NewHomeForm } from './NewHomeForm'
import { Card, ErrorState, Skeleton, SlowNotice } from './ui'

type HomeSidebarProps = {
  selectedHomeId: string | undefined
  onSelect: (home: Pick<Home, 'id'>) => void
}

export function HomeSidebar({ selectedHomeId, onSelect }: HomeSidebarProps) {
  const homes = useQuery(homesQuery())

  return (
    <Card className="p-4 lg:sticky lg:top-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 text-sm">Homes</h2>
        {homes.data && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 text-xs">
            {homes.data.homes.length}
          </span>
        )}
      </div>

      <NewHomeForm onCreated={onSelect} />

      <div className="mt-4 border-slate-100 border-t pt-3">
        {homes.data ? (
          homes.data.homes.length === 0 ? (
            <p className="px-1 py-2 text-slate-500 text-sm">No homes yet. Create one above.</p>
          ) : (
            <ul className="-mx-1 max-h-72 space-y-0.5 overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
              {homes.data.homes.map((home) => {
                const selected = home.id === selectedHomeId
                return (
                  <li key={home.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(home)}
                      aria-current={selected ? 'page' : undefined}
                      className={`group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                        selected ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                          selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <House className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900 text-sm">
                          {home.name}
                        </span>
                        <span className="block text-slate-500 text-xs">
                          {plural(home.memberCount, 'person', 'people')}
                        </span>
                      </span>
                      <ChevronRight
                        className={`size-4 shrink-0 transition ${
                          selected
                            ? 'text-emerald-600'
                            : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-400'
                        }`}
                        aria-hidden
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          )
        ) : homes.isError ? (
          <ErrorState
            compact
            title="Could not load homes"
            message={homes.error.message}
            onRetry={() => homes.refetch()}
            retrying={homes.isFetching}
          />
        ) : (
          <div className="space-y-2" role="status" aria-label="Loading homes">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 px-1 py-1.5">
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
            <SlowNotice active={homes.isPending} />
          </div>
        )}
      </div>
    </Card>
  )
}
