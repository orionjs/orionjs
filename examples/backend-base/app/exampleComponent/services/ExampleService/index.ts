import {Inject, Service} from '@orion-js/services'
import type {PaginationParams} from '@orion-js/trpc'
import {ExampleRepository} from 'app/exampleComponent/repos/Example'
import {ExampleId, ExampleType} from 'app/exampleComponent/schemas/ExampleSchema'

@Service()
export class ExampleService {
  @Inject(() => ExampleRepository)
  private exampleRepository: ExampleRepository

  async getAExample(id: ExampleId): Promise<ExampleType> {
    return await this.exampleRepository.getExampleById(id)
  }

  async getExamples(): Promise<ExampleType[]> {
    return await this.exampleRepository.getAllExamples()
  }

  async getPaginatedExamples(
    paginationParams: PaginationParams,
    filter: {name?: string},
  ): Promise<ExampleType[]> {
    return await this.exampleRepository.getPaginatedExamples(paginationParams, filter)
  }

  async getExamplesCount(filter: {name?: string}): Promise<number> {
    return await this.exampleRepository.getExamplesCount(filter)
  }

  async makeExample() {
    const randomName = Math.random().toString(36).substring(7)
    await this.exampleRepository.createExample(randomName)
  }
}
