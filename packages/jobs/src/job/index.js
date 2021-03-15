import runJob from './runJob'
import cancelExecution from './cancelExecution'
import getExecute from './getExecute'
import schema from '../JobsCollection/schema'

export default function ({name, type, run, getNextRun, runEvery, priority}) {
  if (!schema.priority.allowedValues.includes(priority)) {
    priority = 3
  }

  const job = (...args) => runJob.apply(job, args)

  job.runJob = (...args) => runJob.apply(job, args)
  job.run = (...args) => run.apply(job, args)
  job.execute = getExecute(job)
  job.type = type
  job.getNextRun = getNextRun
  job.runEvery = runEvery
  job.cancelExecution = cancelExecution
  job.priority = priority

  return job
}
