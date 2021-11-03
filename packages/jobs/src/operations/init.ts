import {Agenda} from 'agenda/es'
import {AgendaConfig} from 'agenda/dist/agenda'

import initJobs from '../initJobs'
import {Job, JobMap} from '../types/job'
import {JobManager} from '../JobManager'

export interface InitOptions {
  agendaConfig?: AgendaConfig
  dbAddress?: string
  dbCollection?: string
}

export async function init(jobs: JobMap, opts: InitOptions = {}) {
  const {
    agendaConfig = {},
    dbAddress = process.env.MONGO_URL,
    dbCollection = 'orion_v3_jobs'
  } = opts

  if (!dbAddress) {
    throw new Error(
      'No dbAddress provided to Jobs. Please provide it either through opts or set the MONGO_URL env var.'
    )
  }

  const agenda = new Agenda({
    db: {
      address: dbAddress,
      collection: dbCollection
    },
    ...agendaConfig
  })

  await initJobs(agenda, jobs)

  JobManager.init(agenda)
}
