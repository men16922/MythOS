// Server-side daily replay check: one JSON request on stdin, one JSON verdict on stdout.
//
//   stdin  {"log": ReplayLog, "result": DailyResult, "date": "YYYY-MM-DD"}
//   stdout {"verified": true}  |  {"verified": false, "error": "…"}
//
// Bundled with the game content into src/mythos_v2/replay/verify.mjs (`make replay-verifier`) so the Python API can
// run it with any Node ≥ 18 (`mythos_v2/replay.py`). The engine is the browser's own, so a replay that verifies here
// is the run the player saw.

import { CONTENT } from '../../content/index.ts'
import type { DailyResult } from '../../engine/types.ts'
import type { ReplayLog } from './record.ts'
import { replayDaily, sameResult } from './replay.ts'

interface Request {
  log: ReplayLog
  result: DailyResult
  date: string
}

function verdict(req: Request): { verified: boolean; error?: string } {
  if (!req || typeof req !== 'object' || !req.log || !req.result) return { verified: false, error: 'bad request' }
  if (req.log.daily !== req.date) return { verified: false, error: 'log is for another day' }
  if (req.log.start?.archetype !== req.result.archetype) return { verified: false, error: 'archetype mismatch' }
  const out = replayDaily(req.log, CONTENT)
  if (!out.ok) return { verified: false, error: `${out.error} (step ${out.step})` }
  if (!sameResult(req.result, out.result)) return { verified: false, error: 'result differs from the replay' }
  return { verified: true }
}

async function main(): Promise<void> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  let req: Request
  try {
    req = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Request
  } catch {
    process.stdout.write(JSON.stringify({ verified: false, error: 'bad json' }))
    return
  }
  let out: { verified: boolean; error?: string }
  try {
    out = verdict(req)
  } catch (e) {
    out = { verified: false, error: `crash: ${(e as Error).message}` }
  }
  process.stdout.write(JSON.stringify(out))
}

void main()
