import buildSchema from '../buildSchema'
import {StartGraphQLOptions} from '../types/startGraphQL'
import formatError from './formatError'
import {GraphQLOptions} from 'apollo-server-core'
import type {SchemaHash} from 'apollo-server-types'

export default async function (options: StartGraphQLOptions): Promise<GraphQLOptions> {
  const schema = await buildSchema(options)

  return {
    schema,
    formatError,
    schemaHash: 'deprecated' as SchemaHash,
    ...options
  }
}
