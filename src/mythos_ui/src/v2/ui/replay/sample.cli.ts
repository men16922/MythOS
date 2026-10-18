// Print a recorded self-played daily as the client would submit it: {"date", "result", "replay"}.
//   node src/v2/ui/replay/sample.cli.ts [YYYY-MM-DD] [fights]
// Used by tests/test_v2_replay.py to check the bundled server-side verifier against a real log.

import { CONTENT as C } from '../../content/index.ts'
import { computeEchoes, dailyResultOf } from '../../engine/meta.ts'
import { replayLogFor } from './record.ts'
import { playRecorded } from './selfPlay.ts'

const day = process.argv[2] ?? '2026-10-18'
const fights = Number(process.argv[3] ?? 2)
const run = playRecorded(fights, day)
const result = dailyResultOf(run, computeEchoes(run, C).total)
process.stdout.write(JSON.stringify({ date: day, result, replay: replayLogFor(run.id) }))
