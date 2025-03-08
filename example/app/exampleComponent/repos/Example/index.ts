import {Collection, MongoCollection, Repository} from '@orion-js/mongodb'
import {ExampleSchema} from 'app/exampleComponent/schemas/ExampleSchema'

@Repository()
export class ExampleRepository {
  @MongoCollection({
    name: 'examples',
    model: ExampleSchema,
    indexes: [
      {
        keys: {
          name: 1,
        },
      },
    ],
  })
  private exampleCollection: Collection<ExampleSchema>

  async getExampleById(id: string): Promise<ExampleSchema> {
    return await this.exampleCollection.findOne({_id: id})
  }

  async getAllExamples(): Promise<ExampleSchema[]> {
    return await this.exampleCollection.find().sort({createdAt: -1}).toArray()
  }

  async createExample(name: string): Promise<string> {
    return await this.exampleCollection.insertOne({name, createdAt: new Date()})
  }
}
