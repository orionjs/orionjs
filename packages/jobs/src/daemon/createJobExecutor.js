import JobsCollection from '../JobsCollection'

const findJob = function (jobs, identifier) {
  const def = jobs[identifier]
  if (!def) {
    console.log(`Job named "${identifier}" not found. Will stop trying to execute`)
    JobsCollection.deleteMany({job: identifier})
    return
  }
  return def.execute
}

export default function ({jobData, jobs}) {
  return async function () {
    const execute = findJob(jobs, jobData.job)
    if (!execute) return
    await execute(jobData.params, jobData)
  }
}
