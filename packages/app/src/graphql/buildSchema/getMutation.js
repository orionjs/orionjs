import {GraphQLObjectType} from 'graphql'
import getResolvers from './getResolvers'

export default async function({resolvers}) {
  const fields = await getResolvers({resolvers, mutation: true})
  return new GraphQLObjectType({
    name: 'Mutation',
    fields
  })
}
