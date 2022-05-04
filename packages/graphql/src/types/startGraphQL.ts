import {GlobalResolversMap, ModelResolversMap} from '@orion-js/models'
import {express} from '@orion-js/http'
import {SubscriptionMap} from './subscription'
import {GraphQLOptions} from 'apollo-server-core'

export type ExecuteGraphQLCache = (
  req: express.Request,
  res: express.Response,
  viewer: object,
  executeQuery: () => Promise<string>
) => Promise<string>

export interface ModelsResolversMap {
  [key: string]: ModelResolversMap
}

type SchemaOmits = 'schema' | 'schemaHash' | 'context' | 'useGraphiql'

export interface StartGraphQLOptions extends Omit<GraphQLOptions, SchemaOmits> {
  /**
   * A map with all the global resolvers
   */
  resolvers: GlobalResolversMap

  /**
   * A map with all the model resolvers. You must only add the models that you want to extend with resolvers.
   */
  modelResolvers?: ModelsResolversMap

  /**
   * A Map with all global subscriptions
   */
  subscriptions?: SubscriptionMap

  /**
   * A function that executes the http level cache of graphql queries
   */
  executeGraphQLCache?: ExecuteGraphQLCache

  /**
   * Should use GraphiQL. Default to true
   */
  useGraphiql?: boolean

  /**
   * Pass another express app
   */
  app?: express.Application
}
