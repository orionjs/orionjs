import {Inject, Service} from '@orion-js/services'
import {keys} from 'lodash'
import {MigrationsRepo} from './Repo'
import {logger} from '@orion-js/logger'
import {MigrationExecutable} from './service'

@Service()
export class MigrationsService {
  @Inject()
  private migrationsRepo: MigrationsRepo

  async getNextMigration(migrationsList: MigrationExecutable[]) {
    const completedNames = await this.migrationsRepo.getCompletedMigrationNames()

    for (const migrationExecutable of migrationsList) {
      if (completedNames.includes(migrationExecutable.name)) continue
      return migrationExecutable
    }
  }

  async runMigrations(migrationsList: MigrationExecutable[]) {
    const next = await this.getNextMigration(migrationsList)
    if (!next) return

    logger.info('[orionjs/migrations] Running migration...', {name: next.name})

    if (next.useMongoTransactions) {
      await this.runAsTransaction(next.runMigration)
    } else {
      await this.runMigration(next.runMigration)
    }

    logger.info('[orionjs/migrations] Migration executed correctly', {name: next.name})

    await this.migrationsRepo.saveCompletedMigration(next.name)

    await this.runMigrations(migrationsList)
  }

  async runMigration(func: () => Promise<void>) {
    try {
      await func()
    } catch (error) {
      logger.error('[orionjs/migrations] Error running migration', error)
      throw error
    }
  }

  async runAsTransaction(func: () => Promise<void>) {
    const {client} = this.migrationsRepo.collection.client
    const session = client.startSession()

    await session.withTransaction(async () => {
      try {
        await func()
      } catch (error) {
        logger.error('[orionjs/migrations] Error running migration, will abort transaction', error)
        throw error
      }
    })

    session.endSession()
  }
}
