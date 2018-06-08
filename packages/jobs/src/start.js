import daemon from './daemon'
import JobsCollection from './JobsCollection'

export default async function(jobMap) {
  await JobsCollection.await()

  const jobs = Object.keys(jobMap).map(identifier => {
    const data = jobMap[identifier]
    return {
      ...data,
      identifier
    }
  })
  // starts the daemon
  daemon({
    workersCount: 4,
    jobs
  })
}
