import {getMigrationsFromServices, MigrationService} from '.'

describe('Migration as IOC', () => {
  it('should create a migration service', async () => {
    let didRun = false

    @MigrationService({
      name: 'moveUsers',
      useMongoTransactions: false
    })
    class MoveUsersMigrationService {
      async runMigration() {
        didRun = true
      }
    }

    const migrations = getMigrationsFromServices([MoveUsersMigrationService])

    let lastName = null

    for (const {runMigration, name} of migrations) {
      lastName = name
      await runMigration()
    }

    expect(lastName).toBe('moveUsers')
    expect(didRun).toBe(true)
  })
})
