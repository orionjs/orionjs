import BigIntScalar from './BigIntScalar'
import DateScalar from './DateScalar'
import JSONScalar from './JSONScalar'
import * as GraphQL from 'graphql'

const {GraphQLFloat, GraphQLString, GraphQLID, GraphQLBoolean} = GraphQL

const fieldMap = {
  string: GraphQLString,
  email: GraphQLString,
  date: DateScalar,
  integer: BigIntScalar,
  number: GraphQLFloat,
  ID: GraphQLID,
  boolean: GraphQLBoolean,
  blackbox: JSONScalar,
  any: JSONScalar,
}

export default function (fieldType) {
  if (fieldMap[fieldType.name]) {
    return fieldMap[fieldType.name]
  }

  if (fieldType.name.startsWith('typedId:')) {
    return fieldMap.string
  }

  if (fieldType.toGraphQLType) {
    const result = fieldType.toGraphQLType(GraphQL)
    if (result.then) {
      throw new Error('toGraphQLType cant return a promise')
    }
    return result
  }
  throw new Error(`Field type "${fieldType.name}" has no convertion to GraphQLType`)
}
