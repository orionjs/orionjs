import getJobToRun from './getJobToRun'
import getFreeWorker from './getFreeWorker'
import createJobExecutor from './createJobExecutor'

export default async function ({jobs, workers}) {
  const freeWorker = getFreeWorker(workers)
  if (!freeWorker) {
    return 100
  }

  global.lastJobLoopDate = new Date()

  const jobData = await getJobToRun()
  if (!jobData) {
    return 1000
  }

  const func = createJobExecutor({jobData, jobs})
  freeWorker.execute(func)

  // console.log(`did execute job ${jobData.job} in worker ${freeWorker.index}`)

  return 0
}
