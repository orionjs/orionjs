import runJob from './runJob'
import cancelExecution from './cancelExecution'
import getExecute from './getExecute'

export default function ({name, type, run, getNextRun, runEvery, persistResult, maxRetries = 0}) {
  const job = (...args) => runJob.apply(job, args)

  job.runJob = (...args) => runJob.apply(job, args)
  job.run = (...args) => run.apply(job, args)
  job.execute = getExecute(job)
  job.type = type
  job.getNextRun = getNextRun
  job.runEvery = runEvery
  job.cancelExecution = cancelExecution
  job.persistResult = persistResult
  job.maxRetries = maxRetries

  return job
}
