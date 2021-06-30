import JobRepository from './JobsRepository'
import getFreeWorker from './getFreeWorker'
import createJobExecutor from './createJobExecutor'
import {config} from '@orion-js/app'

export default async function({jobs, workers}) {
  const {logger, jobs: jobsConfig} = config()
  const defaultConfig = {
    polling: 5000,
    delay: 100,
    ...jobsConfig
  }
  const freeWorker = await getFreeWorker(workers)

  global.lastJobLoopDate = new Date()
  const jobData = await JobRepository.getJobAndLock()
  if (!jobData) {
    return defaultConfig.polling
  }
  if (jobData.lockedAt) {
    logger.info('Resuming stalled job: ' + jobData.job, jobData)
  }

  const func = createJobExecutor({jobData, jobs})
  await freeWorker.execute(func, jobData, jobs[jobData.job])
  return defaultConfig.delay
}
