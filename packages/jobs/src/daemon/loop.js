import getJobToRun from './getJobToRun'
import getFreeWorker from './getFreeWorker'
import createJobExecutor from './createJobExecutor'
import {config} from '@orion-js/app'

export default async function ({jobs, workers}) {
  const freeWorker = await getFreeWorker(workers)

  global.lastJobLoopDate = new Date()

  const jobData = await getJobToRun()
  if (!jobData) {
    return 1000
  }
  if (jobData.lockedAt) {
    const {logger} = config()
    logger.info('Resuming stalled job: ' + jobData.job)
  }

  const func = createJobExecutor({jobData, jobs})
  freeWorker.execute(func, jobData, jobs[jobData.job])

  return 0
}
