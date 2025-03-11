import {Inject, Service} from '@orion-js/services'
import type {MigrationsRepo as MigrationsRepoType} from './Repo'
import {MigrationsRepo} from './Repo'
import {logger} from '@orion-js/logger'
import {MigrationExecutable} from './service'
import {ExecutionContext} from '@orion-js/dogs'

@Service()
export class MigrationsService {
  @Inject(() => MigrationsRepo)
  private migrationsRepo: MigrationsRepoType

  async getNextMigration(migrationsList: MigrationExecutable[]) {
    const completedNames = await this.migrationsRepo.getCompletedMigrationNames()

    for (const migrationExecutable of migrationsList) {
      if (completedNames.includes(migrationExecutable.name)) continue
      return migrationExecutable
    }
  }

  async runMigrations(migrationsList: MigrationExecutable[], context: ExecutionContext) {
    const next = await this.getNextMigration(migrationsList)
    if (!next) return

    logger.info('[orionjs/migrations] Running migration...', {name: next.name})

    if (next.useMongoTransactions) {
      await this.runAsTransaction(next.runMigration, context)
    } else {
      await this.runMigration(next.runMigration, context)
    }

    logger.info('[orionjs/migrations] Migration executed correctly', {name: next.name})

    await this.migrationsRepo.saveCompletedMigration(next.name)

    await this.runMigrations(migrationsList, context)
  }

  async runMigration(
    func: (context: ExecutionContext) => Promise<void>,
    context: ExecutionContext,
  ) {
    try {
      await func(context)
    } catch (error) {
      logger.error('[orionjs/migrations] Error running migration', error)
      throw error
    }
  }

  async runAsTransaction(
    func: (context: ExecutionContext) => Promise<void>,
    context: ExecutionContext,
  ) {
    const {client} = this.migrationsRepo.collection.client
    const session = client.startSession()

    await session.withTransaction(async () => {
      try {
        await func(context)
      } catch (error) {
        logger.error('[orionjs/migrations] Error running migration, will abort transaction', error)
        throw error
      }
    })

    session.endSession()
  }
}
