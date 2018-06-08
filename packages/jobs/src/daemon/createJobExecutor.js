import JobsCollection from '../JobsCollection'

const findJob = function(jobs, name) {
  const def = jobs.find(job => job.name === name)
  if (!def) throw new Error(`Job named "${name}" not found`)
  return def.run
}

export default function({jobData, jobs}) {
  return async function() {
    try {
      const run = findJob(jobs, jobData.name)
      await run(jobData.params, jobData)
    } catch (error) {
      console.error(`Error running job named "${jobData.name}"`, error)
    }
    await JobsCollection.remove(jobData._id)
  }
}
