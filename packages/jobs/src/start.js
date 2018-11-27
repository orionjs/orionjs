import daemon from './daemon'
import JobsCollection from './JobsCollection'
import initJobs from './initJobs'

export default async function(jobs) {
  await JobsCollection.await()

  await initJobs(jobs)

  global.jobs = jobs

  // starts the daemon
  daemon({
    workersCount: 4,
    jobs
  })
}
