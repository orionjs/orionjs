import {Agenda} from 'agenda/es'
import {AgendaConfig} from 'agenda/dist/agenda'

import initJobs from '../initJobs'
import {JobMap} from '../types/job'
import {JobManager} from '../JobManager'

export interface InitOptions {
  agendaConfig?: AgendaConfig
  dbAddress?: string
  dbCollection?: string
  disabled?: boolean
}

export async function init(jobs: JobMap, opts: InitOptions = {}) {
  const {
    agendaConfig = {},
    dbAddress = process.env.MONGO_URL,
    dbCollection = 'orion_v3_jobs',
    disabled = process.env.ORION_TEST ? true : false
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

  JobManager.init(agenda)

  if (disabled) {
    console.log('Skipping jobs.start(). ORION_TEST env var or disabled option is set.')
  } else {
    await JobManager.start()
  }

  await initJobs(agenda, jobs, disabled)
}
