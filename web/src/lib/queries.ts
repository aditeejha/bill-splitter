import { queryOptions } from '@tanstack/react-query'
import { api } from './api'

export const queryKeys = {
  homes: ['homes'] as const,
  home: (homeId: string) => ['home', homeId] as const,
  bills: (homeId: string) => ['home', homeId, 'bills'] as const,
  balances: (homeId: string) => ['home', homeId, 'balances'] as const,
}

export const homesQuery = () =>
  queryOptions({
    queryKey: queryKeys.homes,
    queryFn: ({ signal }) => api.listHomes(signal),
  })

export const homeQuery = (homeId: string) =>
  queryOptions({
    queryKey: queryKeys.home(homeId),
    queryFn: ({ signal }) => api.getHome(homeId, signal),
  })

export const billsQuery = (homeId: string) =>
  queryOptions({
    queryKey: queryKeys.bills(homeId),
    queryFn: ({ signal }) => api.listBills(homeId, signal),
  })

export const balancesQuery = (homeId: string) =>
  queryOptions({
    queryKey: queryKeys.balances(homeId),
    queryFn: ({ signal }) => api.listBalances(homeId, signal),
  })
