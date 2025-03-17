import {ExecutionContext} from '@orion-js/dogs'
import {getMigrationsFromServices, MigrationService} from '.'
import {describe, it, expect} from 'vitest'

describe('Migration as IOC', () => {
  it('should create a migration service', async () => {
    let didRun = false
    let didExtend = false

    @MigrationService({
      name: 'moveUsers',
      useMongoTransactions: false,
    })
    class MoveUsersMigrationService {
      async runMigration(context: ExecutionContext) {
        didRun = true
        context.extendLockTime(1000)
      }
    }

    const migrations = getMigrationsFromServices([MoveUsersMigrationService])

    expect(migrations).toHaveLength(1)

    let lastName = null

    for (const {runMigration, name} of migrations) {
      lastName = name
      await runMigration({
        extendLockTime: time => {
          didExtend = true
        },
      } as ExecutionContext)
    }

    expect(lastName).toBe('moveUsers')
    expect(didRun).toBe(true)
    expect(didExtend).toBe(true)
  })
})
