import getArgs from '../getArgs'
import {config} from '@orion-js/app'

export default function ({resolver, getGraphQLType, options, model}) {
  const {graphql: graphqlConfig} = config()
  const type = getGraphQLType(resolver.returns, options)
  const args = getArgs(resolver.params)
  return {
    type,
    args,
    async resolve(item, params, context) {
      try {
        const result = await resolver.resolve(item, params, context)
        return result
      } catch (error) {
        if (graphqlConfig.errorHandler)
          graphqlConfig.errorHandler(error, {context, resolver, options, model})
        throw error
      }
    }
  }
}
