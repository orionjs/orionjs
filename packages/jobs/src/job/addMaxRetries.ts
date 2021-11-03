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
    try {
      await job.run(agendaJob.attrs.data, {
        ...agendaJob,
        timesExecuted: 1
      })
    } catch (err) {
      let retry: JobRetry = await JobRetries.findOne({jobId: agendaJob.attrs._id})

      if (!retry) {
        retry = {
          jobId: agendaJob.attrs._id.toString(),
          totalRetries: 1
        }
        await JobRetries.insertOne(retry)
      } else {
        await JobRetries.updateOne(
          {jobId: agendaJob.attrs._id.toString()},
          {$inc: {totalRetries: 1}}
        )
      }

      if (retry.totalRetries <= maxRetries) {
        await agenda.schedule(
          job.getNextRun ? job.getNextRun() : defaultNextRetry(),
          jobName,
          agendaJob.attrs.data
        )
      }
    }
  }

  return processor
}

export default addMaxRetries
