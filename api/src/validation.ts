import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

const MAX_IDEMPOTENCY_KEY_LENGTH = 255

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(message: string) {
  return new HTTPException(422, { message })
}

export async function readJsonObject(c: Context) {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' })
  }
  if (!isRecord(body)) throw invalid('Request body must be a JSON object')
  return body
}

export function requireText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string') throw invalid(`${field} must be a string`)
  const text = value.trim()
  if (text.length === 0) throw invalid(`${field} must not be empty`)
  if (text.length > maxLength) throw invalid(`${field} must be at most ${maxLength} characters`)
  return text
}

// Rejects 0, negative numbers, decimals, strings and null. Number.isSafeInteger also keeps the
// amount inside the range where JavaScript numbers are exact.
export function requirePositiveCents(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw invalid(`${field} must be a positive whole number of cents`)
  }
  return value
}

export function requireIdempotencyKey(header: string | undefined) {
  const key = header?.trim()
  if (!key) throw new HTTPException(400, { message: 'Idempotency-Key header is required' })
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new HTTPException(400, {
      message: `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
    })
  }
  return key
}
