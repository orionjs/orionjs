import {ResolversMap} from '@orion-js/models'
import {express} from '@orion-js/http'
import {SubscriptionMap} from './subscription'

export type ExecuteGraphQLCache = (
  req: express.Request,
  res: express.Response,
  viewer: object,
  executeQuery: () => Promise<string>
) => Promise<string>

export interface StartGraphQLOptions {
  resolvers: ResolversMap
  subscriptions?: SubscriptionMap
  executeGraphQLCache?: ExecuteGraphQLCache
}
