import {Mutation, Query, Resolvers, createMutation, createQuery} from '@orion-js/graphql'
import {Inject} from '@orion-js/services'
import {schemaWithName} from '@orion-js/schema'
import {ExampleSchema} from 'app/exampleComponent/schemas/ExampleSchema'
import {ExampleService} from 'app/exampleComponent/services/ExampleService'
import {typedId} from '@orion-js/mongodb'

const ExampleParams = schemaWithName('ExampleParams', {
  exampleId: {type: typedId('ex')},
})

@Resolvers()
export default class ExampleResolvers {
  @Inject(() => ExampleService)
  private exampleService: ExampleService

  @Query()
  example = createQuery({
    params: ExampleParams,
    returns: ExampleSchema,
    resolve: async params => {
      return await this.exampleService.getAExample(params.exampleId)
    },
  })

  @Query()
  examples = createQuery({
    returns: [ExampleSchema],
    resolve: async () => {
      return await this.exampleService.getExamples()
    },
  })

  @Mutation()
  createExample = createMutation({
    returns: 'string',
    resolve: async () => {
      await this.exampleService.makeExample()
      return 'Created example'
    },
  })
}
