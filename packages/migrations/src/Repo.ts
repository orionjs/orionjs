import {Collection, MongoCollection, Repository} from '@orion-js/mongodb'
import {MigrationSchema} from './Schema'

@Repository()
export class MigrationsRepo {
  @MongoCollection<MigrationSchema>({
    name: 'orionjs.migrations',
    schema: MigrationSchema,
    idPrefix: 'scnmg-',
    indexes: []
  })
  collection: Collection<MigrationSchema>

  async getCompletedMigrationNames() {
    const migrations = await this.collection.find().toArray()
    return migrations.map(m => m.name)
  }

  async saveCompletedMigration(name: string) {
    await this.collection.insertOne({name, completedAt: new Date()})
  }
}
