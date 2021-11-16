import {Agenda} from 'agenda'
import {AgendaConfig} from 'agenda/dist/agenda'
import {connections, getMongoConnection} from '@orion-js/mongodb'
import initJobs from '../initJobs'
import {JobMap} from '../types/job'
import {JobManager} from '../JobManager'

export interface InitOptions {
  jobs: JobMap
  /**
   * If included, will prefix all job names with the given namespace
   */
  namespace?: string

  agendaConfig?: AgendaConfig

  /**
   * The initialized orion mongo connection name. Defaults to main
   */
  connectionName?: string

  /**
   * The collection where jobs will be stored. Defaults to orion_v3_jobs
   */
  dbCollection?: string

  /**
   * If set to true, will initialize jobs but won't start running them. Single jobs can still be scheduled so that they run in another machine.
   */
  disabled?: boolean

  /**
   * The logger. Defaults to console.
   */
  logger?: typeof console
}

export async function init(opts: InitOptions) {
  const {
    jobs,
    agendaConfig = {},
    connectionName = 'main',
    dbCollection = 'orion_v3_jobs',
    disabled = process.env.ORION_TEST ? true : false,
    namespace = '',
    logger = console
  } = opts

  const mongoConnection = getMongoConnection({name: connectionName})

  if (!mongoConnection) {
    throw new Error(`The connection to MongoDB client "${connectionName}" was not initialized.`)
  }

  await mongoConnection.connectionPromise

  const agenda = new Agenda({
    db: {
      address: mongoConnection.uri,
      collection: dbCollection
    },
    ...agendaConfig
  })

  JobManager.init(agenda, {namespace, logger})
  await JobManager.start()

  await initJobs(agenda, jobs, disabled)

  if (disabled) {
    await JobManager.getAgenda().stop()
  }
}
