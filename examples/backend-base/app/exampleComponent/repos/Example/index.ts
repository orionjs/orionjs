import {createCollection, Repository} from '@orion-js/mongodb'
import type {PaginationParams} from '@orion-js/trpc'
import {ExampleId, ExampleSchema, ExampleType} from 'app/exampleComponent/schemas/ExampleSchema'

@Repository()
export class ExampleRepository {
  private exampleCollection = createCollection({
    name: 'examples',
    schema: ExampleSchema,
    indexes: [
      {
        keys: {
          name: 1,
        },
      },
    ],
  })

  async getExampleById(id: ExampleId): Promise<ExampleType> {
    return await this.exampleCollection.findOne({_id: id})
  }

  async getAllExamples(): Promise<ExampleType[]> {
    return await this.exampleCollection.find().sort({createdAt: -1}).toArray()
  }

  async getPaginatedExamples(
    {skip, limit, sort}: PaginationParams,
    filter: {name?: string},
  ): Promise<ExampleType[]> {
    const query: any = {}
    if (filter.name) {
      query.name = {$regex: filter.name, $options: 'i'}
    }
    return await this.exampleCollection.find(query).sort(sort).skip(skip).limit(limit).toArray()
  }

  async getExamplesCount(filter: {name?: string}): Promise<number> {
    const query: any = {}
    if (filter.name) {
      query.name = {$regex: filter.name, $options: 'i'}
    }
    return await this.exampleCollection.countDocuments(query)
  }

  async createExample(name: string): Promise<string> {
    return await this.exampleCollection.insertOne({name, createdAt: new Date()})
  }
}
