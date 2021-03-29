import {config} from '@orion-js/app'

const findJob = function (jobs, identifier) {
  const def = jobs[identifier]
  if (!def) {
    const {logger} = config()
    logger.warn(`Job named "${identifier}" not found.`)
    return
  }
  return def.execute
}

export default function ({jobData, jobs}) {
  return async function () {
    const execute = findJob(jobs, jobData.job)
    if (!execute) return
    return await execute(jobData.params, jobData)
  }
}
