import getArgs from '../getArgs'
import errorHandler from '../../errorHandler'

export default function ({resolver, getGraphQLType, options, model}) {
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
        errorHandler(error, {context, resolver, options, model})
        throw error
      }
    }
  }
}
