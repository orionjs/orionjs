/**
 * Measures heap retained per idle scheduler claim while the scheduler keeps running.
 * Mirrors a production setup: 75 jobs, 30 partitions, nobody claiming anything.
 *
 *   bun packages/dogs/scripts/measure-scheduler-retention.ts
 *   node --expose-gc --import tsx packages/dogs/scripts/measure-scheduler-retention.ts
 *
 * Not part of the test suite: heap numbers depend on the runtime and GC timing.
 */
import {WorkerService} from '../src/services/WorkerService'

const WARMUP_CLAIMS = 20_000
const MEASURED_CLAIMS = 200_000
const N_PARTITIONS = 30
const N_JOBS = 75

declare const Bun: {gc: (force: boolean) => void} | undefined

function collectGarbage() {
  if (typeof Bun !== 'undefined') return Bun.gc(true)
  const gc = (globalThis as {gc?: () => void}).gc
  if (!gc) throw new Error('Run node with --expose-gc')
  gc()
}

async function heapAfterGc() {
  await new Promise(resolve => setImmediate(resolve))
  collectGarbage()
  collectGarbage()
  return process.memoryUsage().heapUsed
}

async function measureScheduler() {
  const workerService = new WorkerService() as any
  let claims = 0
  let onClaimTarget: (() => void) | undefined
  let claimTarget = WARMUP_CLAIMS
  workerService.jobsRepo = {
    getJobAndLock: async () => {
      claims++
      if (claims === claimTarget) onClaimTarget?.()
      return null
    },
  }
  const config = {
    jobs: Object.fromEntries(
      Array.from({length: N_JOBS}, (_, index) => [
        `job${index}`,
        {type: 'event', resolve: async () => {}},
      ]),
    ),
    workersCount: 50,
    pollInterval: 0,
    defaultLockTime: 1000,
    nPartitions: N_PARTITIONS,
  }
  const instance = workerService.createWorkersInstanceDefinition(config)
  const reachClaims = (target: number) =>
    new Promise<void>(resolve => {
      claimTarget = target
      onClaimTarget = resolve
    })

  const warmedUp = reachClaims(WARMUP_CLAIMS)
  instance.schedulerPromise = workerService.runSchedulerLoop(config, instance)
  await warmedUp
  const heapBefore = await heapAfterGc()
  const startClaims = claims

  await reachClaims(startClaims + MEASURED_CLAIMS)
  const heapAfter = await heapAfterGc()
  const measuredClaims = claims - startClaims
  await instance.stop()

  const retainedBytes = heapAfter - heapBefore
  return {
    measuredClaims,
    pollWaits: Math.floor(measuredClaims / N_PARTITIONS),
    retainedMb: (retainedBytes / 1024 / 1024).toFixed(2),
    bytesPerClaim: (retainedBytes / measuredClaims).toFixed(1),
  }
}

console.log(await measureScheduler())
