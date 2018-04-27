import BigIntScalar from './BigIntScalar'
import DateScalar from './DateScalar'
import {GraphQLFloat, GraphQLString, GraphQLID, GraphQLBoolean} from 'graphql'

const fieldMap = {
  string: GraphQLString,
  date: DateScalar,
  integer: BigIntScalar,
  number: GraphQLFloat,
  ID: GraphQLID,
  boolean: GraphQLBoolean
}

export default async function(fieldType) {
  if (fieldMap[fieldType.name]) {
    return fieldMap[fieldType.name]
  }
  if (fieldType.toGraphQLType) {
    return await fieldType.toGraphQLType()
  }
  throw new Error(`Field type "${fieldType.name}" has no convertion to GraphQLType`)
}
