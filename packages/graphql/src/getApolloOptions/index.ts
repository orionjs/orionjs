import buildSchema from '../buildSchema'
import {StartGraphQLOptions} from '../types/startGraphQL'
import {ApolloServerOptions} from '@apollo/server'
import formatError from './formatError'
import {omit} from 'lodash'

export default async function (options: StartGraphQLOptions) {
  const schema = await buildSchema(options)
  const passedOptions = omit(options, [
    'resolvers',
    'modelResolvers',
    'subscriptions',
    'executeGraphQLCache',
    'useGraphiql',
    'app',
    'pubsub'
  ])
  return {
    ...passedOptions,
    schema,
    formatError
  } as unknown as ApolloServerOptions<any>
}
