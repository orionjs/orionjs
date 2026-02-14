import {createModelResolver, ModelResolver, ModelResolvers} from '@orion-js/graphql'
import {InferSchemaType} from '@orion-js/schema'
import {ExampleSchema} from 'app/exampleComponent/schemas/ExampleSchema'

type ExampleType = InferSchemaType<typeof ExampleSchema>

@ModelResolvers(ExampleSchema)
export default class ExampleModelResolvers {
  @ModelResolver()
  text = createModelResolver<ExampleType>({
    returns: String,
    resolve: async example => {
      if (!example) throw new Error('Missing example')
      return `Hello ${example.name}`
    },
  })
}
