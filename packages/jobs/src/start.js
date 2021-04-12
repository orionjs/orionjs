import daemon from './daemon'
import JobsCollection from './JobsCollection'
import initJobs from './initJobs'
import {config} from '@orion-js/app'
import DaemonStats from './daemon/DaemonStats'

export default async function (jobs, workersCountParam = 4) {
  // dont run jobs in test env
  if (process.env.ORION_TEST) return
  const {logger, jobs: jobsConfig} = config()
  const workersCount = (jobsConfig && jobsConfig.workers) || workersCountParam
  await JobsCollection.await()

  await initJobs(jobs)

  global.jobs = jobs

  const stats = new DaemonStats()

  if (jobsConfig && jobsConfig.disabled) return stats.start()
  logger.info(`Starting jobs with ${workersCount} workers`)

  // starts the daemon
  daemon({
    workersCount,
    jobs
  })
}
