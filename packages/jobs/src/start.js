import daemon from './daemon'
import JobsCollection from './JobsCollection'
import initJobs from './initJobs'
import {config} from '@orion-js/app'

export default async function (jobs, workersCountParam = 4) {
  // dont run jobs in test env
  if (process.env.ORION_TEST) return
  const {logger, jobs: jobsConfig} = config()
  const workersCount = (jobsConfig && jobsConfig.workers) || workersCountParam
  await JobsCollection.await()

  await initJobs(jobs)

  global.jobs = jobs

  if (jobsConfig && jobsConfig.disabled) return
  logger.info(`Starting jobs with ${workersCount} workers`)

  // starts the daemon
  daemon({
    workersCount,
    jobs,
    enableStats: jobsConfig && jobsConfig.stats
  })
}
