import {GraphQLScalarType} from 'graphql'
import {GraphQLDateTime} from 'graphql-iso-date'

export default new GraphQLScalarType({
  name: 'Date',
  serialize: GraphQLDateTime.serialize,
  parseValue: GraphQLDateTime.parseValue,
  parseLiteral: GraphQLDateTime.parseLiteral
})
