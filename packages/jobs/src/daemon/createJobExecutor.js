import JobsCollection from '../JobsCollection'

const findJob = function(jobs, identifier) {
  const def = jobs[identifier]
  if (!def) throw new Error(`Job named "${identifier}" not found`)
  return def.run
}

export default function({jobData, jobs}) {
  return async function() {
    try {
      const run = findJob(jobs, jobData.job)
      await run(jobData.params, jobData)
    } catch (error) {
      console.error(`Error running job named "${jobData.job}"`, error)
    }
    await JobsCollection.remove(jobData._id)
  }
}
