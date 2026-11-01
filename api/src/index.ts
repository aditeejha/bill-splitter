import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from './env'
import { bills } from './routes/bills'
import { homes } from './routes/homes'

const app = new Hono<AppEnv>()

app.get('/api/health', (c) => c.json({ status: 'ok' }))
app.route('/api', homes)
app.route('/api', bills)

// Every error answers with JSON in the shape { error: message }.
app.notFound((c) => c.json({ error: 'Route not found' }, 404))

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status)
  }
  console.error(error)
  return c.json({ error: 'Something went wrong on the server' }, 500)
})

export default app
