import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { House } from 'lucide-react'
import { useEffect } from 'react'
import { HomeSidebar } from '../components/HomeSidebar'
import { HomeView } from '../components/HomeView'
import { NewHomeForm } from '../components/NewHomeForm'
import { EmptyState } from '../components/ui'
import { homesQuery } from '../lib/queries'

type PageSearch = { home?: string }

export const Route = createFileRoute('/')({
  // The selected home lives in the URL (?home=...), so a refresh or a shared link opens it again.
  validateSearch: (search: Record<string, unknown>): PageSearch =>
    typeof search.home === 'string' && search.home !== '' ? { home: search.home } : {},
  component: BillsPage,
})

function BillsPage() {
  const { home: homeId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const homes = useQuery(homesQuery())

  function openHome(id: string | undefined, replace = false) {
    navigate({ search: id ? { home: id } : {}, replace })
  }

  const firstHomeId = homes.data?.homes[0]?.id
  useEffect(() => {
    if (!homeId && firstHomeId) navigate({ search: { home: firstHomeId }, replace: true })
  }, [homeId, firstHomeId, navigate])

  return (
    <div className="relative grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside>
        <HomeSidebar selectedHomeId={homeId} onSelect={(home) => openHome(home.id)} />
      </aside>
      <main className="min-w-0">
        {homeId ? (
          <HomeView key={homeId} homeId={homeId} onLeave={() => openHome(undefined)} />
        ) : homes.data?.homes.length === 0 ? (
          <EmptyState
            icon={House}
            title="Create your first home"
            description="A home is the group that shares bills, like a flat or a house. Add the people who live there, then split bills between them."
          >
            <NewHomeForm onCreated={(home) => openHome(home.id)} />
          </EmptyState>
        ) : (
          <EmptyState
            icon={House}
            title="Pick a home"
            description="Choose a home from the list to see its bills and who still owes what."
          />
        )}
      </main>
    </div>
  )
}
