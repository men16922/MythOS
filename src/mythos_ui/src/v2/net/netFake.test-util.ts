// Minimal browser fakes so net/*.ts runs under `node --test`: an in-memory `window.localStorage` and a scripted
// `fetch` that records every request. Install AFTER importing the module under test (api.ts registers page
// listeners at import time only when `window` exists).

export interface Call {
  method: string
  path: string
  headers: Record<string, string>
  body: unknown
}

export type Reply = { status: number; body?: unknown } | 'network'
export type Handler = (call: Call) => Reply | Promise<Reply>

export class MemoryStorage {
  map = new Map<string, string>()
  getItem(k: string): string | null {
    return this.map.has(k) ? (this.map.get(k) as string) : null
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v))
  }
  removeItem(k: string): void {
    this.map.delete(k)
  }
  clear(): void {
    this.map.clear()
  }
}

export interface Fakes {
  storage: MemoryStorage
  calls: Call[]
  setHandler(h: Handler): void
}

export function installFakes(handler: Handler): Fakes {
  const storage = new MemoryStorage()
  const calls: Call[] = []
  let current = handler
  ;(globalThis as unknown as { window: unknown }).window = { localStorage: storage, location: { search: '' } }
  ;(globalThis as unknown as { fetch: unknown }).fetch = async (url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) => {
    const path = String(url).replace(/^.*\/api\/v2/, '')
    let body: unknown = undefined
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = init.body
      }
    }
    const call: Call = { method: init.method ?? 'GET', path, headers: { ...(init.headers ?? {}) }, body }
    calls.push(call)
    const reply = await current(call)
    if (reply === 'network') throw new TypeError('Failed to fetch')
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: async () => {
        if (reply.body === undefined) throw new SyntaxError('no body')
        return reply.body
      },
    }
  }
  return { storage, calls, setHandler: (h) => (current = h) }
}

/** A JWT-shaped string whose payload carries `exp` (seconds). Not signed: the client only reads `exp`. */
export function fakeJwt(expMs: number, sub = 'u1'): string {
  const b64 = (o: unknown): string => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'RS256' })}.${b64({ sub, exp: Math.floor(expMs / 1000) })}.sig`
}

export const tick = (ms = 0): Promise<void> => new Promise((r) => setTimeout(r, ms))
