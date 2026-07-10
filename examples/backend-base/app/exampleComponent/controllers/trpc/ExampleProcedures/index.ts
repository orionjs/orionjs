import {typedId} from '@orion-js/mongodb'
import {Inject} from '@orion-js/services'
import {
  createTMutation,
  createTPaginatedQuery,
  createTQuery,
  Procedures,
  TMutation,
  TPaginatedQuery,
  TQuery,
} from '@orion-js/trpc'
import {ExampleSchema} from 'app/exampleComponent/schemas/ExampleSchema'
import {ExampleService} from 'app/exampleComponent/services/ExampleService'

@Procedures()
export class ExampleProcedures {
  @Inject(() => ExampleService)
  private exampleService!: ExampleService

  @TQuery()
  getExample = createTQuery({
    params: {exampleId: {type: typedId('ex')}},
    returns: ExampleSchema,
    resolve: async ({exampleId}) => {
      return await this.exampleService.getAExample(exampleId)
    },
  })

  @TQuery()
  listExamples = createTQuery({
    returns: [ExampleSchema],
    resolve: async () => {
      return await this.exampleService.getExamples()
    },
  })

  @TPaginatedQuery()
  paginatedExamples = createTPaginatedQuery({
    params: {name: {type: 'string', optional: true}},
    returns: ExampleSchema,
    allowedSorts: ['name', 'createdAt'],
    defaultSortBy: 'createdAt',
    defaultSortType: 'desc',
    defaultLimit: 10,
    maxLimit: 50,
    getItems: async (paginationParams, params) => {
      return await this.exampleService.getPaginatedExamples(paginationParams, params)
    },
    getCount: async params => {
      return await this.exampleService.getExamplesCount(params)
    },
  })

  @TMutation()
  createExample = createTMutation({
    returns: {message: {type: 'string'}},
    resolve: async () => {
      await this.exampleService.makeExample()
      return {message: 'Created example'}
    },
  })
}
