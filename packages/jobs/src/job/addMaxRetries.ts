import {Processor} from 'agenda/dist/agenda/define'
import {Agenda, Job as AgendaJob} from 'agenda/es'
import JobRetries, {JobRetry} from '../collections/JobRetries'
import {Job} from '../types/job'
import getProcessorFromJob from '../utils/getProcessorFromJob'

const defaultNextRetry = (): Date => {
  const now = new Date()
  return new Date(now.getTime() + 1000 * 60) // 1 minute from now
}

const addMaxRetries = (agenda: Agenda, job: Job, jobName: string): Processor => {
  const {maxRetries = 0} = job
  if (!maxRetries) {
    return getProcessorFromJob(job)
  }

  const processor: Processor = async (agendaJob: AgendaJob): Promise<void> => {
    const originalJobId = agendaJob.attrs.data?._parentJobId ?? agendaJob.attrs._id.toString()

    try {
      await job.run(agendaJob.attrs.data, {
        ...agendaJob,
        timesExecuted: 1
      })
    } catch (err) {
      let retry: JobRetry = await JobRetries.findOne({jobId: originalJobId})

      if (!retry) {
        retry = {
          jobId: originalJobId,
          totalRetries: 0
        }
        await JobRetries.insertOne(retry)
      }

      await JobRetries.updateOne({jobId: originalJobId}, {$inc: {totalRetries: 1}})

      if (retry.totalRetries + 1 < maxRetries) {
        await agenda.schedule(job.getNextRun ? job.getNextRun() : defaultNextRetry(), jobName, {
          ...agendaJob.attrs.data,
          _parentJobId: originalJobId
        })
      }
    }
  }

  return processor
}

export default addMaxRetries
