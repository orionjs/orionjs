import {generateId} from '@orion-js/helpers'
import {getAgendaOptions} from '../utils/getAgendaOptions'
import {JobManager} from '../JobManager'
import {Job, TriggerEventTypeJob} from '../types/job'
import addMaxRetries from './addMaxRetries'

export const job = (jobDefinition: Job): TriggerEventTypeJob => {
  const jobName = jobDefinition.name ?? generateId(12)
  const agenda = JobManager.getAgenda()
  const opts = getAgendaOptions(jobDefinition)

  agenda.define(jobName, opts, addMaxRetries(agenda, jobDefinition, jobName))

  const eventFn = (data: any) => {
    return agenda.schedule(
      jobDefinition.getNextRun ? jobDefinition.getNextRun() : new Date(),
      jobName,
      data
    )
  }

  // Add properties to the resulting function so that recurring events can be initialized when calling initJobs
  Object.keys(jobDefinition).forEach(key => {
    eventFn[key] = jobDefinition[key]
  })

  return eventFn
}

export default job
