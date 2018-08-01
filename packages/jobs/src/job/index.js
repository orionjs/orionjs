import runJob from './runJob'
import cancelExecution from './cancelExecution'

export default function({name, type, run}) {
  const job = (...args) => runJob.apply(job, args)

  job.runJob = (...args) => runJob.apply(job, args)
  job.run = (...args) => run.apply(job, args)
  job.type = type
  job.cancelExecution = cancelExecution

  return job
}
