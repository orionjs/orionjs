import {getAgendaOptions} from '../utils/getAgendaOptions'
import {JobManager} from '../JobManager'
import {JobDefinition, Job, ScheduleJobFunction} from '../types/job'
import addMaxRetries from './addMaxRetries'
import {Job as AgendaJob} from 'agenda/es'
import getJobName from '../utils/getJobName'

/**
 * Job factory. Creates a job object ready to be initialized.
 * @param jobDefinition The definition of the job.
 * @returns A function that when called initializes a job.
 */
export const job = (jobDefinition: JobDefinition): Job => {
  const nameRef = {name: null}

  const initializer = (jobKey: string): JobDefinition => {
    const jobName = getJobName(nameRef.name ?? jobKey)
    nameRef.name = jobName
    if (jobDefinition.type === 'recurrent') return jobDefinition // Recurrent jobs are defined during initJobs

    const agenda = JobManager.getAgenda()
    const opts = getAgendaOptions(jobDefinition)

    agenda.define(jobName, opts, addMaxRetries(agenda, jobDefinition, jobName))
    return jobDefinition
  }

  const scheduleEventJob: ScheduleJobFunction = (
    data?: object,
    runAt?: Date | string
  ): void | Promise<AgendaJob> => {
    if (jobDefinition.type === 'recurrent') return null // Recurrent jobs can not be scheduled manually, they are scheduled on init.

    const agenda = JobManager.getAgenda()

    let nextRun: string | Date = jobDefinition.getNextRun ? jobDefinition.getNextRun() : new Date()
    if (runAt) {
      nextRun = runAt
    }

    return agenda.schedule(nextRun, nameRef.name, data)
  }

  return {
    __initialize: initializer,
    schedule: scheduleEventJob
  }
}

export default job
