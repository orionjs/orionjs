import {createCollection} from '@orion-js/mongodb'
import {MigrationSchema} from './Schema'
import {Service} from '@orion-js/services'

@Service()
export class MigrationsRepo {
  public collection = createCollection({
    name: 'orionjs.migrations',
    schema: MigrationSchema,
    indexes: [],
  })

  async getCompletedMigrationNames() {
    await this.collection.startConnection()
    const migrations = await this.collection.find().toArray()
    return migrations.map(m => m.name)
  }

  async saveCompletedMigration(name: string) {
    await this.collection.insertOne({
      name,
      completedAt: new Date(),
    })
  }
}
