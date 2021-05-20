import Jobs from './JobsCollection'
import job from './job'
import Daemon from './daemon'
import initJobs from './initJobs'
import {config} from '@orion-js/app'
import DeamonStats from './daemon/DaemonStats'

let stats = null

async function start(jobs, workersCountParam = 4) {
  // dont run jobs in test env
  if (process.env.ORION_TEST) return
  const jobsConfig = config().jobs || {}
  const workersCount = jobsConfig.workers || workersCountParam
  await Jobs.await()

  await initJobs(jobs)
  if (jobsConfig.disabled) {
    stats = new DeamonStats(jobs)
    return stats.start()
  }

  global.jobs = jobs

  Daemon.init({
    workersCount,
    jobs
  })
}

const stop = () => Promise.all([stats && stats.stop(), Daemon.stop()])

export {start, Jobs, job, stop}
