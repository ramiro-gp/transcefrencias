import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const totalCases = 1040
const batchSize = 5
const hybrid = process.argv.includes('--hybrid')
const resultDirectory = resolve(
  hybrid ? '.benchmark-results/finance-hybrid' : '.benchmark-results/finance-corpus',
)
const fresh = process.argv.includes('--fresh')

if (fresh && existsSync(resultDirectory)) {
  rmSync(resultDirectory, { recursive: true, force: true })
}
mkdirSync(resultDirectory, { recursive: true })

function runWorker(mode, extraEnvironment = {}) {
  const windows = process.platform === 'win32'
  const command = windows ? process.env.ComSpec : 'pnpm'
  if (command === undefined) throw new Error('Windows command processor is unavailable')
  const workerArguments = windows
    ? [
        '/d',
        '/s',
        '/c',
        'pnpm exec vitest bench --run src/domain/finance/finance-corpus.bench.ts',
      ]
    : ['exec', 'vitest', 'bench', '--run', 'src/domain/finance/finance-corpus.bench.ts']
  const result = spawnSync(command, workerArguments, {
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      ...process.env,
      FINANCE_CORPUS_MODE: mode,
      FINANCE_CORPUS_SOLVER: hybrid ? 'hybrid' : 'backtracking',
      FINANCE_CORPUS_RESULT_DIR: resultDirectory,
      ...extraEnvironment,
    },
  })
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
    throw new Error(
      `Finance corpus worker failed in ${mode} mode with status ${result.status}: ${result.error?.message ?? 'unknown error'}`,
    )
  }
}

for (let start = 0; start < totalCases; start += batchSize) {
  const batchIndex = Math.floor(start / batchSize)
  const checkpoint = resolve(
    resultDirectory,
    `batch-${batchIndex.toString().padStart(3, '0')}.json`,
  )
  if (existsSync(checkpoint)) continue
  runWorker('batch', {
    FINANCE_CORPUS_BATCH_INDEX: String(batchIndex),
    FINANCE_CORPUS_BATCH_START: String(start),
    FINANCE_CORPUS_BATCH_COUNT: String(Math.min(batchSize, totalCases - start)),
  })
  if ((batchIndex + 1) % 10 === 0) {
    console.log(
      `Completed ${Math.min(start + batchSize, totalCases)}/${totalCases} cases`,
    )
  }
}

const adversarialCheckpoint = resolve(resultDirectory, 'adversarial.json')
if (!existsSync(adversarialCheckpoint)) runWorker('adversarial')
if (hybrid) {
  for (const participantCount of [14, 15, 16, 18, 20]) {
    const scalingCheckpoint = resolve(resultDirectory, `scaling-${participantCount}.json`)
    if (existsSync(scalingCheckpoint)) continue
    runWorker('scaling', {
      FINANCE_CORPUS_PARTICIPANT_COUNT: String(participantCount),
    })
  }
}
runWorker('aggregate')
console.log(readFileSync(resolve(resultDirectory, 'report.json'), 'utf8'))
