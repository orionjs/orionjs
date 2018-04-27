import {GraphQLObjectType, GraphQLString} from 'graphql'

export default async function() {
  return new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      bye: {
        type: GraphQLString,
        resolve() {
          return 'world'
        }
      }
    }
  })
}
