import subscription from './subscription'
import startGraphQL from './startGraphQL'
import startGraphiQL from './startGraphiQL'
import resolversSchemas from './resolversSchemas'
import ResolverParamsInfo from './resolversSchemas/ResolverParamsInfo'
import serializeSchema from './resolversSchemas/serializeSchema'
import getBasicResultQuery from './resolversSchemas/getBasicResultQuery'
import * as GraphQL from 'graphql'

const createSubscription = subscription

export {
  GraphQL,
  startGraphQL,
  startGraphiQL,
  resolversSchemas,
  ResolverParamsInfo,
  serializeSchema,
  subscription,
  createSubscription,
  getBasicResultQuery,
}

export * from './types'
export * from './service'
export * from './websockerViewer'
