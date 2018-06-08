import daemon from './daemon'

export default function(jobMap) {
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
