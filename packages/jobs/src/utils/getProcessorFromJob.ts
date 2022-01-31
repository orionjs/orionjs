import {Job as AgendaJob} from 'agenda'
import {JobDefinition, PromiseProcessor} from '../types/job'
import {getJobRetriesCollection} from '../collections/getJobRetriesCollection'
import {JobManager} from '..'

export default function getProcessorFromJob(job: JobDefinition): PromiseProcessor {
  return async (agendaJob: AgendaJob): Promise<void> => {
    const JobRetries = getJobRetriesCollection()
    const retry =
      job.type === 'single'
        ? await JobRetries.findOne(
            {jobId: agendaJob.attrs.data?._parentJobId ?? agendaJob.attrs._id},
            {projection: {totalRetries: 1}}
          )
        : null

    try {
      await job.run(agendaJob.attrs.data, {
        ...agendaJob,
        timesExecuted: retry ? retry.totalRetries : 0
      })
    } catch (error) {
      JobManager.logger.error(
        `Job "${agendaJob.attrs.name}" [id: ${agendaJob.attrs._id}] failed.`,
        {error}
      )
      throw error
    }
  }
}
