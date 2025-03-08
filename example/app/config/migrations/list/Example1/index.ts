import {ExecutionContext} from '@orion-js/dogs'
import {logger} from '@orion-js/logger'
import {MigrationService} from '@orion-js/migrations'

@MigrationService({
  name: 'Example1.v1',
  useMongoTransactions: false,
})
export class MigrateExample1 {
  async runMigration(context: ExecutionContext) {
    context.extendLockTime(1000 * 60 * 60 * 2) // two hours

    logger.info('Running migration')
  }
}
