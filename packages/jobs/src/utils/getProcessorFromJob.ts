import {Job as AgendaJob} from 'agenda/es'
import {JobDefinition} from '../types/job'
import JobRetries from '../collections/JobRetries'

export default function getProcessorFromJob(job: JobDefinition) {
  return async (agendaJob: AgendaJob): Promise<void> => {
    const retry =
      job.type === 'single'
        ? await JobRetries.findOne({jobId: agendaJob.attrs._id}, {projection: {totalRetries: 1}})
        : null

    await job.run(agendaJob.attrs.data, {
      ...agendaJob,
      timesExecuted: retry ? retry.totalRetries : 1
    })
  }
}
