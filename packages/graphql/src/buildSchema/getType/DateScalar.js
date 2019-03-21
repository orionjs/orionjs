import {GraphQLScalarType} from 'graphql'
import {GraphQLDateTime} from 'graphql-iso-date'

export default new GraphQLScalarType({
  name: 'Date',
  serialize: GraphQLDateTime._scalarConfig.serialize,
  parseValue: GraphQLDateTime._scalarConfig.parseValue,
  parseLiteral: GraphQLDateTime._scalarConfig.parseLiteral
})
