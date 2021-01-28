import runJob from './runJob'
import cancelExecution from './cancelExecution'
import getExecute from './getExecute'

export default function ({name, type, run, getNextRun, runEvery, priority}) {
  const job = (...args) => runJob.apply(job, args)

  job.runJob = (...args) => runJob.apply(job, args)
  job.run = (...args) => run.apply(job, args)
  job.execute = getExecute(job)
  job.type = type
  job.getNextRun = getNextRun
  job.runEvery = runEvery
  job.cancelExecution = cancelExecution
  job.priority = priority ? priority : 3

  return job
}
