import getJobToRun from './getJobToRun'
import getFreeWorker from './getFreeWorker'
import createJobExecutor from './createJobExecutor'

export default async function({jobs, workers, runLoop}) {
  const freeWorker = getFreeWorker(workers)
  if (!freeWorker) {
    return runLoop({jobs, workers}, 100)
  }

  const jobData = await getJobToRun()
  if (!jobData) {
    return runLoop({jobs, workers}, 1000)
  }

  const func = createJobExecutor({jobData, jobs})
  freeWorker.execute(func)

  // console.log(`did execute job ${jobData.job} in worker ${freeWorker.index}`)

  return runLoop({jobs, workers})
}
