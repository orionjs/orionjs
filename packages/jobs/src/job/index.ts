import {generateId} from '@orion-js/helpers'
import {getAgendaOptions} from '../utils/getAgendaOptions'
import {JobManager} from '../JobManager'
import {Job, TriggerEventTypeJob} from '../types/job'
import addMaxRetries from './addMaxRetries'

/**
 * Job factory. Creates a job object ready to be initialized.
 * @param jobDefinition The definition of the job.
 * @returns A function that when called initializes a job.
 */
export const job = (jobDefinition: Job): TriggerEventTypeJob => {
  const jobName = jobDefinition.name ?? generateId(12)

  const initializer = (): Job => {
    if (jobDefinition.type === 'recurrent') return jobDefinition // Recurrent jobs are defined during initJobs

    const agenda = JobManager.getAgenda()
    const opts = getAgendaOptions(jobDefinition)

    agenda.define(jobName, opts, addMaxRetries(agenda, jobDefinition, jobName))
    return jobDefinition
  }

  const eventFn: TriggerEventTypeJob = (data?: any) => {
    if (jobDefinition.type === 'recurrent') return null // Recurrent jobs can not be scheduled manually, they are scheduled on init.

    const agenda = JobManager.getAgenda()

    return agenda.schedule(
      jobDefinition.getNextRun ? jobDefinition.getNextRun() : new Date(),
      jobName,
      data
    )
  }

  const result: any = eventFn

  result.__initialize = initializer

  return result
}

export default job
