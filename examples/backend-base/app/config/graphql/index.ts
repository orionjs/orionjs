import {env} from '@orion-js/env'
import {
  ModelsResolversMap,
  resolversSchemas,
  startGraphQL as orionStartGraphQL,
} from '@orion-js/graphql'
import {logger} from '@orion-js/logger'
import {GlobalResolversMap} from '@orion-js/models'
import {isEmpty} from 'lodash-es'

export default function startGraphQL(
  resolvers: GlobalResolversMap,
  modelResolvers: ModelsResolversMap,
) {
  if (isEmpty(resolvers)) return

  orionStartGraphQL({
    resolvers: {
      ...resolvers,
      ...resolversSchemas,
    },
    modelResolvers,
    useGraphiql: env.env !== 'prod', // show graphiql only in dev
  })

  logger.info('GraphQL started ✅')
}
