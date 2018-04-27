import BigIntScalar from './BigIntScalar'
import DateScalar from './DateScalar'
import {GraphQLFloat, GraphQLString} from 'graphql'

const fieldMap = {
  string: GraphQLString,
  date: DateScalar,
  integer: BigIntScalar,
  number: GraphQLFloat
}

export default async function(fieldType) {
  if (fieldMap[fieldType.name]) {
    return fieldMap[fieldType.name]
  }
  if (fieldType.toGraphQLType) {
    return await fieldType.toGraphQLType()
  }
  throw new Error('Field has no convertion to GraphQLType')
}
