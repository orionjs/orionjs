import {Processor} from 'agenda/dist/agenda/define'
import {Job as AgendaJob} from 'agenda/es'
import {Job} from '../types/job'
import JobRetries from '../collections/JobRetries'

export default function getProcessorFromJob(job: Job) {
  return async (agendaJob: AgendaJob): Promise<void> => {
    const retry =
      job.type === 'event'
        ? await JobRetries.findOne({jobId: agendaJob.attrs._id}, {projection: {totalRetries: 1}})
        : null

    await job.run(agendaJob.attrs.data, {
      ...agendaJob,
      timesExecuted: retry ? retry.totalRetries : 1
    })
  }
}
