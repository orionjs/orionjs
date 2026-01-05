import {defineJob, JobToRun, startWorkers} from '@orion-js/dogs'
import {getMigrationsFromServices} from '../service'
import {getInstance} from '@orion-js/services'
import {MigrationsService} from '../MigrationsService'
import {logger} from '@orion-js/logger'

export interface Options {
  lockTime?: number
  omitJob?: boolean
}

export function loadMigrations(migrationServices: any[], options?: Options) {
  const migrations = getMigrationsFromServices(migrationServices)
  if (options?.omitJob) return migrations

  startWorkers({
    maxTries: 5,
    onMaxTriesReached: async (job: JobToRun) => {
      logger.error(`Max tries reached for job ${job.name}`, {job})
    },
    cooldownPeriod: 1000,
    defaultLockTime: 1000 * 60 * 20, // 20 min
    workersCount: 1,
    pollInterval: 10 * 1000,
    jobs: {
      orionjsRunMigrations: defineJob({
        type: 'recurrent',
        runEvery: 30 * 1000,
        async resolve(_params, context) {
          const instance = getInstance(MigrationsService)
          await instance.runMigrations(migrations, context)
        },
      }),
    },
  })

  return migrations
}
