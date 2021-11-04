import {DefineOptions} from 'agenda/dist/agenda/define'
import {JobDefinition} from '../types/job'

export function getAgendaOptions(job: JobDefinition): DefineOptions {
  const agendaOptions = {
    concurrency: job.concurrency,
    lockLifetime: job.lockLifetime,
    lockLimit: job.lockLimit,
    priority: job.priority,
    shouldSaveResult: job.persistResult
  }

  // We cast to unkown because Agenda's DefineOptions interface is outdated
  const opts = agendaOptions as unknown as DefineOptions

  return opts
}
