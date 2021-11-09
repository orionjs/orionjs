import {getAgendaOptions} from '../utils/getAgendaOptions'
import {JobManager} from '../JobManager'
import {JobDefinition, Job, ScheduleJobFunction, ScheduleJobOpts} from '../types/job'
import addMaxRetries from './addMaxRetries'
import {Job as AgendaJob} from 'agenda'
import getJobName from '../utils/getJobName'
import {jobUniquenessCheck} from './jobUniquenessCheck'

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

  const scheduleSingleJob: ScheduleJobFunction = async (
    data?: object,
    opts: ScheduleJobOpts = {}
  ): Promise<AgendaJob> => {
    if (jobDefinition.type === 'recurrent') return null // Recurrent jobs can not be scheduled manually, they are scheduled on init.

    if (opts.uniqueness) {
      const isUnique = await jobUniquenessCheck(opts.uniqueness.key, opts.uniqueness.ignoreError)
      if (!isUnique) {
        return null
      }
    }

    const agenda = JobManager.getAgenda()
    const {runAt, waitToRun} = opts

    let nextRun: string | Date = jobDefinition.getNextRun ? jobDefinition.getNextRun() : new Date()

    if (runAt) {
      nextRun = runAt
    } else if (waitToRun) {
      nextRun = new Date(Date.now() + waitToRun)
    }

    return agenda.schedule(nextRun, nameRef.name, data)
  }

  return {
    __initialize: initializer,
    schedule: scheduleSingleJob
  }
}

export default job
