import buildSchema from '../buildSchema'
import {StartGraphQLOptions} from '../types/startGraphQL'
import {ApolloServerOptions} from '@apollo/server'
import formatError from './formatError'
import {omit} from 'rambdax'

export default async function (options: StartGraphQLOptions) {
  const schema = await buildSchema(options)
  const passedOptions = omit(
    [
      'resolvers',
      'modelResolvers',
      'subscriptions',
      'executeGraphQLCache',
      'useGraphiql',
      'app',
      'pubsub',
    ],
    options,
  )
  return {
    ...passedOptions,
    schema,
    formatError,
  } as unknown as ApolloServerOptions<any>
}
