export type Home = { id: string; name: string }
export type HomeSummary = Home & { memberCount: number }
export type Member = { id: string; homeId: string; name: string }
export type HomeDetail = Home & { members: Member[] }
export type Share = { id: string; memberId: string; amountCents: number; paidAt: string | null }
export type Bill = {
  id: string
  homeId: string
  title: string
  totalCents: number
  createdAt: string
  shares: Share[]
}
export type Balance = { memberId: string; name: string; outstandingCents: number }

const REQUEST_TIMEOUT_MS = 10_000

// status is 0 when no answer came back, because the network failed or the request timed out.
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500
  }
}

type RequestOptions = {
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

function parseJson(text: string): unknown {
  if (text === '') return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function errorMessageFrom(data: unknown, status: number) {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    if (typeof data.error === 'string' && data.error !== '') return data.error
  }
  if (status >= 500) return 'The server ran into a problem. Please try again in a moment.'
  return `The request failed with status ${status}.`
}

async function request<T>(method: 'GET' | 'POST', path: string, options: RequestOptions = {}) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  let response: Response
  let text: string
  try {
    response = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json', ...options.headers },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal,
    })
    text = await response.text()
  } catch (error) {
    if (timeout.aborted) {
      throw new ApiError('The server is taking too long to answer. Please try again.', 0)
    }
    // React Query cancelled the request because nobody needs the answer any more.
    if (options.signal?.aborted) throw error
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }

  const data = parseJson(text)
  if (!response.ok) throw new ApiError(errorMessageFrom(data, response.status), response.status)
  if (data === undefined) {
    throw new ApiError('The server sent an answer that could not be read.', response.status)
  }
  return data as T
}

function homePath(homeId: string) {
  return `/api/homes/${encodeURIComponent(homeId)}`
}

export const api = {
  listHomes: (signal?: AbortSignal) =>
    request<{ homes: HomeSummary[] }>('GET', '/api/homes', { signal }),

  createHome: (name: string) => request<Home>('POST', '/api/homes', { body: { name } }),

  getHome: (homeId: string, signal?: AbortSignal) =>
    request<HomeDetail>('GET', homePath(homeId), { signal }),

  addMember: (homeId: string, name: string) =>
    request<Member>('POST', `${homePath(homeId)}/members`, { body: { name } }),

  listBills: (homeId: string, signal?: AbortSignal) =>
    request<{ bills: Bill[] }>('GET', `${homePath(homeId)}/bills`, { signal }),

  createBill: (homeId: string, title: string, totalCents: number) =>
    request<Omit<Bill, 'createdAt'>>('POST', `${homePath(homeId)}/bills`, {
      body: { title, totalCents },
    }),

  listBalances: (homeId: string, signal?: AbortSignal) =>
    request<{ balances: Balance[] }>('GET', `${homePath(homeId)}/balances`, { signal }),

  payShare: (billId: string, shareId: string, idempotencyKey: string) =>
    request<Share>(
      'POST',
      `/api/bills/${encodeURIComponent(billId)}/shares/${encodeURIComponent(shareId)}/pay`,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),
}
