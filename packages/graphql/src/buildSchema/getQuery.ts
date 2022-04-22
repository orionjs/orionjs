import {GraphQLObjectType} from 'graphql'
import getResolvers from './getResolvers'
import isEmpty from 'lodash/isEmpty'
import {StartGraphQLOptions} from '../types/startGraphQL'

export default async function (options: StartGraphQLOptions) {
  const fields = await getResolvers(options, false)
  if (isEmpty(fields)) return null
  return new GraphQLObjectType({
    name: 'Query',
    fields
  })
}
