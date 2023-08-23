import {ExecutionContext} from '@orion-js/dogs'
import {getMigrationsFromServices, MigrationService} from '.'

describe('Migration as IOC', () => {
  it('should create a migration service', async () => {
    let didRun = false
    let didExtend = false

    @MigrationService({
      name: 'moveUsers',
      useMongoTransactions: false
    })
    class MoveUsersMigrationService {
      async runMigration(context: ExecutionContext) {
        didRun = true
        context.extendLockTime(1000)
      }
    }

    const migrations = getMigrationsFromServices([MoveUsersMigrationService])

    let lastName = null

    for (const {runMigration, name} of migrations) {
      lastName = name
      await runMigration({
        extendLockTime: time => {
          didExtend = true
        }
      } as ExecutionContext)
    }

    expect(lastName).toBe('moveUsers')
    expect(didRun).toBe(true)
    expect(didExtend).toBe(true)
  })
})
