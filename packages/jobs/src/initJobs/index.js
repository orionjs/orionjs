import initRecurrentJob from './initRecurrentJob'

export default async function (jobs) {
  for (const identifier of Object.keys(jobs)) {
    const job = jobs[identifier]
    job.identifier = identifier
    if (job.type === 'recurrent') {
      await initRecurrentJob(job)
    }
  }
  return jobs
}
