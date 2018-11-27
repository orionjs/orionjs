const findJob = function(jobs, identifier) {
  const def = jobs[identifier]
  if (!def) throw new Error(`Job named "${identifier}" not found`)
  return def.execute
}

export default function({jobData, jobs}) {
  return async function() {
    const execute = findJob(jobs, jobData.job)
    await execute(jobData.params, jobData)
  }
}
