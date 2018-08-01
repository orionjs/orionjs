import daemon from './daemon'
import JobsCollection from './JobsCollection'

export default async function(jobs) {
  await JobsCollection.await()

  for (const identifier of Object.keys(jobs)) {
    jobs[identifier].identifier = identifier
  }

  global.jobs = jobs

  // starts the daemon
  daemon({
    workersCount: 4,
    jobs
  })
}
