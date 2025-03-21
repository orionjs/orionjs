import getArgs from '../getArgs'
import errorHandler from '../../errorHandler'

export default function ({resolver, getGraphQLType, options, schema}) {
  const type = getGraphQLType(resolver.returns, options)
  const args = getArgs(resolver.params, options)
  return {
    type,
    args,
    async resolve(item, params, context, info) {
      try {
        const result = await resolver.resolve(item, params, context, info)
        return result
      } catch (error) {
        errorHandler(error, {context, resolver, options, schema})
        throw error
      }
    },
  }
}
