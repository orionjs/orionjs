import {Mutation, Query, Resolvers} from '@orion-js/graphql'
import {Inject} from '@orion-js/services'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {ExampleSchema} from 'app/exampleComponent/schemas/ExampleSchema'
import {ExampleService} from 'app/exampleComponent/services/ExampleService'

@TypedSchema()
export class ExampleParams {
  @Prop()
  exampleId: string
}

@Resolvers()
export default class ExampleResolvers {
  @Inject()
  private exampleService: ExampleService

  @Query({
    params: ExampleParams,
    returns: ExampleSchema,
  })
  async example(params: ExampleParams): Promise<ExampleSchema> {
    return await this.exampleService.getAExample(params.exampleId)
  }

  @Query({
    returns: [ExampleSchema],
  })
  async examples(): Promise<ExampleSchema[]> {
    return await this.exampleService.getExamples()
  }

  @Mutation({returns: String})
  async createExample(): Promise<string> {
    await this.exampleService.makeExample()
    return 'Created example'
  }
}
