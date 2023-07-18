import {Inject, getInstance} from '@orion-js/services'
import {loadMigrations} from './loadMigrations'
import {MigrationService} from './service'
import {MigrationsService} from './MigrationsService'
import {Collection, MongoCollection, Repository} from '@orion-js/mongodb'
import {generateId} from '../../helpers/lib'
import {MigrationsRepo} from './Repo'

describe('Migrations end to end', () => {
  it('should create a migration service', async () => {
    let executions = 0

    @MigrationService({
      name: generateId(),
      useMongoTransactions: false
    })
    class MoveUsersMigrationService {
      async runMigration() {
        executions++
      }
    }

    const migrationExecutables = loadMigrations([MoveUsersMigrationService], {omitJob: true})

    const instance = getInstance(MigrationsService)

    await instance.runMigrations(migrationExecutables)
    await instance.runMigrations(migrationExecutables)
    await instance.runMigrations(migrationExecutables)
    await instance.runMigrations(migrationExecutables)
    await instance.runMigrations(migrationExecutables)

    expect(executions).toBe(1)
  })

  it('should not set a migration completed if it fails', async () => {
    const migrationName = generateId()

    @MigrationService({
      name: migrationName,
      useMongoTransactions: false
    })
    class MoveUsersMigrationService {
      async runMigration() {
        throw new Error('test')
      }
    }

    const migrationExecutables = loadMigrations([MoveUsersMigrationService], {omitJob: true})

    const instance = getInstance(MigrationsService)

    try {
      await instance.runMigrations(migrationExecutables)
    } catch {}

    const migrationsRepo = getInstance(MigrationsRepo)

    const completedNames = await migrationsRepo.getCompletedMigrationNames()
    expect(completedNames.includes(migrationName)).toBe(false)
  })

  // it('should revert changes if an error is thrown', async () => {
  //   expect.assertions(2)

  //   @Repository()
  //   class TestRepo {
  //     @MongoCollection({
  //       name: 'testMigration'
  //     })
  //     collection: Collection
  //   }

  //   @MigrationService({
  //     name: generateId(),
  //     useMongoTransactions: true
  //   })
  //   class TestTransactionMigrationService {
  //     @Inject()
  //     private testRepo: TestRepo

  //     async runMigration() {
  //       await this.testRepo.collection.insertOne({test: true})
  //       const count = await this.testRepo.collection.countDocuments({})
  //       expect(count).toBe(1)

  //       console.log({count})
  //       throw new Error('test')
  //     }
  //   }

  //   const migrationExecutables = loadMigrations([TestTransactionMigrationService], {omitJob: true})

  //   const instance = getInstance(MigrationsService)

  //   try {
  //     await instance.runMigrations(migrationExecutables)
  //   } catch {}

  //   const testRepo = getInstance(TestRepo)

  //   const count = await testRepo.collection.countDocuments({})
  //   expect(count).toBe(0)
  // })
})
